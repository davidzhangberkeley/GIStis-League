#%%
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

#%%
df = pd.read_csv('../Data/cleaned_dataset.csv')
df.columns = df.columns.str.strip()
df = df.dropna()

#%%
drop_cols = ['Unnamed: 0', 'fid', 'GEOID', 'COUNTYFP', 'NAMELSAD', 'median_hh_',
       'median_h_1', 'CDTFA_COPR', 'CDTFA_COUN', 'CENSUS_PLA',
       'CENSUS_GEO', 'CENSUS_P_1', 'GNIS_PLACE', 'GNIS_ID',
       'acs_2024_tracts_berkeley_oakland_sf_density_city',
       'acs_2024_tracts_berkeley_oakland_sf_density_NAME',
       'acs_2024_tracts_berkeley_oakland_sf_density_year',
       'acs_2024_tracts_berkeley_oakland_sf_density_white_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_black_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_asian_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_hispanic',
       'acs_2024_tracts_berkeley_oakland_sf_density_pop_density',
       'weight_supply_sum', 'NAME_y','CDTFA_CITY', 'NAME_x',
       'acs_2024_tracts_berkeley_oakland_sf_density_pct_white_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_pct_black_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_pct_asian_nh',
       'acs_2024_tracts_berkeley_oakland_sf_density_pct_hispanic'
             ]
df = df.drop(columns=drop_cols)
#%%
# Remove outliers in the target variable
upper = df["Accessibility_Index"].quantile(0.99)
df = df[df["Accessibility_Index"] <= upper]

#%%
X = df.drop(columns=["Accessibility_Index"])
y = np.log1p(df["Accessibility_Index"])

num_cols = X.select_dtypes(include=['float64','int64']).columns
cat_cols = X.select_dtypes(include=['object']).columns

#%%
# Encoding categorical variables
X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
#%%
#Linear Regression
y_true_all = []
y_pred_all = []
kf = KFold(n_splits=5, shuffle=True, random_state=42)
r2_list = []
fold_num = 1

for train_idx, val_idx in kf.split(X):
    # Split data for this fold
    X_train = X.iloc[train_idx]
    X_val = X.iloc[val_idx]
    y_train = y.iloc[train_idx]
    y_val = y.iloc[val_idx]

    # Scale data
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    # Train model
    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    # Predict
    y_val_pred = model.predict(X_val_scaled)

    y_true_all.extend(y_val)
    y_pred_all.extend(y_val_pred)
    # Metrics
    r2 = r2_score(y_val, y_val_pred)

    # Store results
    r2_list.append(r2)

    print(f"Fold {fold_num}")
    print("R2:", r2)

    fold_num += 1

print("Average R2:", np.mean(r2_list))
'''
With racial demographics:
Fold 1
R2: 0.6024946566782704
Fold 2
R2: 0.5138562577191426
Fold 3
R2: 0.6526281017942971
Fold 4
R2: 0.619461999002042
Fold 5
R2: 0.662089436031537
Average R2: 0.6101060902450579

Witout racial demographics:
Fold 1
R2: 0.5852365913018351
Fold 2
R2: 0.5609776008673214
Fold 3
R2: 0.6541581476147189
Fold 4
R2: 0.6302950647777312
Fold 5
R2: 0.6579062047533832
Average R2: 0.617714721862998
'''
#%%
coefficients = pd.Series(model.coef_, index=X.columns)
coefficients = coefficients.sort_values(key=abs, ascending=False)

print(coefficients)
#%%
plt.figure(figsize=(8,6))

coefficients.head(15).sort_values().plot(kind="barh")

plt.xlabel("Coefficient Value")
plt.title("Top 15 Linear Regression Coefficients")

plt.show()
# %%
# RandomForest
# Train model
kf = KFold(n_splits=5, shuffle=True, random_state=42)

r2_list = []
fold_num = 1

for train_idx, val_idx in kf.split(X):

    X_train = X.iloc[train_idx]
    X_val = X.iloc[val_idx]
    y_train = y.iloc[train_idx]
    y_val = y.iloc[val_idx]

    model = RandomForestRegressor(
        n_estimators=400,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )

    model.fit(X_train, y_train)

    y_val_pred = model.predict(X_val)

    r2 = r2_score(y_val, y_val_pred)

    print(f"Fold {fold_num}")
    print("R2:", r2)

    r2_list.append(r2)
    fold_num += 1

print("Average R2:", np.mean(r2_list))
'''
With racial demographics:
Fold 1
R2: 0.7067018520228361
Fold 2
R2: 0.6470520135478794
Fold 3
R2: 0.6792005156688088
Fold 4
R2: 0.6405727165637436
Fold 5
R2: 0.6736457831995443
Average R2: 0.6694345762005625

Without racial demographics:
Fold 1
R2: 0.7062418363970472
Fold 2
R2: 0.6395548006451505
Fold 3
R2: 0.6708943180726765
Fold 4
R2: 0.6490423252183246
Fold 5
R2: 0.6680415792603751
Average R2: 0.6667549719187148
'''
#%%
importance = pd.Series(model.feature_importances_, index=X.columns)
importance = importance.sort_values(ascending=False)

print(importance.head(15))
#%%
plt.figure(figsize=(8,6))

importance.head(15).sort_values().plot(kind="barh")

plt.xlabel("Importance Score")
plt.title("Top 15 Random Forest Feature Importance")

plt.show()
# %%
# XGBoost
kf = KFold(n_splits=5, shuffle=True, random_state=42)

r2_list = []
fold_num = 1

for train_idx, val_idx in kf.split(X):
    X_train = X.iloc[train_idx]
    X_val = X.iloc[val_idx]
    y_train = y.iloc[train_idx]
    y_val = y.iloc[val_idx]

    model = XGBRegressor(
        n_estimators=80,
        max_depth=2,
        learning_rate=0.05,
        subsample=0.7,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42
    )

    model.fit(X_train, y_train)
    y_val_pred = model.predict(X_val)

    r2 = r2_score(y_val, y_val_pred)
    print(f"Fold {fold_num}")
    print("R2:", r2)

    r2_list.append(r2)
    fold_num += 1

print("Average R2:", np.mean(r2_list))
'''
With racial demographics:
Fold 1
R2: 0.6786324836802332
Fold 2
R2: 0.622598437429926
Fold 3
R2: 0.6510641454082322
Fold 4
R2: 0.6444830906514043
Fold 5
R2: 0.6955295311193872
Average R2: 0.6584615376578367

Without racial demographics:
Fold 1
R2: 0.6853599033288147
Fold 2
R2: 0.6129069228729642
Fold 3
R2: 0.6465748812642669
Fold 4
R2: 0.6318487628035103
Fold 5
R2: 0.6877314162664334
Average R2: 0.6528843773071978
'''
#%%
importance = pd.Series(model.feature_importances_, index=X.columns)
importance = importance.sort_values(ascending=False)

print(importance.head(15))
#%%
plt.figure(figsize=(8,6))

importance.head(15).sort_values().plot(kind="barh")

plt.xlabel("Importance Score")
plt.title("Top 15 XGBoost Feature Importance")

plt.show()
