mapboxgl.accessToken = ALEX_MAPBOX_TOKEN;

let mlPredictions = {};

const mlPresets = {
  demographics: [
    "pct_poc",
    "pct_white_nh",
    "pct_black_nh",
    "pct_asian_nh",
    "pct_hispanic",
    "white_nh",
    "black_nh",
    "asian_nh",
    "hispanic",
    "total_pop",
    "group_0_17",
    "group_18_34",
    "group_35_49",
    "group_50_up"
  ],

  socioeconomic: [
    "median_income",
    "below_high_school",
    "high_school_grad",
    "some_college_assoc",
    "bachelors_plus"
  ],

  housing: [
    "median_home_value",
    "housing_units_total",
    "owner_occupied",
    "renter_occupied",
    "homeownership_rate",
    "area_sq_miles",
    "pop_density"
  ]
};

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
<<<<<<< HEAD:script.js
  const predictedAccessibility = props.predicted_accessibility ?? null;
  const serviceGap = props.service_gap ?? null;
  const signedNum = (v) => v !== null && v !== "" ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "";
  const ai    = props[" Accessibility_Index"] ?? props.Accessibility_Index ?? null;
=======
  const geoid = props.GEOID ? String(props.GEOID) : null;
  const mlData = geoid && mlPredictions[geoid] ? mlPredictions[geoid] : null;

  const predictedAi = mlData ? mlData.predicted_accessibility : null;
  const residual = mlData ? mlData.residual : null;
  const pctDiff = mlData ? mlData.pct_diff : null;
  const accessLabel = mlData ? mlData.access_label : null;

  const ai    = props["Accessibility_Index"] ?? props.Accessibility_Index ?? null;
>>>>>>> b2196e0ac5753c49b28a15cbcd3122e5c6828a33:frontend/script.js
  const aiNum = parseFloat(ai);
  const tract  = props.NAMELSAD ?? props.GEOID ?? "Unknown area";
  const city   = props.CDTFA_CITY ?? props.CENSUS_PLA ?? "";
  const county = props.CDTFA_COUN ?? props.COUNTYFP ?? "";

  const popDensity    = props["pop_density"] ?? "";
  const medianIncome  = props["median_income"] ?? "";
  const pctPoc        = props["pct_poc"] ?? "";
  const homeownership = props["homeownership_rate"] ?? "";
  const medianHome    = props["median_home_value"] ?? "";
  const pctWhite      = props["pct_white_nh"] ?? "";
  const pctBlack      = props["pct_black_nh"] ?? "";
  const pctAsian      = props["pct_asian_nh"] ?? "";
  const pctHispanic   = props["pct_hispanic"] ?? "";

  const isUnderserved = !isNaN(aiNum) && aiNum < UNDERSERVED_THRESHOLD;
  const badge = !isNaN(aiNum)
    ? `<span class="badge ${isUnderserved ? "badge-under" : "badge-over"}">
         ${isUnderserved ? "Underserved" : "Well Served"}
       </span>`
    : "";

  const pct = (v) => v !== "" ? `${(Number(v) * 100).toFixed(1)}%` : "";
  const dollar = (v) => v !== "" ? `$${Number(v).toLocaleString()}` : "";
  const num = (v) => v !== "" ? Number(v).toLocaleString() : "";

<<<<<<< HEAD:script.js
  return `
    <div class="panel-title">${tract}</div>
    ${city   ? `<div class="panel-meta">${city}${county ? `, ${county}` : ""}</div>` : ""}
    <div class="panel-divider"></div>

    <div class="panel-section-label">Accessibility</div>
    <div class="panel-row"><span class="panel-key">Index</span><span>${isNaN(aiNum) ? "N/A" : aiNum.toLocaleString()}</span></div>
    <div class="panel-row panel-badge-row">${badge}</div>

    ${predictedAccessibility !== null || serviceGap !== null ? `
    <div class="panel-divider"></div>
    <div class="panel-section-label">Model Results</div>
    ${predictedAccessibility !== null ? `<div class="panel-row"><span class="panel-key">Predicted Accessibility</span><span>${Number(predictedAccessibility).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>` : ""}
    ${serviceGap !== null ? `<div class="panel-row"><span class="panel-key">Service Gap</span><span>${signedNum(serviceGap)}</span></div>` : ""}
    ` : ""}

    ${medianIncome || medianHome || homeownership ? `
    <div class="panel-divider"></div>
    <div class="panel-section-label">Socioeconomic</div>
=======
    let labelColor = "#666";
    if (pctDiff !== null) {
      if (pctDiff < -0.05) labelColor = "#d73027";
      else if (pctDiff > 0.05) labelColor = "#1a9850";
    }

  return `
    <div class="panel-title">${tract}</div>
    ${city   ? `<div class="panel-meta">${city}${county ? `, ${county}` : ""}</div>` : ""}
    <div class="panel-divider"></div>

    <div class="panel-section-label">Accessibility</div>
    <div class="panel-row">
      <span class="panel-key">Index</span>
      <span>${isNaN(aiNum) ? "N/A" : aiNum.toLocaleString()}</span>
    </div>
    <div class="panel-row">
      <span class="panel-key">Predicted Index</span>
      <span>${predictedAi === null ? "N/A" : Number(predictedAi).toFixed(1)}</span>
    </div>
    <div class="panel-row">
      <span class="panel-key">Residual</span>
      <span>${residual === null ? "N/A" : Number(residual).toFixed(1)}</span>
    </div>
    <div class="panel-row">
      <span class="panel-key">% Difference</span>
      <span>${pctDiff === null ? "N/A" : (pctDiff * 100).toFixed(1) + "%"}</span>
    </div>
    <div class="panel-row">
      <span class="panel-key">Model Label</span>
      <span style="color: ${labelColor}; font-weight: 600;">
        ${accessLabel === null ? "N/A" : accessLabel}
      </span>
    </div>
    <div class="panel-row panel-badge-row">${badge}</div>

    ${medianIncome || medianHome || homeownership ? `
    <div class="panel-divider"></div>
    <div class="panel-section-label">Socioeconomic</div>
>>>>>>> b2196e0ac5753c49b28a15cbcd3122e5c6828a33:frontend/script.js
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
function getSelectedFeatures() {
    return Array.from(document.querySelectorAll('.feature-checkbox:checked')).map((checkbox) => checkbox.value)
}

async function runModel(){
    const selectedFeatures = getSelectedFeatures();

    if(!selectedFeatures.length) {
        alert("Please select at least one feature.");
        return;
    }
    try {
        const response = await fetch("http://127.0.0.1:5000/api/run-model", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                features: selectedFeatures
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Model run failed.");
            return;
        }

        document.getElementById('r2Value').textContent = data.metrics.r2.toFixed(3);
        document.getElementById('rmseValue').textContent = data.metrics.rmse.toFixed(2);

        console.log(data);
        updateMapWithModelResults(data.tract_scores);
    } catch (error) {
        console.error(error);
        alert("Could not connect to the backend.");
    }
}
async function updateMapWithModelResults(tractScores) {
  const source = map.getSource("bay-ai");
  if (!source) return;

  const response = await fetch("data/bay_AI_geo.geojson");
  const geojson = await response.json();

  const scoreLookup = new Map(
    tractScores.map((row) => [String(row.GEOID), row])
  );

  geojson.features.forEach((feature) => {
    const geoid = String(feature.properties.GEOID);
    const match = scoreLookup.get(geoid);

    if (match) {
      feature.properties.predicted_accessibility = match.predicted_accessibility;
      feature.properties.service_gap = match.service_gap;
    }
  });

  source.setData(geojson);
}

// ─── Layer configs ────────────────────────────────────────────────────────────
const layerConfigs = {
  accessibility: {
    label: "Accessibility Index",
    field: "Accessibility_Index",
    type: "continuous",
    stops: [0, "#7f0000", 20000, "#d7301f", 40000, "#fc8d59", 60000, "#fdbb84",
            80000, "#fee8c8", 100000, "#d9f0a3", 140000, "#78c679", 180000, "#31a354", 220000, "#006837"],
    legendLabels: ["0", "60k", "100k", "180k", "220k+"],
    legendColors: ["#7f0000", "#fdbb84", "#d9f0a3", "#31a354", "#006837"]
  },
  underserved: {
    label: "Underserved Classification",
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
      { color: "#e74c3c", label: `Underserved (AI < ${UNDERSERVED_THRESHOLD.toLocaleString()})` },
      { color: "#27ae60", label: "Well Served" }
    ]
  },
  service_gap: {
    label: "Service Gap",
    field: "service_gap",
    type: "continuous",
    stops: [
      -100000, "#b2182b",
      -50000, "#ef8a62",
      0, "#f7f7f7",
      50000, "#67a9cf",
      100000, "#2166ac"
    ],
    legendLabels: ["Underserved", "", "Balanced", "", "Overserved"],
    legendColors: ["#b2182b", "#ef8a62", "#f7f7f7", "#67a9cf", "#2166ac"]
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

    document.getElementById('runModelBtn').addEventListener('click', runModel);

  // ── Accessibility Index tracts ──────────────────────────────────────────────
  map.addSource("bay-ai", {
    type: "geojson",
    data: "Data/tract_data_0331.geojson",
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
  map.addSource("berkeley", { type: "geojson", data: "Data/Berkeley1.geojson", generateId: true });
  map.addLayer({
    id: "berkeley-layer", type: "circle", source: "berkeley",
    paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-opacity": 0.85,
             "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" }
  });

  // ── Oakland ─────────────────────────────────────────────────────────────────
  map.addSource("oakland", { type: "geojson", data: "Data/Oakland1.geojson", generateId: true });
  map.addLayer({
    id: "oakland-layer", type: "circle", source: "oakland",
    paint: { "circle-radius": 6, "circle-color": "#33a02c", "circle-opacity": 0.85,
             "circle-stroke-width": 1.5, "circle-stroke-color": "#ffffff" }
  });

  // ── San Francisco ───────────────────────────────────────────────────────────
  map.addSource("sf", { type: "geojson", data: "Data/SF1.geojson", generateId: true });
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
    underservedToggle.textContent = visible ? "Show Underserved Areas" : "Hide Underserved Areas";
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

  // ── ML button (backend test) ──────────────────────────────────────────────
  document.getElementById("runModel").addEventListener("click", async () => {
    const selectedFeatures = Array.from(
      document.querySelectorAll(".ml-feature:checked")
    ).map(el => el.value);

    if (selectedFeatures.length === 0) {
      alert("Please select at least one parameter.");
      return;
    }

    document.getElementById("r2Value").textContent = "R²: running...";
    document.getElementById("rmseValue").textContent = "RMSE: running...";

    try {
      const response = await fetch(`${API_BASE_URL}/run-model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          selected_features: selectedFeatures
        })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Model run failed.");
        document.getElementById("r2Value").textContent = "R²: --";
        document.getElementById("rmseValue").textContent = "RMSE: --";
        return;
      }

      document.getElementById("r2Value").textContent = `R²: ${result.r2}`;
      document.getElementById("rmseValue").textContent = `RMSE: ${result.rmse}`;

      mlPredictions = {};
      result.tract_results.forEach(row => {
        mlPredictions[String(row.GEOID)] = {
          predicted_accessibility: row.predicted_accessibility,
          residual: row.residual,
          pct_diff: row.pct_diff,
          access_label: row.access_label
        };
      });

    } catch (err) {
      console.error(err);
      alert("Could not connect to backend.");
      document.getElementById("r2Value").textContent = "R²: --";
      document.getElementById("rmseValue").textContent = "RMSE: --";
    }
  });
  document.getElementById("mlPreset").addEventListener("change", (e) => {
    const preset = e.target.value;

    const checkboxes = document.querySelectorAll(".ml-feature");

    // If user selects "Custom selection"
    if (!preset) return;

    // Select ALL variables
    if (preset === "all") {
      checkboxes.forEach(cb => {
        cb.checked = true;
      });
      return;
    }

    // Otherwise: apply specific preset
    const selectedSet = new Set(mlPresets[preset] || []);

    checkboxes.forEach(cb => {
      cb.checked = selectedSet.has(cb.value);
    });
  });
});

