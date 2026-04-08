/**
 * GIStice League - ML Model using TensorFlow.js
 * Method 2: Client-side Linear Regression
 * 
 * This module handles:
 * - Loading tract data
 * - Building a linear regression model based on selected parameters
 * - Calculating R² and RMSE metrics
 * - Predicting accessibility index for each tract
 */

// Global model and data storage
let model = null;
let tractData = [];
let selectedParameters = [];
let normalizedData = null;

/**
 * Initialize the ML module
 * @param {Array} data - Array of tract objects with features and target variable
 */
async function initializeMlModule(data) {
  console.log('Initializing ML module with tract data');
  tractData = data;
  
  // Data format expected:
  // [
  //   { 
  //     tractId: "001", 
  //     population: 1000,
  //     medianIncome: 50000,
  //     accessibilityIndex: 0.75,
  //     ... other parameters
  //   },
  //   ...
  // ]
}

/**
 * Get available parameters from the data
 * @returns {Array} List of parameter names that can be used as features
 */
function getAvailableParameters() {
  if (tractData.length === 0) return [];
  
  const firstTract = tractData[0];
  return Object.keys(firstTract).filter(
    key => key !== 'tractId' && key !== 'accessibilityIndex'
  );
}

/**
 * Normalize data for ML training
 * @param {Array} data - Raw data to normalize
 * @param {Array} parameters - Features to use
 * @returns {Object} Normalized data and scaling parameters
 */
function normalizeData(data, parameters) {
  const normalized = {
    features: [],
    target: [],
    scalingParams: {}
  };

  // Calculate min/max for each parameter (for normalization)
  parameters.forEach(param => {
    const values = data.map(d => d[param]).filter(v => v !== undefined);
    const min = Math.min(...values);
    const max = Math.max(...values);
    normalized.scalingParams[param] = { min, max, range: max - min };
  });

  // Normalize features and extract targets
  data.forEach(tract => {
    const normalizedFeatures = parameters.map(param => {
      const value = tract[param];
      const { min, range } = normalized.scalingParams[param];
      return range === 0 ? 0 : (value - min) / range; // Normalize to 0-1
    });
    
    normalized.features.push(normalizedFeatures);
    normalized.target.push(tract.accessibilityIndex);
  });

  return normalized;
}

/**
 * Train the linear regression model
 * @param {Array} selectedParams - Parameters selected by user
 * @returns {Object} Training results with R² and RMSE
 */
async function trainModel(selectedParams) {
  console.log('Training model with parameters:', selectedParams);
  selectedParameters = selectedParams;

  // Validation
  if (selectedParams.length === 0) {
    console.error('No parameters selected');
    return null;
  }

  if (tractData.length === 0) {
    console.error('No tract data loaded');
    return null;
  }

  try {
    // 1. Split data into 80% training, 20% testing
    const shuffledIndices = tf.util.createShuffledIndices(tractData.length);
    const splitIndex = Math.floor(tractData.length * 0.8);
    
    const trainIndices = shuffledIndices.slice(0, splitIndex);
    const testIndices = shuffledIndices.slice(splitIndex);

    const trainData = trainIndices.map(i => tractData[i]);
    const testData = testIndices.map(i => tractData[i]);

    // 2. Normalize both datasets
    normalizedData = normalizeData(tractData, selectedParams);
    const normalizedTrain = normalizeData(trainData, selectedParams);
    const normalizedTest = normalizeData(testData, selectedParams);

    // 3. Convert to TensorFlow tensors
    const trainX = tf.tensor2d(normalizedTrain.features);
    const trainY = tf.tensor2d(normalizedTrain.target, [normalizedTrain.target.length, 1]);
    const testX = tf.tensor2d(normalizedTest.features);
    const testY = tf.tensor2d(normalizedTest.target, [normalizedTest.target.length, 1]);

    // 4. Build and train the model
    model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [selectedParams.length],
          units: 1,
          activation: 'linear'  // Linear regression - no activation
        })
      ]
    });

    model.compile({
      optimizer: tf.train.sgd(0.01),  // Stochastic Gradient Descent
      loss: 'meanSquaredError'
    });

    // Train the model
    await model.fit(trainX, trainY, {
      epochs: 50,
      batchSize: 4,
      verbose: 0
    });

    // 5. Evaluate on test set
    const testPredictions = model.predict(testX);
    const testPredictionsArray = await testPredictions.array();

    // Calculate R² and RMSE
    const testYArray = await testY.array();
    const metrics = calculateMetrics(testYArray.flat(), testPredictionsArray.flat());

    // 6. Generate predictions for all tracts
    const allX = tf.tensor2d(normalizedData.features);
    const allPredictions = model.predict(allX);
    const predictionsArray = await allPredictions.array();

    const tractPredictions = tractData.map((tract, idx) => ({
      tractId: tract.tractId,
      predictedAccessibilityIndex: predictionsArray[idx][0],
      actualAccessibilityIndex: tract.accessibilityIndex
    }));

    // Cleanup tensors
    trainX.dispose();
    trainY.dispose();
    testX.dispose();
    testY.dispose();
    testPredictions.dispose();
    allX.dispose();
    allPredictions.dispose();

    return {
      success: true,
      metrics: {
        r2: metrics.r2,
        rmse: metrics.rmse,
        trainingDataPoints: trainData.length,
        testDataPoints: testData.length
      },
      predictions: tractPredictions
    };

  } catch (error) {
    console.error('Error training model:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate R² and RMSE metrics
 * @param {Array} actual - Actual values
 * @param {Array} predicted - Predicted values
 * @returns {Object} Metrics object with r2 and rmse
 */
function calculateMetrics(actual, predicted) {
  // Calculate mean of actual values
  const mean = actual.reduce((a, b) => a + b) / actual.length;

  // Calculate Sum of Squares Total (SST)
  const sst = actual.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);

  // Calculate Sum of Squares Residual (SSR)
  const ssr = actual.reduce((sum, y, idx) => 
    sum + Math.pow(y - predicted[idx], 2), 0);

  // Calculate R²
  const r2 = 1 - (ssr / sst);

  // Calculate RMSE
  const mse = ssr / actual.length;
  const rmse = Math.sqrt(mse);

  return { r2, rmse };
}

/**
 * Get prediction for a single tract (for future use)
 * @param {Object} tractFeatures - Object with parameter values
 * @returns {Number} Predicted accessibility index
 */
function predictSingleTract(tractFeatures) {
  if (!model) {
    console.error('Model not trained yet');
    return null;
  }

  // Normalize the features
  const normalizedFeatures = selectedParameters.map(param => {
    const value = tractFeatures[param];
    const { min, range } = normalizedData.scalingParams[param];
    return range === 0 ? 0 : (value - min) / range;
  });

  // Make prediction
  const input = tf.tensor2d([normalizedFeatures]);
  const prediction = model.predict(input);
  const result = prediction.dataSync()[0];

  input.dispose();
  prediction.dispose();

  return result;
}

/**
 * Reset the model
 */
function resetModel() {
  if (model) {
    model.dispose();
    model = null;
  }
  selectedParameters = [];
  normalizedData = null;
  console.log('Model reset');
}

// Export functions for use in HTML
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeMlModule,
    getAvailableParameters,
    trainModel,
    predictSingleTract,
    resetModel
  };
}