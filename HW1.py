# %%
import pandas as pd
import requests
from io import BytesIO

# %% Import AirBnB dataset from Dataverse
url = "https://datasets.lib.berkeley.edu/api/access/datafile/33337"
headers = {"X-Dataverse-key": "d49738a2-f861-4982-af21-e2b50989b519"}

r = requests.get(url, headers=headers)
r.raise_for_status()

df = pd.read_csv(BytesIO(r.content), sep="\t")

# %% Dataset exploration
df.head()
# %%
print(df.columns)
'''
Index(['Property ID', 'Host ID', 'Listing Title', 'Property Type',
       'Listing Type', 'Created Date', 'Last Scraped Date', 'Country', 'State',
       'City', 'Zipcode', 'Neighborhood', 'Metropolitan Statistical Area',
       'Average Daily Rate', 'Annual Revenue LTM', 'Occupancy Rate LTM',
       'Number of Bookings LTM', 'Number of Reviews', 'Overall Rating',
       'Bedrooms', 'Bathrooms', 'Max Guests', 'Calendar Last Updated',
       'Response Rate', 'Response Time (min)', 'Superhost',
       'Cancellation Policy', 'Security Deposit', 'Cleaning Fee',
       'Extra People Fee', 'Published Nightly Rate', 'Published Monthly Rate',
       'Published Weekly Rate', 'Check-in Time', 'Checkout Time',
       'Minimum Stay', 'Count Reservation Days LTM',
       'Count Available Days LTM', 'Count Blocked Days LTM',
       'Number of Photos', 'Business Ready', 'Instantbook Enabled',
       'Listing URL', 'Listing Main Image URL', 'Latitude', 'Longitude'],
      dtype='object')
'''

df.shape
'''
(44855, 46)
'''
# %% Check data types of each column
print(df.dtypes)
'''
Property ID                        int64
Host ID                          float64
Listing Title                        str
Property Type                        str
Listing Type                         str
Created Date                         str
Last Scraped Date                    str
Country                              str
State                                str
City                                 str
Zipcode                           object
Neighborhood                         str
Metropolitan Statistical Area        str
Average Daily Rate               float64
Annual Revenue LTM               float64
Occupancy Rate LTM               float64
Number of Bookings LTM           float64
Number of Reviews                float64
Overall Rating                   float64
Bedrooms                         float64
Bathrooms                        float64
Max Guests                        object
Calendar Last Updated                str
Response Rate                    float64
Response Time (min)               object
Superhost                            str
Cancellation Policy                  str
Security Deposit                 float64
Cleaning Fee                     float64
Extra People Fee                 float64
Published Nightly Rate             int64
Published Monthly Rate           float64
Published Weekly Rate             object
Check-in Time                        str
Checkout Time                        str
Minimum Stay                     float64
Count Reservation Days LTM       float64
Count Available Days LTM         float64
Count Blocked Days LTM           float64
Number of Photos                  object
Business Ready                       str
Instantbook Enabled                  str
Listing URL                          str
Listing Main Image URL               str
Latitude                         float64
Longitude                        float64
dtype: object
'''
# %% check for missing values in each column
print(df.isna().sum().sort_values(ascending=False))
'''
Extra People Fee                 31690
Security Deposit                 24904
Checkout Time                    22600
Response Rate                    22307
Check-in Time                    21911
Response Time (min)              21469
Occupancy Rate LTM               19619
Average Daily Rate               19619
Overall Rating                   18467
Neighborhood                     15786
Cleaning Fee                     15085
Superhost                         9588
Count Blocked Days LTM            8364
Count Available Days LTM          8364
Count Reservation Days LTM        8364
Listing Main Image URL            7590
Number of Photos                  2481
Number of Reviews                 1598
Calendar Last Updated              980
Bathrooms                          203
Annual Revenue LTM                 183
Number of Bookings LTM             182
Published Monthly Rate             158
Published Weekly Rate              158
Property Type                      123
Host ID                             90
Max Guests                          64
Bedrooms                            57
Zipcode                             54
City                                54
Minimum Stay                        44
Listing Title                       33
Cancellation Policy                 27
Longitude                            1
Metropolitan Statistical Area        1
Published Nightly Rate               0
State                                0
Country                              0
Last Scraped Date                    0
Created Date                         0
Business Ready                       0
Instantbook Enabled                  0
Listing URL                          0
Listing Type                         0
Latitude                             0
Property ID                          0
dtype: int64
'''
# %%
df = df.dropna(subset=["Average Daily Rate"])
# %% Drop columns adding noise
df = df.drop(columns=[
    "Listing URL",
    "Listing Main Image URL",
    "Listing Title",
    "Host ID",
    "Property ID",
])
# %% Convert columns to numeric, coercing errors to NaN
df['Max Guests'] = pd.to_numeric(df['Max Guests'], errors='coerce')
df['Response Time (min)'] = pd.to_numeric(df['Response Time (min)'], errors='coerce')
df['Published Weekly Rate'] = pd.to_numeric(df['Published Weekly Rate'], errors='coerce')
df['Number of Photos'] = pd.to_numeric(df['Number of Photos'], errors='coerce')
# %% Split dataset into features and target variable
from sklearn.model_selection import train_test_split

X = df.drop(columns=["Average Daily Rate"])
y = df["Average Daily Rate"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
# %% Identify numerical and categorical columns
num_cols = X_train.select_dtypes(include=['float64','int64']).columns
cat_cols = X_train.select_dtypes(include=['object','str']).columns
print("Numerical columns:", num_cols)
print("Categorical columns:", cat_cols)
'''
Numerical columns: Index(['Annual Revenue LTM', 'Occupancy Rate LTM', 'Number of Bookings LTM',
       'Number of Reviews', 'Overall Rating', 'Bedrooms', 'Bathrooms',
       'Max Guests', 'Response Rate', 'Response Time (min)',
       'Security Deposit', 'Cleaning Fee', 'Extra People Fee',
       'Published Nightly Rate', 'Published Monthly Rate',
       'Published Weekly Rate', 'Minimum Stay', 'Count Reservation Days LTM',
       'Count Available Days LTM', 'Count Blocked Days LTM',
       'Number of Photos', 'Latitude', 'Longitude'],
      dtype='str')
Categorical columns: Index(['Property Type', 'Listing Type', 'Created Date', 'Last Scraped Date',
       'Country', 'State', 'City', 'Zipcode', 'Neighborhood',
       'Metropolitan Statistical Area', 'Calendar Last Updated', 'Superhost',
       'Cancellation Policy', 'Check-in Time', 'Checkout Time',
       'Business Ready', 'Instantbook Enabled'],
      dtype='str')
'''

# %%
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LassoCV
# %% data imputation, numeric: median, categorical: mode
X_train[num_cols] = X_train[num_cols].fillna(X_train[num_cols].median())
X_test[num_cols]  = X_test[num_cols].fillna(X_train[num_cols].median())

for i in cat_cols:
    mode = X_train[i].mode(dropna=True)
    if len(mode) > 0:
      fill = mode.iloc[0] 
    else:
       fill = "Missing"
    X_train[i] = X_train[i].fillna(fill)
    X_test[i]  = X_test[i].fillna(fill)

# %% One hot encoding
X_train = pd.get_dummies(X_train, columns=cat_cols, drop_first=True)
X_test  = pd.get_dummies(X_test,  columns=cat_cols, drop_first=True)
X_test = X_test.reindex(columns=X_train.columns, fill_value=0)

# %% check mulitcollinearity
from statsmodels.stats.outliers_influence import variance_inflation_factor
import pandas as pd

X_vif = X_train[num_cols].copy()

vif = pd.DataFrame()
vif["feature"] = X_vif.columns
vif["VIF"] = [variance_inflation_factor(X_vif.values, i) 
              for i in range(X_vif.shape[1])]

print(vif.sort_values("VIF", ascending=False).head(10))
'''
feature          VIF
22                   Longitude  1241.502454
21                    Latitude  1098.261580
4               Overall Rating   146.532240
8                Response Rate   119.990856
13      Published Nightly Rate    30.571176
14      Published Monthly Rate    19.970302
1           Occupancy Rate LTM    10.850443
17  Count Reservation Days LTM    10.402259
15       Published Weekly Rate     9.654725
5                     Bedrooms     9.036896
'''

X_train = X_train.drop(columns=["Latitude", "Longitude","Overall Rating", "Response Rate", "Published Nightly Rate", "Published Monthly Rate", "Published Weekly Rate"])
X_test = X_test.drop(columns=["Latitude", "Longitude","Overall Rating", "Response Rate", "Published Nightly Rate", "Published Monthly Rate", "Published Weekly Rate"])     

# %% Lasso regression for feature selection
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LassoCV
from sklearn.pipeline import Pipeline

lasso = Pipeline([
    ("scaler", StandardScaler(with_mean=False)),  
    ("model", LassoCV(cv=5, random_state=42, max_iter=5000))
])

lasso.fit(X_train, y_train)
# %% Extract feature importance from Lasso coefficients
coef = lasso.named_steps["model"].coef_
feature_importance = pd.Series(coef, index=X_train.columns).sort_values(ascending=False)

print(feature_importance.head(20))
'''
Annual Revenue LTM                  76.029907
Security Deposit                    36.753250
Bathrooms                           33.443549
Max Guests                          29.079458
Bedrooms                            25.885811
Cleaning Fee                        24.139993
City_San Francisco                  19.121161
Property Type_Villa                 17.760543
Listing Type_Entire home/apt        15.805848
Check-in Time_Anytime after 2AM     14.311724
Last Scraped Date_2016-02-01        13.892238
Calendar Last Updated_2016-01-25    13.001459
Zipcode_94010.0                     11.243582
Created Date_2011-04-14              9.269256
Zipcode_94970                        8.901329
Created Date_2011-03-07              8.444449
Created Date_2015-12-22              8.418273
Created Date_2015-02-01              7.959981
Created Date_2012-01-01              6.830711
Calendar Last Updated_2016-01-05     5.414016
dtype: float64
'''
# %% Evaluate model performance using R2 score
from sklearn.metrics import r2_score

y_pred = lasso.predict(X_test)

r2 = r2_score(y_test, y_pred)
print("R2:", r2)

'''
R2: 0.33291711730517826
'''
# %%
