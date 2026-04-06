// ─── ml.js — TensorFlow.js Linear Regression for Grocery Accessibility ────────

const ML_FEATURES = {
  median_income:      { label: "Median Income",        group: "Socioeconomic" },
  median_home_value:  { label: "Median Home Value",     group: "Socioeconomic" },
  homeownership_rate: { label: "Homeownership Rate",    group: "Socioeconomic" },
  pop_density:        { label: "Population Density",    group: "Socioeconomic" },
  total_pop:          { label: "Total Population",      group: "Socioeconomic" },
  area_sq_miles:      { label: "Area (sq miles)",       group: "Socioeconomic" },
  pct_poc:            { label: "% People of Color",     group: "Race & Ethnicity" },
  pct_white_nh:       { label: "% White (Non-Hisp.)",   group: "Race & Ethnicity" },
  pct_black_nh:       { label: "% Black (Non-Hisp.)",   group: "Race & Ethnicity" },
  pct_asian_nh:       { label: "% Asian (Non-Hisp.)",   group: "Race & Ethnicity" },
  pct_hispanic:       { label: "% Hispanic",            group: "Race & Ethnicity" },
  group_0_17:         { label: "Age 0-17",              group: "Age Groups" },
  group_18_34:        { label: "Age 18-34",             group: "Age Groups" },
  group_35_49:        { label: "Age 35-49",             group: "Age Groups" },
  group_50_up:        { label: "Age 50+",               group: "Age Groups" },
  below_high_school:  { label: "Below High School",     group: "Education" },
  high_school_grad:   { label: "High School Grad",      group: "Education" },
  some_college_assoc: { label: "Some College/Assoc.",   group: "Education" },
  bachelors_plus:     { label: "Bachelors+",            group: "Education" },
};

let mlData = null;
let mlResults = null;

// ── CSV loader ────────────────────────────────────────────────────────────────
async function loadMLData() {
  if (mlData) return mlData;
  const resp = await fetch("data/new_cleaned_dataset(0331).csv");
  const text = await resp.text();
  mlData = parseCSV(text);
  return mlData;
}

function parseCSV(text) {
  // Normalize Windows line endings, then split
  const lines = text.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  // Trim ALL headers — this removes the leading space from " Accessibility_Index"
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = (vals[j] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuote = !inQuote; continue; }
    if (line[i] === ',' && !inQuote) { result.push(cur); cur = ""; continue; }
    cur += line[i];
  }
  result.push(cur);
  return result;
}

// ── Core ML function ──────────────────────────────────────────────────────────
async function runMLModel(selectedFeatures) {
  const rows = await loadMLData();

  // After header trimming, the column is "Accessibility_Index" (no leading space)
  const AI_COL = "Accessibility_Index";
  const getAI = (r) => parseFloat(r[AI_COL]);

  // Filter to rows with valid target and all selected features numeric
  const valid = rows.filter(row => {
    const ai = getAI(row);
    if (isNaN(ai) || ai <= 0) return false;
    return selectedFeatures.every(f => !isNaN(parseFloat(row[f])));
  });

  if (valid.length < 10) {
    const sampleKeys = Object.keys(rows[0] || {}).slice(0, 8).join(", ");
    const sampleAI   = rows.slice(0, 3).map(r => `"${r[AI_COL]}"`).join(", ");
    throw new Error(
      `Not enough valid rows — found ${valid.length} of ${rows.length} total. ` +
      `Sample "${AI_COL}" values: ${sampleAI}. ` +
      `First columns: ${sampleKeys}`
    );
  }

  // Remove top 1% outliers (mirrors Python)
  const sorted = valid.map(r => getAI(r)).sort((a, b) => a - b);
  const upper  = sorted[Math.floor(sorted.length * 0.99)];
  const filtered = valid.filter(r => getAI(r) <= upper);

  // Build feature matrix and log1p target
  const X_raw   = filtered.map(r => selectedFeatures.map(f => parseFloat(r[f])));
  const y_raw   = filtered.map(r => Math.log1p(getAI(r)));
  const geoids  = filtered.map(r => r["GEOID"]);
  const actuals = filtered.map(r => getAI(r));

  // 80/20 shuffle split
  const indices = shuffle([...Array(filtered.length).keys()]);
  const splitAt = Math.floor(filtered.length * 0.8);
  const trainIdx = indices.slice(0, splitAt);
  const testIdx  = indices.slice(splitAt);

  const X_train = trainIdx.map(i => X_raw[i]);
  const X_test  = testIdx.map(i => X_raw[i]);
  const y_train = trainIdx.map(i => y_raw[i]);
  const y_test  = testIdx.map(i => y_raw[i]);

  // StandardScaler: fit on train only
  const { means, stds } = computeScaler(X_train);
  const X_train_s = scaleData(X_train, means, stds);
  const X_test_s  = scaleData(X_test,  means, stds);
  const X_all_s   = scaleData(X_raw,   means, stds);

  // Train
  const model = await trainLinearRegression(X_train_s, y_train);

  // Evaluate on test set
  const y_pred_test = predictBatch(model, X_test_s);
  const r2   = computeR2(y_test, y_pred_test);
  const rmse = computeRMSE(y_test, y_pred_test);

  // Predict all rows for map coloring
  const y_pred_all = predictBatch(model, X_all_s);

  const predictions = filtered.map((row, i) => ({
    geoid:    geoids[i],
    predicted: Math.expm1(y_pred_all[i]),
    actual:   actuals[i],
    namelsad: row["NAMELSAD"] ?? ""
  }));

  model.dispose();

  mlResults = { predictions, r2, rmse, n_train: trainIdx.length, n_test: testIdx.length };
  return mlResults;
}

// ── TF.js model ───────────────────────────────────────────────────────────────
async function trainLinearRegression(X_scaled, y) {
  const nFeatures = X_scaled[0].length;
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 1,
    inputShape: [nFeatures],
    kernelInitializer: "glorotNormal",
    useBias: true
  }));
  model.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });

  const xs = tf.tensor2d(X_scaled);
  const ys = tf.tensor2d(y, [y.length, 1]);

  await model.fit(xs, ys, {
    epochs: 300,
    batchSize: 32,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch) => {
        if (epoch % 50 === 0) updateMLProgress(Math.round((epoch / 300) * 80));
      }
    }
  });

  xs.dispose();
  ys.dispose();
  return model;
}

function predictBatch(model, X_scaled) {
  const xs = tf.tensor2d(X_scaled);
  const preds = model.predict(xs);
  const result = Array.from(preds.dataSync());
  xs.dispose();
  preds.dispose();
  return result;
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function computeScaler(X) {
  const n = X.length, nF = X[0].length;
  const means = new Array(nF).fill(0);
  const stds  = new Array(nF).fill(0);
  for (let j = 0; j < nF; j++) {
    means[j] = X.reduce((s, r) => s + r[j], 0) / n;
    stds[j]  = Math.sqrt(X.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / n) || 1;
  }
  return { means, stds };
}

function scaleData(X, means, stds) {
  return X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
}

function computeR2(yTrue, yPred) {
  const mean  = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
  const ssTot = yTrue.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = yTrue.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  return 1 - ssRes / ssTot;
}

function computeRMSE(yTrue, yPred) {
  return Math.sqrt(yTrue.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0) / yTrue.length);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateMLProgress(pct) {
  const bar = document.getElementById("ml-progress-bar");
  if (bar) bar.style.width = pct + "%";
}
