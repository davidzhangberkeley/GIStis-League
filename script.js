mapboxgl.accessToken = ALEX_MAPBOX_TOKEN;

// ─── ML data cache & last predictions ────────────────────────────────────────
let bayAIData     = null;
let lastGeoidPred = null;   // GEOID -> predicted AI (stored after each GO)
let lastPredMedian = null;  // median of predicted AI values

// ─── Matrix Math (OLS) ───────────────────────────────────────────────────────
function matTranspose(A) {
  const rows = A.length, cols = A[0].length;
  const T = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j];
  return T;
}

function matMul(A, B) {
  const r = A.length, c = B[0].length, k = B.length;
  const C = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      for (let l = 0; l < k; l++)
        C[i][j] += A[i][l] * B[l][j];
  return C;
}

function matInverse(A) {
  const n = A.length;
  const M = A.map((row, i) => {
    const aug = [...row, ...new Array(n).fill(0)];
    aug[n + i] = 1;
    return aug;
  });
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) throw new Error("Singular matrix — try different parameters");
    for (let j = 0; j < 2 * n; j++) M[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = 0; j < 2 * n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}

function fitRidge(X, y, lambda = 1.0) {
  // β = (XᵀX + λI)⁻¹ Xᵀy  — Ridge regression handles multicollinearity
  const Xt   = matTranspose(X);
  const XtX  = matMul(Xt, X);
  // Add λ to diagonal (skip intercept column at index 0)
  for (let i = 1; i < XtX.length; i++) XtX[i][i] += lambda;
  const XtXi = matInverse(XtX);
  const yCol = y.map(v => [v]);
  const Xty  = matMul(Xt, yCol);
  return matMul(XtXi, Xty).map(r => r[0]);
}

function predictOLS(X, beta) {
  return X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
}

// ─── Color helpers for ML predictions ────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(c0, c1, t) {
  const [r0, g0, b0] = hexToRgb(c0);
  const [r1, g1, b1] = hexToRgb(c1);
  return `rgb(${Math.round(r0+(r1-r0)*t)},${Math.round(g0+(g1-g0)*t)},${Math.round(b0+(b1-b0)*t)})`;
}

function valueToColor(val, stops) {
  if (val <= stops[0]) return stops[1];
  for (let i = 0; i < stops.length - 2; i += 2) {
    if (val <= stops[i + 2]) {
      const t = (val - stops[i]) / (stops[i + 2] - stops[i]);
      return lerpColor(stops[i + 1], stops[i + 3], t);
    }
  }
  return stops[stops.length - 1];
}

// ─── ML Model ─────────────────────────────────────────────────────────────────
async function runMLModel() {
  const statusEl  = document.getElementById('ml-status');
  const resultsEl = document.getElementById('ml-results');
  const r2El      = document.getElementById('ml-r2');
  const rmseEl    = document.getElementById('ml-rmse');
  const runBtn    = document.getElementById('mlRunBtn');

  // 1. Get selected fields
  const fields = Array.from(
    document.querySelectorAll('#ml-panel input[type=checkbox]:checked')
  ).map(cb => cb.value);

  if (fields.length === 0) {
    statusEl.textContent = 'Select at least one parameter.';
    resultsEl.classList.remove('hidden');
    return;
  }

  runBtn.textContent = 'Running…';
  runBtn.disabled = true;

  // 2. Load GeoJSON once and cache
  if (!bayAIData) {
    bayAIData = await fetch('data/bay_AI_geo.geojson').then(r => r.json());
  }

  // 3. Build dataset — skip rows with any missing values
  const rows = [];
  for (const feat of bayAIData.features) {
    const p  = feat.properties;
    const ai = parseFloat(p.Accessibility_Index);
    if (!isFinite(ai) || ai <= 0) continue;
    const vals = fields.map(f => parseFloat(p[f]));
    if (vals.some(v => !isFinite(v))) continue;
    rows.push({ geoid: p.GEOID, vals, ai });
  }

  if (rows.length < fields.length + 2) {
    statusEl.textContent = 'Not enough complete data rows.';
    resultsEl.classList.remove('hidden');
    runBtn.textContent = 'GO';
    runBtn.disabled = false;
    return;
  }

  // 4. StandardScaler
  const means = fields.map((_, j) => rows.reduce((s, r) => s + r.vals[j], 0) / rows.length);
  const stds  = fields.map((_, j) => {
    const v = rows.reduce((s, r) => s + (r.vals[j] - means[j]) ** 2, 0) / rows.length;
    return Math.sqrt(v) || 1;
  });

  const X = rows.map(r => [1, ...r.vals.map((v, j) => (v - means[j]) / stds[j])]);
  const y = rows.map(r => Math.log1p(r.ai));

  // 5. 80/20 shuffle split
  const idx = rows.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const split    = Math.floor(idx.length * 0.8);
  const trainIdx = idx.slice(0, split);
  const testIdx  = idx.slice(split);

  const Xtrain = trainIdx.map(i => X[i]);
  const ytrain = trainIdx.map(i => y[i]);
  const Xtest  = testIdx.map(i => X[i]);
  const ytest  = testIdx.map(i => y[i]);

  // 6. Fit OLS
  let beta;
  try {
    beta = fitRidge(Xtrain, ytrain);
  } catch (e) {
    statusEl.textContent = e.message;
    resultsEl.classList.remove('hidden');
    runBtn.textContent = 'GO';
    runBtn.disabled = false;
    return;
  }

  // 7. Test metrics
  const ypredTest = predictOLS(Xtest, beta);
  const yMean     = ytest.reduce((s, v) => s + v, 0) / ytest.length;
  const ssTot     = ytest.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes     = ypredTest.reduce((s, v, i) => s + (v - ytest[i]) ** 2, 0);
  const r2        = 1 - ssRes / ssTot;

  // RMSE in original AI units
  const rmse = Math.sqrt(
    ypredTest.reduce((s, pred, i) => {
      const diff = Math.expm1(pred) - Math.expm1(ytest[i]);
      return s + diff * diff;
    }, 0) / ypredTest.length
  );

  // 8. Predict for all tracts
  const ypredAll   = predictOLS(X, beta);
  const geoidColor = {};
  const stops      = layerConfigs.accessibility.stops;

  rows.forEach((r, i) => {
    const predAI = Math.expm1(ypredAll[i]);
    geoidColor[r.geoid] = valueToColor(predAI, stops);
  });

  // 9. Store predictions for view toggles
  lastGeoidPred = {};
  rows.forEach((r, i) => { lastGeoidPred[r.geoid] = Math.expm1(ypredAll[i]); });

  const predVals    = Object.values(lastGeoidPred).slice().sort((a, b) => a - b);
  lastPredMedian    = predVals[Math.floor(predVals.length / 2)];

  // 10. Apply gradient view (default)
  applyGradientView();

  // 11. Display results
  r2El.textContent     = r2.toFixed(3);
  rmseEl.textContent   = Math.round(rmse).toLocaleString();
  statusEl.textContent = `${trainIdx.length} train / ${testIdx.length} test tracts`;
  resultsEl.classList.remove('hidden');
  document.getElementById('mlResetBtn').classList.remove('hidden');

  // Reset view toggle to Gradient
  document.getElementById('mlViewGradient').classList.add('active');
  document.getElementById('mlViewUnderserved').classList.remove('active');

  runBtn.textContent = 'GO';
  runBtn.disabled = false;
}

function applyGradientView() {
  if (!lastGeoidPred) return;
  const stops     = layerConfigs.accessibility.stops;
  const matchExpr = ['match', ['get', 'GEOID']];
  for (const [geoid, pred] of Object.entries(lastGeoidPred)) {
    matchExpr.push(geoid, valueToColor(pred, stops));
  }
  matchExpr.push('rgba(0,0,0,0)');
  map.setPaintProperty('bay-ai-fill', 'fill-color', matchExpr);
  document.getElementById('legend-title').textContent = 'ML Predicted Access. Index';
}

function applyUnderservedView() {
  if (!lastGeoidPred || lastPredMedian === null) return;
  const matchExpr = ['match', ['get', 'GEOID']];
  for (const [geoid, pred] of Object.entries(lastGeoidPred)) {
    matchExpr.push(geoid, pred < lastPredMedian ? '#e74c3c' : '#27ae60');
  }
  matchExpr.push('rgba(0,0,0,0)');
  map.setPaintProperty('bay-ai-fill', 'fill-color', matchExpr);
  document.getElementById('legend-title').textContent =
    `ML Underserved (predicted AI < ${Math.round(lastPredMedian).toLocaleString()})`;
}

const UNDERSERVED_THRESHOLD = 96480; // median Accessibility_Index across all tracts

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/alo-97/cmm1jk21x004h01smffit3mja",
  center: [-122.2711, 37.8044],
  zoom: 11
});

// ─── City views ───────────────────────────────────────────────────────────────
const cityViews = {
  sf:       { center: [-122.4194, 37.7749], zoom: 12.4 },
  oakland:  { center: [-122.2711, 37.8044], zoom: 12.6 },
  berkeley: { center: [-122.2730, 37.8715], zoom: 13.2 }
};

const initialView = { center: [-122.2711, 37.8044], zoom: 11 };

// ─── Info Panel ───────────────────────────────────────────────────────────────
const infoPanel   = document.getElementById("info-panel");
const panelContent = document.getElementById("panel-content");

function showPanel(html) {
  panelContent.innerHTML = html;
  infoPanel.classList.remove("hidden");
}

function hidePanel() {
  infoPanel.classList.add("hidden");
  panelContent.innerHTML = "";
}

document.getElementById("panel-close").addEventListener("click", hidePanel);

// ─── Panel HTML builders ──────────────────────────────────────────────────────
function buildAreaHTML(props) {
  const ai    = props.Accessibility_Index ?? null;
  const aiNum = parseFloat(ai);
  const tract  = props.NAMELSAD ?? props.GEOID ?? "Unknown area";
  const city   = props.CDTFA_CITY ?? props.City_name ?? props.CENSUS_PLA ?? "";
  const county = props.CDTFA_COUN ?? props.COUNTYFP ?? "";

  const popDensity    = props.pop_density ?? "";
  const medianIncome  = props.median_income ?? "";
  const pctPoc        = props.pct_poc ?? "";
  const homeownership = props.homeownership_rate ?? "";
  const medianHome    = props.median_home_value ?? "";
  const pctWhite      = props.pct_white_nh ?? "";
  const pctBlack      = props.pct_black_nh ?? "";
  const pctAsian      = props.pct_asian_nh ?? "";
  const pctHispanic   = props.pct_hispanic ?? "";

  const isUnderserved = !isNaN(aiNum) && aiNum < UNDERSERVED_THRESHOLD;
  const badge = !isNaN(aiNum)
    ? `<span class="badge ${isUnderserved ? "badge-under" : "badge-over"}">
         ${isUnderserved ? "Underserved" : "Well Served"}
       </span>`
    : "";

  const pct = (v) => v !== "" ? `${(Number(v) * 100).toFixed(1)}%` : "";
  const dollar = (v) => v !== "" ? `$${Number(v).toLocaleString()}` : "";
  const num = (v) => v !== "" ? Number(v).toLocaleString() : "";

  return `
    <div class="panel-title">${tract}</div>
    ${city   ? `<div class="panel-meta">${city}${county ? `, ${county}` : ""}</div>` : ""}
    <div class="panel-divider"></div>

    <div class="panel-section-label">Accessibility</div>
    <div class="panel-row"><span class="panel-key">Index</span><span>${isNaN(aiNum) ? "N/A" : aiNum.toLocaleString()}</span></div>
    <div class="panel-row panel-badge-row">${badge}</div>

    ${medianIncome || medianHome || homeownership ? `
    <div class="panel-divider"></div>
    <div class="panel-section-label">Socioeconomic</div>
    ${medianIncome  ? `<div class="panel-row"><span class="panel-key">Median Income</span><span>${dollar(medianIncome)}</span></div>` : ""}
    ${medianHome    ? `<div class="panel-row"><span class="panel-key">Median Home Value</span><span>${dollar(medianHome)}</span></div>` : ""}
    ${homeownership ? `<div class="panel-row"><span class="panel-key">Homeownership</span><span>${pct(homeownership)}</span></div>` : ""}
    ${popDensity    ? `<div class="panel-row"><span class="panel-key">Pop. Density</span><span>${num(popDensity)} / sq mi</span></div>` : ""}
    ` : ""}

    ${pctPoc || pctWhite ? `
    <div class="panel-divider"></div>
    <div class="panel-section-label">Race &amp; Ethnicity</div>
    ${pctPoc      ? `<div class="panel-row"><span class="panel-key">% People of Color</span><span>${pct(pctPoc)}</span></div>` : ""}
    ${pctWhite    ? `<div class="panel-row"><span class="panel-key">% White (NH)</span><span>${pct(pctWhite)}</span></div>` : ""}
    ${pctBlack    ? `<div class="panel-row"><span class="panel-key">% Black (NH)</span><span>${pct(pctBlack)}</span></div>` : ""}
    ${pctAsian    ? `<div class="panel-row"><span class="panel-key">% Asian (NH)</span><span>${pct(pctAsian)}</span></div>` : ""}
    ${pctHispanic ? `<div class="panel-row"><span class="panel-key">% Hispanic</span><span>${pct(pctHispanic)}</span></div>` : ""}
    ` : ""}
  `;
}

function buildStoreHTML(props) {
  const name     = props.company_business_name ?? props.company_bu ?? "Unknown business";
  const addr     = props.formatted_address ?? props.formatted_ ?? `${props.address ?? ""}${props.city ? ", " + props.city : ""}`;
  const category = props.business_category ?? props.business_c ?? "";
  const industry = props.industry_description ?? props.industry_d ?? "";
  const employees = props.employee_count ?? props.employee_c ?? "";
  const sqft     = props.square_footage ?? props.square_foo ?? "";
  const sales    = props.sales_volume ?? props.sales_volu ?? "";

  return `
    <div class="panel-title">${name}</div>
    ${addr ? `<div class="panel-meta">${addr}</div>` : ""}
    <div class="panel-divider"></div>
    <div class="panel-section-label">Business Info</div>
    ${category  ? `<div class="panel-row"><span class="panel-key">Category</span><span>${category}</span></div>` : ""}
    ${industry  ? `<div class="panel-row"><span class="panel-key">Industry</span><span>${industry}</span></div>` : ""}
    ${employees ? `<div class="panel-row"><span class="panel-key">Employees</span><span>${employees}</span></div>` : ""}
    ${sqft      ? `<div class="panel-row"><span class="panel-key">Sq Ft</span><span>${sqft}</span></div>` : ""}
    ${sales     ? `<div class="panel-row"><span class="panel-key">Sales Volume</span><span>${sales}</span></div>` : ""}
  `;
}

// ─── Layer configs ────────────────────────────────────────────────────────────
const layerConfigs = {
  accessibility: {
    label: "Accessibility Index (Actual Data)",
    field: "Accessibility_Index",
    type: "continuous",
    stops: [0, "#7f0000", 20000, "#d7301f", 40000, "#fc8d59", 60000, "#fdbb84",
            80000, "#fee8c8", 100000, "#d9f0a3", 140000, "#78c679", 180000, "#31a354", 220000, "#006837"],
    legendLabels: ["0", "60k", "100k", "180k", "220k+"],
    legendColors: ["#7f0000", "#fdbb84", "#d9f0a3", "#31a354", "#006837"]
  },
  underserved: {
    label: "Underserved Areas (Actual Data)",
    field: "Accessibility_Index",
    type: "categorical",
    expression: [
      "case",
      ["all",
        ["!=", ["to-string", ["get", "Accessibility_Index"]], "NaN"],
        ["!=", ["get", "Accessibility_Index"], null],
        ["<", ["to-number", ["get", "Accessibility_Index"]], UNDERSERVED_THRESHOLD]
      ], "#e74c3c",
      ["all",
        ["!=", ["to-string", ["get", "Accessibility_Index"]], "NaN"],
        ["!=", ["get", "Accessibility_Index"], null]
      ], "#27ae60",
      "rgba(0,0,0,0)"
    ],
    legendItems: [
      { color: "#e74c3c", label: `Underserved (AI < ${UNDERSERVED_THRESHOLD.toLocaleString()}, median)` },
      { color: "#27ae60", label: "Well Served (at or above median)" }
    ]
  },
  pct_poc: {
    label: "% People of Color",
    field: "pct_poc",
    type: "continuous",
    stops: [0, "#fff7f3", 0.25, "#fde0dd", 0.5, "#f768a1", 0.75, "#ae017e", 1.0, "#49006a"],
    legendLabels: ["0%", "25%", "50%", "75%", "100%"],
    legendColors: ["#fff7f3", "#fde0dd", "#f768a1", "#ae017e", "#49006a"]
  },
  pct_white_nh: {
    label: "% White (Non-Hispanic)",
    field: "pct_white_nh",
    type: "continuous",
    stops: [0, "#f7fbff", 0.2, "#c6dbef", 0.4, "#6baed6", 0.6, "#2171b5", 0.83, "#08306b"],
    legendLabels: ["0%", "20%", "40%", "60%", "83%"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  pct_black_nh: {
    label: "% Black (Non-Hispanic)",
    field: "pct_black_nh",
    type: "continuous",
    stops: [0, "#fff5eb", 0.15, "#fdd0a2", 0.3, "#fd8d3c", 0.5, "#d94801", 0.73, "#7f2704"],
    legendLabels: ["0%", "15%", "30%", "50%", "73%"],
    legendColors: ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]
  },
  pct_asian_nh: {
    label: "% Asian (Non-Hispanic)",
    field: "pct_asian_nh",
    type: "continuous",
    stops: [0, "#f7fcfd", 0.25, "#b2e2e2", 0.5, "#66c2a4", 0.75, "#238b45", 1.0, "#00441b"],
    legendLabels: ["0%", "25%", "50%", "75%", "100%"],
    legendColors: ["#f7fcfd", "#b2e2e2", "#66c2a4", "#238b45", "#00441b"]
  },
  pct_hispanic: {
    label: "% Hispanic",
    field: "pct_hispanic",
    type: "continuous",
    stops: [0, "#ffffe5", 0.2, "#f7fcb9", 0.4, "#addd8e", 0.6, "#31a354", 0.89, "#004529"],
    legendLabels: ["0%", "20%", "40%", "60%", "89%"],
    legendColors: ["#ffffe5", "#f7fcb9", "#addd8e", "#31a354", "#004529"]
  },
  median_income: {
    label: "Median Income",
    field: "median_income",
    type: "continuous",
    stops: [0, "#67000d", 50000, "#cb181d", 100000, "#fc4e2a", 150000, "#feb24c", 200000, "#fed976", 250000, "#ffffcc"],
    legendLabels: ["$0", "$50k", "$100k", "$150k", "$200k", "$250k+"],
    legendColors: ["#67000d", "#cb181d", "#fc4e2a", "#feb24c", "#fed976", "#ffffcc"]
  },
  homeownership: {
    label: "Homeownership Rate",
    field: "homeownership_rate",
    type: "continuous",
    stops: [0, "#fff7fb", 0.2, "#a6bddb", 0.4, "#1c9099", 0.6, "#016450", 0.8, "#014636", 1.0, "#004529"],
    legendLabels: ["0%", "20%", "40%", "60%", "80%", "100%"],
    legendColors: ["#fff7fb", "#a6bddb", "#1c9099", "#016450", "#014636", "#004529"]
  },
  median_home_value: {
    label: "Median Home Value",
    field: "median_home_value",
    type: "continuous",
    stops: [400000, "#efedf5", 700000, "#bcbddc", 1000000, "#807dba", 1500000, "#4a1486", 2000001, "#1a0050"],
    legendLabels: ["$400k", "$700k", "$1M", "$1.5M", "$2M+"],
    legendColors: ["#efedf5", "#bcbddc", "#807dba", "#4a1486", "#1a0050"]
  },
  pop_density: {
    label: "Population Density",
    field: "pop_density",
    type: "continuous",
    stops: [0, "#ffffcc", 10000, "#fed976", 30000, "#feb24c", 60000, "#fd8d3c", 100000, "#e31a1c", 190000, "#800026"],
    legendLabels: ["0", "10k", "30k", "60k", "100k", "190k+"],
    legendColors: ["#ffffcc", "#fed976", "#feb24c", "#fd8d3c", "#e31a1c", "#800026"]
  },
  // ── Age ──────────────────────────────────────────────────────────────────────
  group_0_17: {
    label: "Population Age 0–17",
    field: "group_0_17",
    type: "continuous",
    stops: [0, "#f7fbff", 300, "#c6dbef", 700, "#6baed6", 1200, "#2171b5", 2000, "#08306b"],
    legendLabels: ["0", "300", "700", "1,200", "2,000+"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  group_18_34: {
    label: "Population Age 18–34",
    field: "group_18_34",
    type: "continuous",
    stops: [0, "#f7fbff", 400, "#c6dbef", 900, "#6baed6", 1500, "#2171b5", 2500, "#08306b"],
    legendLabels: ["0", "400", "900", "1,500", "2,500+"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  group_35_49: {
    label: "Population Age 35–49",
    field: "group_35_49",
    type: "continuous",
    stops: [0, "#f7fbff", 300, "#c6dbef", 700, "#6baed6", 1200, "#2171b5", 2000, "#08306b"],
    legendLabels: ["0", "300", "700", "1,200", "2,000+"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  group_50_up: {
    label: "Population Age 50+",
    field: "group_50_up",
    type: "continuous",
    stops: [0, "#f7fbff", 500, "#c6dbef", 1000, "#6baed6", 1800, "#2171b5", 3000, "#08306b"],
    legendLabels: ["0", "500", "1,000", "1,800", "3,000+"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  // ── Education ────────────────────────────────────────────────────────────────
  below_high_school: {
    label: "Below High School",
    field: "below_high_school",
    type: "continuous",
    stops: [0, "#fff5eb", 150, "#fdd0a2", 400, "#fd8d3c", 800, "#d94801", 1500, "#7f2704"],
    legendLabels: ["0", "150", "400", "800", "1,500+"],
    legendColors: ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]
  },
  high_school_grad: {
    label: "High School Graduates",
    field: "high_school_grad",
    type: "continuous",
    stops: [0, "#fff5eb", 150, "#fdd0a2", 350, "#fd8d3c", 700, "#d94801", 1200, "#7f2704"],
    legendLabels: ["0", "150", "350", "700", "1,200+"],
    legendColors: ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]
  },
  some_college_assoc: {
    label: "Some College / Associate's",
    field: "some_college_assoc",
    type: "continuous",
    stops: [0, "#fff5eb", 200, "#fdd0a2", 500, "#fd8d3c", 900, "#d94801", 1500, "#7f2704"],
    legendLabels: ["0", "200", "500", "900", "1,500+"],
    legendColors: ["#fff5eb", "#fdd0a2", "#fd8d3c", "#d94801", "#7f2704"]
  },
  bachelors_plus: {
    label: "Bachelor's Degree or Higher",
    field: "bachelors_plus",
    type: "continuous",
    stops: [0, "#f7fcf5", 400, "#c7e9c0", 900, "#74c476", 1600, "#238b45", 3000, "#00441b"],
    legendLabels: ["0", "400", "900", "1,600", "3,000+"],
    legendColors: ["#f7fcf5", "#c7e9c0", "#74c476", "#238b45", "#00441b"]
  },
  // ── Housing ──────────────────────────────────────────────────────────────────
  housing_units_total: {
    label: "Total Housing Units",
    field: "housing_units_total",
    type: "continuous",
    stops: [0, "#f7fbff", 500, "#c6dbef", 1000, "#6baed6", 1800, "#2171b5", 3000, "#08306b"],
    legendLabels: ["0", "500", "1,000", "1,800", "3,000+"],
    legendColors: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]
  },
  owner_occupied: {
    label: "Owner-Occupied Units",
    field: "owner_occupied",
    type: "continuous",
    stops: [0, "#fff7fb", 200, "#a6bddb", 500, "#1c9099", 900, "#016450", 1500, "#004529"],
    legendLabels: ["0", "200", "500", "900", "1,500+"],
    legendColors: ["#fff7fb", "#a6bddb", "#1c9099", "#016450", "#004529"]
  },
  renter_occupied: {
    label: "Renter-Occupied Units",
    field: "renter_occupied",
    type: "continuous",
    stops: [0, "#fff7fb", 200, "#a6bddb", 500, "#1c9099", 900, "#016450", 1800, "#004529"],
    legendLabels: ["0", "200", "500", "900", "1,800+"],
    legendColors: ["#fff7fb", "#a6bddb", "#1c9099", "#016450", "#004529"]
  }
};

function buildColorExpression(config) {
  if (config.expression) return config.expression;
  const expr = ["interpolate", ["linear"], ["to-number", ["get", config.field]]];
  for (let i = 0; i < config.stops.length; i += 2) {
    expr.push(config.stops[i], config.stops[i + 1]);
  }
  return expr;
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function updateLegend(key) {
  const config = layerConfigs[key];
  if (!config) return;
  document.getElementById("legend-title").textContent = config.label;
  const legendItems = document.getElementById("legend-items");

  if (config.type === "categorical") {
    legendItems.innerHTML = config.legendItems.map(item => `
      <div class="legend-item">
        <div class="legend-swatch" style="background:${item.color}"></div>
        <span class="legend-label">${item.label}</span>
      </div>
    `).join("");
  } else {
    const gradient = `linear-gradient(to right, ${config.legendColors.join(", ")})`;
    const minLabel = config.legendLabels[0];
    const maxLabel = config.legendLabels[config.legendLabels.length - 1];
    legendItems.innerHTML = `
      <div class="legend-gradient" style="background: ${gradient}"></div>
      <div class="legend-gradient-labels">
        <span>${minLabel}</span>
        <span>${maxLabel}</span>
      </div>
    `;
  }
}

// ─── Hover helper ─────────────────────────────────────────────────────────────
let hoveredId = null;

function addHover(sourceId, layerId) {
  map.addLayer({
    id: `${layerId}-hover`,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": 10,
      "circle-color": "#000000",
      "circle-opacity": 0.15
    },
    filter: ["==", ["id"], -1]
  });

  map.on("mousemove", layerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features.length) return;
    const id = e.features[0].id;
    if (id === undefined) return;
    if (hoveredId !== null) map.setFilter(`${layerId}-hover`, ["==", ["id"], -1]);
    hoveredId = id;
    map.setFilter(`${layerId}-hover`, ["==", ["id"], hoveredId]);
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    hoveredId = null;
    map.setFilter(`${layerId}-hover`, ["==", ["id"], -1]);
  });
}

// ─── Map load ─────────────────────────────────────────────────────────────────
map.on("load", () => {

  // ── Accessibility Index tracts ──────────────────────────────────────────────
  map.addSource("bay-ai", {
    type: "geojson",
    data: "data/bay_AI_geo.geojson",
    generateId: true
  });

  map.addLayer({
    id: "bay-ai-fill",
    type: "fill",
    source: "bay-ai",
    paint: {
      "fill-color": buildColorExpression(layerConfigs.accessibility),
      "fill-opacity": [
        "case",
        ["any",
          ["==", ["to-string", ["get", "Accessibility_Index"]], "NaN"],
          ["==", ["to-string", ["get", "Accessibility_Index"]], ""],
          ["==", ["get", "Accessibility_Index"], null]
        ],
        0, 0.6
      ]
    }
  });

  map.addLayer({
    id: "bay-ai-outline",
    type: "line",
    source: "bay-ai",
    paint: { "line-color": "#111111", "line-width": 1.1, "line-opacity": 0.7 }
  });

  map.addLayer({
    id: "bay-ai-hover-tract",
    type: "line",
    source: "bay-ai",
    paint: { "line-color": "#000000", "line-width": 2.4 },
    filter: ["==", ["id"], -1]
  });

  // Underserved border overlay (initially hidden)
  map.addLayer({
    id: "bay-ai-underserved",
    type: "line",
    source: "bay-ai",
    filter: [
      "all",
      ["!=", ["to-string", ["get", "Accessibility_Index"]], "NaN"],
      ["!=", ["get", "Accessibility_Index"], null],
      ["<", ["to-number", ["get", "Accessibility_Index"]], UNDERSERVED_THRESHOLD]
    ],
    paint: { "line-color": "#e74c3c", "line-width": 3, "line-opacity": 0.9 },
    layout: { visibility: "none" }
  });

  let hoveredAreaId = null;

  map.on("mousemove", "bay-ai-fill", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;
    const id = e.features[0].id;
    if (id === undefined) return;
    hoveredAreaId = id;
    map.setFilter("bay-ai-hover-tract", ["==", ["id"], hoveredAreaId]);
  });

  map.on("mouseleave", "bay-ai-fill", () => {
    map.getCanvas().style.cursor = "";
    hoveredAreaId = null;
    map.setFilter("bay-ai-hover-tract", ["==", ["id"], -1]);
  });

  map.on("click", "bay-ai-fill", (e) => {
    const feature = e.features && e.features[0];
    if (!feature) return;
    showPanel(buildAreaHTML(feature.properties || {}));
  });

  // ── Berkeley ────────────────────────────────────────────────────────────────
  map.addSource("berkeley", { type: "geojson", data: "data/Berkeley1.geojson", generateId: true });
  map.addLayer({
    id: "berkeley-layer", type: "circle", source: "berkeley",
    paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-opacity": 0.85,
             "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" }
  });

  // ── Oakland ─────────────────────────────────────────────────────────────────
  map.addSource("oakland", { type: "geojson", data: "data/Oakland1.geojson", generateId: true });
  map.addLayer({
    id: "oakland-layer", type: "circle", source: "oakland",
    paint: { "circle-radius": 6, "circle-color": "#33a02c", "circle-opacity": 0.85,
             "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" }
  });

  // ── San Francisco ───────────────────────────────────────────────────────────
  map.addSource("sf", { type: "geojson", data: "data/SF1.geojson", generateId: true });
  map.addLayer({
    id: "sf-layer", type: "circle", source: "sf",
    paint: { "circle-radius": 6, "circle-color": "#e31a1c", "circle-opacity": 0.85,
             "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" }
  });

  addHover("berkeley", "berkeley-layer");
  addHover("oakland",  "oakland-layer");
  addHover("sf",       "sf-layer");

  ["berkeley-layer", "oakland-layer", "sf-layer"].forEach((layerId) => {
    const cityKey = layerId.replace("-layer", "");
    map.on("click", layerId, (e) => {
      const feature = e.features && e.features[0];
      if (!feature) return;
      const view = cityViews[cityKey];
      if (view) map.flyTo({ ...view, duration: 1400, essential: true });
      showPanel(buildStoreHTML(feature.properties || {}));
    });
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  });

  // ── Tract toggle ────────────────────────────────────────────────────────────
  const tractLayers = ["bay-ai-fill", "bay-ai-outline", "bay-ai-hover-tract"];
  const tractToggle = document.getElementById("tractToggle");
  tractToggle.addEventListener("click", () => {
    const visible = map.getLayoutProperty("bay-ai-fill", "visibility") !== "none";
    const next = visible ? "none" : "visible";
    tractLayers.forEach(id => map.setLayoutProperty(id, "visibility", next));
    tractToggle.textContent = visible ? "Tracts Data Layer Off" : "Tracts Data Layer On";
  });

  // ── Reset view ──────────────────────────────────────────────────────────────
  document.getElementById("resetView").addEventListener("click", () => {
    hidePanel();
    map.flyTo({ ...initialView, duration: 1400, essential: true });
  });

  // ── Underserved toggle ──────────────────────────────────────────────────────
  const underservedToggle = document.getElementById("underservedToggle");
  underservedToggle.addEventListener("click", () => {
    const visible = map.getLayoutProperty("bay-ai-underserved", "visibility") !== "none";
    const next = visible ? "none" : "visible";
    map.setLayoutProperty("bay-ai-underserved", "visibility", next);
    underservedToggle.classList.toggle("active", !visible);
    underservedToggle.textContent = visible ? "Highlight Actual Underserved" : "Hide Actual Underserved";
  });

  // ── City buttons ────────────────────────────────────────────────────────────
  document.querySelectorAll(".city-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = cityViews[btn.dataset.city];
      if (view) map.flyTo({ ...view, duration: 1200, essential: true });
    });
  });

  // ── Layer dropdown ──────────────────────────────────────────────────────────
  const layerSelect = document.getElementById("layerSelect");
  layerSelect.addEventListener("change", () => {
    const config = layerConfigs[layerSelect.value];
    if (!config) return;
    map.setPaintProperty("bay-ai-fill", "fill-color", buildColorExpression(config));
    updateLegend(layerSelect.value);
  });

  // ── Init legend ─────────────────────────────────────────────────────────────
  updateLegend("accessibility");

  // ── ML buttons ──────────────────────────────────────────────────────────────
  document.getElementById("mlRunBtn").addEventListener("click", runMLModel);

  document.getElementById("mlSelectAll").addEventListener("click", () => {
    document.querySelectorAll('#ml-panel input[type=checkbox]').forEach(cb => cb.checked = true);
  });

  document.getElementById("mlClearAll").addEventListener("click", () => {
    document.querySelectorAll('#ml-panel input[type=checkbox]').forEach(cb => cb.checked = false);
  });

  document.getElementById("mlResetBtn").addEventListener("click", () => {
    map.setPaintProperty("bay-ai-fill", "fill-color", buildColorExpression(layerConfigs.accessibility));
    document.getElementById("legend-title").textContent = "Accessibility Index";
    document.getElementById("mlResetBtn").classList.add("hidden");
    document.getElementById("ml-results").classList.add("hidden");
    lastGeoidPred  = null;
    lastPredMedian = null;
  });

  document.getElementById("mlViewGradient").addEventListener("click", () => {
    applyGradientView();
    document.getElementById("mlViewGradient").classList.add("active");
    document.getElementById("mlViewUnderserved").classList.remove("active");
  });

  document.getElementById("mlViewUnderserved").addEventListener("click", () => {
    applyUnderservedView();
    document.getElementById("mlViewUnderserved").classList.add("active");
    document.getElementById("mlViewGradient").classList.remove("active");
  });
});
