import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error


df = pd.read_csv('/Users/lindsaylai/Desktop/GIStis-League/Data/Bay_AI.csv')
df.columns = [c.replace('acs_2024_tracts_berkeley_oakland_sf_density_', '') for c in df.columns]
df.columns = df.columns.str.strip()
features = [
    'total_pop', 'white_nh', 'black_nh', 'asian_nh', 'hispanic',
    'pct_white_nh', 'pct_black_nh', 'pct_asian_nh', 'pct_hispanic', 'pct_poc',
    'median_income', 'median_home_value', 'housing_units_total',
    'owner_occupied', 'renter_occupied', 'homeownership_rate',
    'area_sq_miles', 'pop_density', 'weight_supply_sum'
]
target = 'Accessibility_Index'

for f in features + [target]:
    if f not in df.columns:
        print(f"ERROR: Column '{f}' was not found in the CSV!")

df_clean = df.dropna(subset=features + [target]).copy()
X = df_clean[features] 
y = df_clean[target]


model = LinearRegression()
model.fit(X, y)


df_clean['Predicted_Accessibility'] = model.predict(X)
df_clean['Residue'] = df_clean[target] - df_clean['Predicted_Accessibility']

r2 = model.score(X, y)
print(f"\n--- Model Performance ---")
print(f"R-squared Score: {r2:.4f}")

importance = pd.DataFrame({'Feature': features, 'Coefficient': model.coef_})
print("\n--- Feature Importance (Top 5) ---")
print(importance.sort_values(by='Coefficient', ascending=False).head(5))

city_col = 'city'

results_table = df_clean[['GEOID', city_col, target, 'Predicted_Accessibility', 'Residue']]

results_table = results_table.rename(columns={city_col: 'city'})

print("--- Prediction Table (First 10 Tracts) ---")
print(results_table.head(10))

df_sorted = df_clean.sort_values(by='Residue')

plt.figure(figsize=(12, 6))

colors = ['red' if x < 0 else 'green' for x in df_sorted['Residue']]
plt.bar(range(len(df_sorted)), df_sorted['Residue'], color=colors)

plt.axhline(0, color='black', linewidth=0.8)
plt.xlabel("Census Tracts (Sorted by Residue)")
plt.ylabel("Residue (Actual - Predicted)")
plt.title("Residue Chart: Identifying Overserved vs. Underserved Areas")
plt.text(0, df_sorted['Residue'].max(), ' Overserved (Better than predicted)', color='green', fontweight='bold')
plt.text(0, df_sorted['Residue'].min(), ' Underserved (Worse than predicted)', color='red', fontweight='bold')
plt.show()

results_table.to_csv('Accessibility_Predictions.csv', index=False)