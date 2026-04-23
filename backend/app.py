from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np


from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

app = Flask(__name__)
CORS(app)

DATA_PATH = "old_data/data_set_gis_0331.csv"
TARGET = "Accessibility_Index"

# columns that should never be used as model features
EXCLUDED_COLUMNS = {
    TARGET,
    "fid", "STATEFP", "COUNTYFP", "TRACTCE", "GEOID", "NAME", "NAMELSAD",
    "MTFCC", "FUNCSTAT", "ALAND", "AWATER", "INTPTLAT", "INTPTLON",
    "layer", "path", "field_1", "CDTFA_COPR", "CDTFA_CITY", "CDTFA_COUN",
    "CENSUS_PLA", "CENSUS_GEO", "CENSUS_P_1", "GNIS_PLACE", "GNIS_ID",
    "City_name", "NAME_x", "NAME_y"
}

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/run-model", methods=["POST"])
def run_model():
    payload = request.get_json()
    selected_features = payload.get("selected_features", [])

    if not selected_features:
        return jsonify({"error": "No features selected."}), 400

    df = pd.read_csv(
        DATA_PATH,
        dtype={
            "GEOID": str,
        }
    )

    # keep only allowed columns
    selected_features = [
        col for col in selected_features
        if col in df.columns and col not in EXCLUDED_COLUMNS
    ]

    if not selected_features:
        return jsonify({"error": "No valid features selected."}), 400

    # use only necessary columns
    working = df[["GEOID", TARGET] + selected_features].dropna().copy()

    if len(working) < 10:
        return jsonify({"error": "Not enough rows after dropping missing values."}), 400

    X = working.drop(columns=[TARGET, "GEOID"])
    y = np.log1p(working[TARGET])

    # encode categoricals if any
    cat_cols = X.select_dtypes(include=["object", "category"]).columns
    if len(cat_cols) > 0:
        X = pd.get_dummies(X, columns=cat_cols, drop_first=True)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    y_true_all = []
    y_pred_all = []
    r2_list = []

    for train_idx, val_idx in kf.split(X):
        X_train = X.iloc[train_idx]
        X_val = X.iloc[val_idx]
        y_train = y.iloc[train_idx]
        y_val = y.iloc[val_idx]

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)

        model = LinearRegression()
        model.fit(X_train_scaled, y_train)

        y_val_pred = model.predict(X_val_scaled)

        y_true_all.extend(y_val)
        y_pred_all.extend(y_val_pred)

        r2 = r2_score(y_val, y_val_pred)
        r2_list.append(r2)

    # overall CV metrics on log scale
    mean_r2 = float(np.mean(r2_list))
    rmse_log = float(np.sqrt(mean_squared_error(y_true_all, y_pred_all)))

    # train final model on all rows for per-tract predictions
    final_scaler = StandardScaler()
    X_scaled_all = final_scaler.fit_transform(X)

    final_model = LinearRegression()
    final_model.fit(X_scaled_all, y)

    y_pred_all_rows_log = final_model.predict(X_scaled_all)
    y_pred_all_rows = np.expm1(y_pred_all_rows_log)

    working["predicted_accessibility"] = y_pred_all_rows
    
    # residual
    working["residual"] = working[TARGET] - working["predicted_accessibility"]

    # percent difference
    working["pct_diff"] = working["residual"] / working["predicted_accessibility"]

    sd = np.std(working["residual"] / working[TARGET])
    mean = np.mean(working["residual"] / working[TARGET])
    def classify_pct_diff(p):  #1sd 
        if p-mean < -sd:
            return "Below expected access"
        elif p-mean > sd:
            return "Above expected access"
        else:
            return "About as expected"

    working["access_label"] = (working["residual"] / working[TARGET]).apply(classify_pct_diff)

    tract_results = working[["GEOID", "predicted_accessibility", "residual", "pct_diff", "access_label"]].to_dict(orient="records")

    return jsonify({
        "r2": round(mean_r2, 4),
        "rmse": round(rmse_log, 4),
        "selected_features": selected_features,
        "tract_results": tract_results
    })

if __name__ == "__main__":
    app.run(debug=True)