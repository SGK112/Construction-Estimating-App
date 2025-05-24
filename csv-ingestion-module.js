/**
 * CSV Ingestion Module
 * 
 * A comprehensive module for fetching, parsing, normalizing, and caching CSV data
 * from multiple vendor sources. Supports real-time synchronization, offline fallback,
 * and extensible data transformations.
 */

class CSVIngestionModule {
  /**
   * Initialize the CSV Ingestion Module
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      defaultRefreshInterval: 3600000, // 1 hour in milliseconds
      cacheExpiration: 86400000, // 24 hours in milliseconds
      maxRetries: 3,
      retryDelay: 2000,
      ...config
    };
    
    this.sources = {};
    this.cache = {};
    this.listeners = [];
    this.fetchQueue = [];
    this.isFetching = false;
    
    // Initialize cache from localStorage
    this._initializeCache();
    
    // Bind methods
    this.registerSource = this.registerSource.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.getDataForVendor = this.getDataForVendor.bind(this);
    this.getAllData = this.getAllData.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }
  
  /**
   * Initialize cache from localStorage
   * @private
   */
  _initializeCache() {
    try {
      const cachedData = localStorage.getItem('csvIngestionCache');
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
        
        // Validate cache timestamps
        const now = Date.now();
        Object.keys(this.cache).forEach(sourceId => {
          if (now - this.cache[sourceId].timestamp > this.config.cacheExpiration) {
            // Cache expired, remove it
            delete this.cache[sourceId];
          }
        });
        
        // Save cleaned cache
        this._saveCache();
      }
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      this.cache = {};
    }
  }
  
  /**
   * Save cache to localStorage
   * @private
   */
  _saveCache() {
    try {
      localStorage.setItem('csvIngestionCache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }
  
  /**
   * Register a CSV data source
   * @param {Object} source - Source configuration
   * @param {string} source.id - Unique identifier for the source
   * @param {string} source.name - Display name for the source
   * @param {string} source.url - URL to the CSV data
   * @param {number} [source.refreshInterval] - Refresh interval in milliseconds
   * @param {Object} [source.fieldMapping] - Mapping of app fields to CSV fields
   * @param {Object} [source.transformations] - Custom transformations for fields
   * @returns {string} - The source ID
   */
  registerSource(source) {
    if (!source.id || !source.url) {
      throw new Error('Source must have an id and url');
    }
    
    const sourceConfig = {
      id: source.id,
      name: source.name || source.id,
      url: source.url,
      refreshInterval: source.refreshInterval || this.config.defaultRefreshInterval,
      fieldMapping: source.fieldMapping || {},
      transformations: source.transformations || {},
      lastFetched: 0
    };
    
    this.sources[source.id] = sourceConfig;
    
    // Schedule initial fetch if not in cache or cache expired
    if (!this.cache[source.id] || Date.now() - this.cache[source.id].timestamp > this.config.cacheExpiration) {
      this._scheduleFetch(source.id);
    }
    
    return source.id;
  }
  
  /**
   * Schedule a fetch for a data source
   * @param {string} sourceId - ID of the source to fetch
   * @private
   */
  _scheduleFetch(sourceId) {
    if (!this.sources[sourceId]) {
      console.error(`Cannot schedule fetch for unknown source: ${sourceId}`);
      return;
    }
    
    // Add to queue if not already queued
    if (!this.fetchQueue.includes(sourceId)) {
      this.fetchQueue.push(sourceId);
      this._processQueue();
    }
  }
  
  /**
   * Process the fetch queue
   * @private
   */
  async _processQueue() {
    if (this.isFetching || this.fetchQueue.length === 0) {
      return;
    }
    
    this.isFetching = true;
    const sourceId = this.fetchQueue.shift();
    
    try {
      await this.fetchData(sourceId);
    } catch (error) {
      console.error(`Error fetching data for ${sourceId}:`, error);
    }
    
    this.isFetching = false;
    this._processQueue();
  }
  
  /**
   * Fetch data for a specific source
   * @param {string} sourceId - ID of the source to fetch
   * @returns {Promise<Array>} - The fetched and processed data
   */
  async fetchData(sourceId, retryCount = 0) {
    const source = this.sources[sourceId];
    if (!source) {
      throw new Error(`Unknown source: ${sourceId}`);
    }
    
    try {
      console.log(`Fetching CSV data from ${source.url}`);
      const response = await fetch(source.url);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      // Parse CSV using Papa Parse
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const processedData = this._processData(results.data, source);
              
              // Update cache
              this.cache[sourceId] = {
                data: processedData,
                timestamp: Date.now()
              };
              this._saveCache();
              
              // Update last fetched time
              this.sources[sourceId].lastFetched = Date.now();
              
              // Notify subscribers
              this._notifyListeners(sourceId);
              
              resolve(processedData);
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching data for ${sourceId}:`, error);
      
      // Retry logic
      if (retryCount < this.config.maxRetries) {
        console.log(`Retrying fetch for ${sourceId} (${retryCount + 1}/${this.config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.fetchData(sourceId, retryCount + 1);
      }
      
      // If we have cached data, use it as fallback
      if (this.cache[sourceId]) {
        console.log(`Using cached data for ${sourceId}`);
        return this.cache[sourceId].data;
      }
      
      throw error;
    }
  }
  
  /**
   * Process raw CSV data according to source configuration
   * @param {Array} rawData - Raw data from CSV
   * @param {Object} source - Source configuration
   * @returns {Array} - Processed data
   * @private
   */
  _processData(rawData, source) {
    if (!Array.isArray(rawData)) {
      throw new Error('Raw data must be an array');
    }
    
    return rawData.map((item, index) => {
      const processedItem = {
        id: `${source.id}_${index}`,
        vendorName: source.name
      };
      
      // Apply field mapping
      Object.keys(source.fieldMapping).forEach(appField => {
        const csvField = source.fieldMapping[appField];
        processedItem[appField] = item[csvField];
      });
      
      // Apply transformations
      Object.keys(source.transformations).forEach(field => {
        if (processedItem[field] !== undefined) {
          processedItem[field] = source.transformations[field](processedItem[field], item);
        }
      });
      
      // Apply standard transformations
      if (processedItem.colorName) {
        processedItem.normalizedColorName = this._normalizeColorName(processedItem.colorName);
      }
      
      if (processedItem.installedPricePerSqFt) {
        processedItem.installedPricePerSqFt = this._parsePrice(processedItem.installedPricePerSqFt);
      }
      
      return processedItem;
    }).filter(item => {
      // Filter out invalid items (must have at least colorName and material)
      return item.colorName && item.material;
    });
  }
  
  /**
   * Normalize a color name for consistent matching
   * @param {string} colorName - The color name to normalize
   * @returns {string} - Normalized color name
   * @private
   */
  _normalizeColorName(colorName) {
    if (typeof colorName !== 'string') return '';
    return colorName.trim().toLowerCase().replace(/\s+/g, '');
  }
  
  /**
   * Parse a price value to ensure it's a valid number
   * @param {string|number} price - The price to parse
   * @returns {number} - Parsed price
   * @private
   */
  _parsePrice(price) {
    if (typeof price === 'number' && !isNaN(price)) {
      return price;
    }
    
    if (typeof price === 'string') {
      // Remove currency symbols and commas
      const cleanPrice = price.replace(/[$,]/g, '');
      const parsedPrice = parseFloat(cleanPrice);
      if (!isNaN(parsedPrice)) {
        return parsedPrice;
      }
    }
    
    return 0;
  }
  
  /**
   * Get data for a specific vendor
   * @param {string} vendorId - ID of the vendor
   * @returns {Array} - Vendor data
   */
  getDataForVendor(vendorId) {
    // Check if we need to refresh the data
    const source = this.sources[vendorId];
    if (source && Date.now() - source.lastFetched > source.refreshInterval) {
      this._scheduleFetch(vendorId);
    }
    
    // Return cached data if available
    if (this.cache[vendorId]) {
      return this.cache[vendorId].data;
    }
    
    return [];
  }
  
  /**
   * Get all data from all sources
   * @returns {Array} - Combined data from all sources
   */
  getAllData() {
    let allData = [];
    
    Object.keys(this.cache).forEach(sourceId => {
      allData = allData.concat(this.cache[sourceId].data);
    });
    
    return allData;
  }
  
  /**
   * Subscribe to data updates
   * @param {Function} listener - Callback function
   * @returns {Function} - Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    
    this.listeners.push(listener);
    
    return () => {
      this.unsubscribe(listener);
    };
  }
  
  /**
   * Unsubscribe from data updates
   * @param {Function} listener - Callback function to remove
   */
  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Notify listeners of data updates
   * @param {string} sourceId - ID of the updated source
   * @private
   */
  _notifyListeners(sourceId) {
    this.listeners.forEach(listener => {
      try {
        listener(sourceId);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }
  
  /**
   * Force refresh of all data sources
   * @returns {Promise<void>}
   */
  async refreshAllSources() {
    const promises = Object.keys(this.sources).map(sourceId => {
      return this.fetchData(sourceId);
    });
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Clear the cache for a specific source or all sources
   * @param {string} [sourceId] - ID of the source to clear, or all if omitted
   */
  clearCache(sourceId) {
    if (sourceId) {
      delete this.cache[sourceId];
    } else {
      this.cache = {};
    }
    
    this._saveCache();
  }
}

// Export the module
export default CSVIngestionModule;
