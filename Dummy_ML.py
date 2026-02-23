import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression

# Set random seed (so results are the same each time)
np.random.seed(42)

# Create fake data (100 rows, 3 features)
X = np.random.rand(100, 3)

# Create target values with some real pattern + noise
y = 3*X[:,0] + 2*X[:,1] - X[:,2] + np.random.normal(0, 0.1, 100)

# Build pipeline (scale data + train model)
model = Pipeline([
    ("scaler", StandardScaler()),   # Normalize features
    ("regressor", LinearRegression())  # Linear regression model
])

# Use 5-fold cross validation
scores = cross_val_score(model, X, y, cv=5)

# Print results
print("Cross-validation scores:", scores)
print("Average score:", scores.mean())

# Train final model on all data
model.fit(X, y)

# Make a prediction on new data
new_sample = np.array([[0.5, 0.2, 0.1]])
prediction = model.predict(new_sample)

print("Prediction:", prediction[0])