#imports

from sklearn.datasets import load_diabetes #gives us dataset instantly
from sklearn.model_selection import train_test_split #splits data into train/test
from sklearn.linear_model import LinearRegression #the model
from sklearn.metrics import mean_squared_error, r2_score #scoring functions


def main():
    # load a built in regression dataset
    data = load_diabetes()
    X = data.data      # 2d array, rows are patients, columns are features
    y = data.target    # 1d array, the numeric target value per patient

    # split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,      # 20% test, 80% train
        random_state=42     # makes results reproducible
    )

    # create the model
    model = LinearRegression()

    #learns the weights w and intercept b
    # Train (fit) the model on the training data
    model.fit(X_train, y_train)

    #uses learned weights to predict y values for unseen test examples
    #Predict on the test data
    preds = model.predict(X_test)

    # evaluate predictions
    mse = mean_squared_error(y_test, preds) #mean/average squared error
    r2 = r2_score(y_test, preds)#how much better than just guessing the mean

    print("Linear Regression Demo (diabetes dataset)")
    print("MSE:", mse)
    print("R2:", r2)

    print("Coefficients:", model.coef_)#weights for each feature
    print("Intercept:", model.intercept_)#baseline offset


if __name__ == "__main__":
    main()
