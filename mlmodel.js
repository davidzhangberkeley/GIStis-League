/**
 * GIStice League ML Module
 * Linear Regression Model using TensorFlow.js
 * Parameters are user-selectable and model runs on frontend
 */

class AccessibilityIndexModel {
  constructor() {
    this.data = null;
    this.model = null;
    this.selectedParams = new Set();
    this.results = null;
    this.allTractsPredictions = null;
  }

  /**
   * Load CSV data from file or URL
   * @param {File|String} source - File object or URL path to clean_data.csv
   */
  async loadData(source) {
    try {
      if (typeof source === 'string') {
        // Load from URL/path
        const response = await fetch(source);
        const csvText = await response.text();
        this.data = this.parseCSV(csvText);
      } else {
        // Load from File object
        const text = await source.text();
        this.data = this.parseCSV(text);
      }
      console.log(`✓ Loaded ${this.data.length} tracts`);
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Simple CSV parser (no external dependencies)
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = isNaN(values[index]) ? values[index] : parseFloat(values[index]);
      });
      if (row.accessibility_index !== undefined && row.accessibility_index !== '') {
        data.push(row);
      }
    }
    return data;
  }

  /**
   * Toggle parameter selection
   */
  toggleParameter(paramName) {
    if (this.selectedParams.has(paramName)) {
      this.selectedParams.delete(paramName);
    } else {
      this.selectedParams.add(paramName);
    }
  }

  /**
   * Get all available parameters from data
   */
  getAvailableParameters() {
    if (!this.data || this.data.length === 0) return [];
    
    const firstRow = this.data[0];
    const exclude = ['tract_id', 'accessibility_index', 'Unnamed: 0'];
    
    return Object.keys(firstRow).filter(key => !exclude.includes(key));
  }

  /**
   * Build and train the linear regression model
   */
  async train() {
    if (!this.data || this.data.length === 0) {
      throw new Error('No data loaded');
    }
    if (this.selectedParams.size === 0) {
      throw new Error('No parameters selected');
    }

    const params = Array.from(this.selectedParams);
    
    // Filter valid data rows
    const validData = this.data.filter(row => {
      return row.accessibility_index !== undefined && 
             row.accessibility_index !== '' &&
             params.every(p => row[p] !== undefined && row[p] !== '');
    });

    if (validData.length < 10) {
      throw new Error(`Not enough valid data (need at least 10, got ${validData.length})`);
    }

    // Shuffle and split
    const shuffled = validData.sort(() => Math.random() - 0.5);
    const trainSize = Math.floor(shuffled.length * 0.8);
    const trainData = shuffled.slice(0, trainSize);
    const testData = shuffled.slice(trainSize);

    // Prepare training data
    const trainX = trainData.map(row => params.map(p => row[p]));
    const trainY = trainData.map(row => row.accessibility_index);
    const testX = testData.map(row => params.map(p => row[p]));
    const testY = testData.map(row => row.accessibility_index);

    // Create model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [params.length],
          units: 1,
          activation: 'linear'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Train
    await this.model.fit(
      tf.tensor2d(trainX),
      tf.tensor2d(trainY, [trainY.length, 1]),
      {
        epochs: 100,
        batchSize: 4,
        verbose: 0,
        shuffle: true
      }
    );

    // Test predictions
    const predictions = this.model.predict(tf.tensor2d(testX));
    const predValues = await predictions.data();

    // Calculate metrics
    const testR2 = this.calculateR2(testY, Array.from(predValues));
    const testRMSE = this.calculateRMSE(testY, Array.from(predValues));

    // Get all predictions
    const allX = validData.map(row => params.map(p => row[p]));
    const allPredictions = this.model.predict(tf.tensor2d(allX));
    this.allTractsPredictions = await allPredictions.data();

    // Store results
    this.results = {
      r2: testR2,
      rmse: testRMSE,
      trainSize: trainData.length,
      testSize: testData.length,
      totalTracts: validData.length,
      parameters: params,
      predictions: Array.from(this.allTractsPredictions),
      tractIds: validData.map(row => row.tract_id || 'Unknown'),
      tractData: validData
    };

    // Cleanup tensors
    predictions.dispose();
    allPredictions.dispose();

    return this.results;
  }

  /**
   * Calculate R² (coefficient of determination)
   */
  calculateR2(actual, predicted) {
    const mean = actual.reduce((a, b) => a + b) / actual.length;
    const ssTotal = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    const r2 = 1 - (ssRes / ssTotal);
    return isNaN(r2) ? 0 : r2;
  }

  /**
   * Calculate RMSE (Root Mean Squared Error)
   */
  calculateRMSE(actual, predicted) {
    const mse = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length;
    return Math.sqrt(mse);
  }

  /**
   * Get tracts classified as underserved/overserved
   * Underserved = lower than mean prediction
   * Overserved = higher than mean prediction
   */
  getClassifiedTracts() {
    if (!this.results) return null;

    const meanPrediction = this.results.predictions.reduce((a, b) => a + b) / this.results.predictions.length;
    
    return {
      underserved: this.results.tractData.map((tract, i) => ({
        tract_id: tract.tract_id,
        prediction: this.results.predictions[i],
        status: this.results.predictions[i] < meanPrediction ? 'underserved' : 'overserved',
        score: Math.abs(this.results.predictions[i] - meanPrediction) // How far from mean
      })).filter(t => t.status === 'underserved'),
      overserved: this.results.tractData.map((tract, i) => ({
        tract_id: tract.tract_id,
        prediction: this.results.predictions[i],
        status: this.results.predictions[i] < meanPrediction ? 'underserved' : 'overserved',
        score: Math.abs(this.results.predictions[i] - meanPrediction)
      })).filter(t => t.status === 'overserved'),
      mean: meanPrediction
    };
  }

  /**
   * Dispose of model to free memory
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  /**
   * Get results summary
   */
  getResults() {
    return this.results;
  }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityIndexModel;
}