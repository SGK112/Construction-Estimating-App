/**
 * API Connection Module
 * 
 * This module provides robust API connections and fallback mechanisms for the
 * Construction Estimator app, ensuring reliable data integration even when
 * network connectivity is limited.
 */

class APIConnectionManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://surprise-granite-connections-dev.onrender.com';
    this.endpoints = options.endpoints || {
      labor: '/api/csv/labor',
      materials: '/api/csv/materials',
      images: '/api/images',
      quotes: '/api/quotes'
    };
    this.fallbackUrls = options.fallbackUrls || {
      labor: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSX3Bh_n3s_HKEjZW20hNxj0hmpeoIc27sVJ1TjIvRzenPy0Np11J-KFtHgeUsu5NuVOv9zaWMA1LCU/pub?output=csv',
      materials: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRWyYuTQxC8_fKNBg9_aJiB7NMFztw6mgdhN35lo8sRL45MvncRg4D217lopZxuw39j5aJTN6TP4Elh/pub?output=csv'
    };
    this.cacheKeys = options.cacheKeys || {
      labor: 'labor_pricing_data',
      materials: 'material_pricing_data',
      images: 'image_data'
    };
    this.cacheDuration = options.cacheDuration || 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.onlineStatus = navigator.onLine;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    this.onStatusChange = options.onStatusChange || (() => {});
    
    this.initialize();
  }
  
  initialize() {
    // Set up online/offline event listeners
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      this.onStatusChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      this.onStatusChange(false);
    });
  }
  
  /**
   * Fetch data from API with fallback and caching
   * @param {string} type - The type of data to fetch ('labor', 'materials', etc.)
   * @param {boolean} forceRefresh - Whether to bypass cache and force a refresh
   * @returns {Promise<Object>} - The fetched data
   */
  async fetchData(type, forceRefresh = false) {
    // Check if we have cached data and it's not a forced refresh
    if (!forceRefresh) {
      const cachedData = this.getCachedData(type);
      if (cachedData) {
        console.log(`Using cached ${type} data`);
        return cachedData;
      }
    }
    
    // If we're offline, try to use cached data even with forceRefresh
    if (!this.onlineStatus) {
      const cachedData = this.getCachedData(type);
      if (cachedData) {
        console.log(`Offline: Using cached ${type} data`);
        return cachedData;
      } else {
        throw new Error(`Offline and no cached ${type} data available`);
      }
    }
    
    // Try primary API endpoint
    try {
      const data = await this.fetchWithRetry(`${this.baseUrl}${this.endpoints[type]}`);
      this.cacheData(type, data);
      return data;
    } catch (error) {
      console.warn(`Error fetching ${type} data from primary API:`, error);
      
      // Try fallback URL if available
      if (this.fallbackUrls[type]) {
        try {
          console.log(`Trying fallback URL for ${type} data`);
          const data = await this.fetchWithRetry(this.fallbackUrls[type]);
          this.cacheData(type, data);
          return data;
        } catch (fallbackError) {
          console.error(`Error fetching ${type} data from fallback URL:`, fallbackError);
          
          // Last resort: try cached data even if forceRefresh was requested
          const cachedData = this.getCachedData(type);
          if (cachedData) {
            console.log(`Using cached ${type} data as last resort`);
            return cachedData;
          }
          
          throw new Error(`Failed to fetch ${type} data from all sources`);
        }
      } else {
        // No fallback URL, try cached data
        const cachedData = this.getCachedData(type);
        if (cachedData) {
          console.log(`Using cached ${type} data after API failure`);
          return cachedData;
        }
        
        throw new Error(`Failed to fetch ${type} data and no fallback available`);
      }
    }
  }
  
  /**
   * Fetch with retry logic
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - The fetched data
   */
  async fetchWithRetry(url, options = {}, attempt = 1) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Handle different response types
      if (url.endsWith('.csv')) {
        const text = await response.text();
        return this.parseCSV(text);
      } else {
        return await response.json();
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.log(`Retry attempt ${attempt} for ${url}`);
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Parse CSV data
   * @param {string} csvText - The CSV text to parse
   * @returns {Array<Object>} - Array of objects representing CSV rows
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
      const values = line.split(',').map(value => value.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        // Try to convert numeric values
        const value = values[index];
        row[header] = this.convertValue(value);
      });
      
      return row;
    });
  }
  
  /**
   * Convert string value to appropriate type
   * @param {string} value - The value to convert
   * @returns {any} - Converted value
   */
  convertValue(value) {
    if (value === undefined || value === '') {
      return null;
    }
    
    // Check if it's a number
    if (!isNaN(value) && value.trim() !== '') {
      return Number(value);
    }
    
    // Check if it's a boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Otherwise, return as string
    return value;
  }
  
  /**
   * Cache data in localStorage
   * @param {string} type - The type of data to cache
   * @param {Object} data - The data to cache
   */
  cacheData(type, data) {
    if (!this.cacheKeys[type]) {
      console.warn(`No cache key defined for ${type}`);
      return;
    }
    
    try {
      const cacheItem = {
        data: data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.cacheKeys[type], JSON.stringify(cacheItem));
      console.log(`Cached ${type} data`);
    } catch (error) {
      console.error(`Error caching ${type} data:`, error);
    }
  }
  
  /**
   * Get cached data from localStorage
   * @param {string} type - The type of data to retrieve
   * @returns {Object|null} - The cached data or null if not found or expired
   */
  getCachedData(type) {
    if (!this.cacheKeys[type]) {
      console.warn(`No cache key defined for ${type}`);
      return null;
    }
    
    try {
      const cacheItem = localStorage.getItem(this.cacheKeys[type]);
      
      if (!cacheItem) {
        return null;
      }
      
      const { data, timestamp } = JSON.parse(cacheItem);
      const age = Date.now() - timestamp;
      
      if (age > this.cacheDuration) {
        console.log(`Cached ${type} data expired`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error retrieving cached ${type} data:`, error);
      return null;
    }
  }
  
  /**
   * Clear cached data
   * @param {string} type - The type of data to clear, or null to clear all
   */
  clearCache(type = null) {
    if (type) {
      if (this.cacheKeys[type]) {
        localStorage.removeItem(this.cacheKeys[type]);
        console.log(`Cleared ${type} cache`);
      }
    } else {
      Object.values(this.cacheKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Cleared all cache');
    }
  }
  
  /**
   * Submit data to API with fallback
   * @param {string} type - The type of endpoint to submit to
   * @param {Object} data - The data to submit
   * @returns {Promise<Object>} - The response data
   */
  async submitData(type, data) {
    if (!this.onlineStatus) {
      // Store for later submission when online
      this.queueSubmission(type, data);
      throw new Error(`Cannot submit ${type} data while offline`);
    }
    
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}${this.endpoints[type]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      return response;
    } catch (error) {
      console.error(`Error submitting ${type} data:`, error);
      
      // Queue for later submission
      this.queueSubmission(type, data);
      
      throw error;
    }
  }
  
  /**
   * Queue submission for later when online
   * @param {string} type - The type of endpoint
   * @param {Object} data - The data to submit
   */
  queueSubmission(type, data) {
    const queueKey = `queued_${type}_submissions`;
    
    try {
      let queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      queue.push({
        data: data,
        timestamp: Date.now()
      });
      
      localStorage.setItem(queueKey, JSON.stringify(queue));
      console.log(`Queued ${type} submission for later`);
    } catch (error) {
      console.error(`Error queuing ${type} submission:`, error);
    }
  }
  
  /**
   * Process queued submissions
   * @param {string} type - The type of endpoint to process, or null for all
   * @returns {Promise<Array>} - Results of submission attempts
   */
  async processQueue(type = null) {
    if (!this.onlineStatus) {
      console.log('Cannot process queue while offline');
      return [];
    }
    
    const typesToProcess = type ? [type] : Object.keys(this.endpoints);
    const results = [];
    
    for (const t of typesToProcess) {
      const queueKey = `queued_${t}_submissions`;
      
      try {
        let queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
        
        if (queue.length === 0) {
          continue;
        }
        
        console.log(`Processing ${queue.length} queued ${t} submissions`);
        
        const newQueue = [];
        
        for (const item of queue) {
          try {
            const response = await this.fetchWithRetry(`${this.baseUrl}${this.endpoints[t]}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(item.data)
            });
            
            results.push({
              type: t,
              success: true,
              data: item.data,
              response: response
            });
          } catch (error) {
            console.error(`Error processing queued ${t} submission:`, error);
            
            // Keep in queue for next attempt
            newQueue.push(item);
            
            results.push({
              type: t,
              success: false,
              data: item.data,
              error: error.message
            });
          }
        }
        
        localStorage.setItem(queueKey, JSON.stringify(newQueue));
        console.log(`Processed ${queue.length - newQueue.length} of ${queue.length} queued ${t} submissions`);
      } catch (error) {
        console.error(`Error processing ${t} queue:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Get image URL for a color name
   * @param {string} colorName - The color name to get image for
   * @returns {Promise<string>} - The image URL
   */
  async getImageUrl(colorName) {
    try {
      // Try to get from API
      if (this.onlineStatus) {
        try {
          const response = await this.fetchWithRetry(`${this.baseUrl}${this.endpoints.images}/${encodeURIComponent(colorName)}`);
          
          if (response && response.imageUrl) {
            // Cache the result
            this.cacheImageUrl(colorName, response.imageUrl);
            return response.imageUrl;
          }
        } catch (error) {
          console.warn(`Error fetching image for ${colorName}:`, error);
        }
      }
      
      // Try to get from cache
      const cachedUrl = this.getCachedImageUrl(colorName);
      if (cachedUrl) {
        return cachedUrl;
      }
      
      // Return default image URL
      return this.getDefaultImageUrl(colorName);
    } catch (error) {
      console.error(`Error getting image URL for ${colorName}:`, error);
      return this.getDefaultImageUrl(colorName);
    }
  }
  
  /**
   * Cache image URL for a color name
   * @param {string} colorName - The color name
   * @param {string} imageUrl - The image URL
   */
  cacheImageUrl(colorName, imageUrl) {
    try {
      let imageCache = JSON.parse(localStorage.getItem(this.cacheKeys.images) || '{}');
      imageCache[colorName.toLowerCase()] = {
        url: imageUrl,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.cacheKeys.images, JSON.stringify(imageCache));
    } catch (error) {
      console.error(`Error caching image URL for ${colorName}:`, error);
    }
  }
  
  /**
   * Get cached image URL for a color name
   * @param {string} colorName - The color name
   * @returns {string|null} - The cached image URL or null
   */
  getCachedImageUrl(colorName) {
    try {
      const imageCache = JSON.parse(localStorage.getItem(this.cacheKeys.images) || '{}');
      const cacheItem = imageCache[colorName.toLowerCase()];
      
      if (!cacheItem) {
        return null;
      }
      
      const age = Date.now() - cacheItem.timestamp;
      
      if (age > this.cacheDuration) {
        return null;
      }
      
      return cacheItem.url;
    } catch (error) {
      console.error(`Error getting cached image URL for ${colorName}:`, error);
      return null;
    }
  }
  
  /**
   * Get default image URL for a color name
   * @param {string} colorName - The color name
   * @returns {string} - A default image URL
   */
  getDefaultImageUrl(colorName) {
    // Generate a color-based placeholder
    const hash = this.hashString(colorName.toLowerCase());
    const hue = hash % 360;
    
    return `https://via.placeholder.com/300/${this.hslToHex(hue, 70, 60)}/${this.hslToHex(hue, 90, 30)}?text=${encodeURIComponent(colorName)}`;
  }
  
  /**
   * Simple string hash function
   * @param {string} str - The string to hash
   * @returns {number} - A numeric hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Convert HSL to HEX color
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} - HEX color code without #
   */
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `${f(0)}${f(8)}${f(4)}`;
  }
}

class DataSyncManager {
  constructor(apiManager) {
    this.apiManager = apiManager;
    this.laborData = null;
    this.materialsData = null;
    this.syncInterval = null;
    this.syncIntervalTime = 15 * 60 * 1000; // 15 minutes
    this.onDataUpdate = () => {};
    this.lastSyncTime = {
      labor: 0,
      materials: 0
    };
  }
  
  /**
   * Initialize data by loading from cache or API
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    try {
      // Try to load labor data
      try {
        this.laborData = await this.apiManager.fetchData('labor');
        this.lastSyncTime.labor = Date.now();
      } catch (error) {
        console.error('Error loading labor data:', error);
      }
      
      // Try to load materials data
      try {
        this.materialsData = await this.apiManager.fetchData('materials');
        this.lastSyncTime.materials = Date.now();
      } catch (error) {
        console.error('Error loading materials data:', error);
      }
      
      // Start sync interval
      this.startSyncInterval();
      
      return this.laborData !== null && this.materialsData !== null;
    } catch (error) {
      console.error('Error initializing data:', error);
      return false;
    }
  }
  
  /**
   * Start automatic sync interval
   */
  startSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, this.syncIntervalTime);
  }
  
  /**
   * Stop automatic sync interval
   */
  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Sync data from API
   * @param {boolean} force - Whether to force refresh from API
   * @returns {Promise<Object>} - Sync results
   */
  async syncData(force = false) {
    const results = {
      labor: { success: false, updated: false },
      materials: { success: false, updated: false }
    };
    
    // Only sync if online
    if (!this.apiManager.onlineStatus && !force) {
      console.log('Skipping sync while offline');
      return results;
    }
    
    // Sync labor data
    try {
      const newLaborData = await this.apiManager.fetchData('labor', force);
      
      if (this.hasDataChanged(this.laborData, newLaborData)) {
        this.laborData = newLaborData;
        results.labor.updated = true;
        this.onDataUpdate('labor', newLaborData);
      }
      
      this.lastSyncTime.labor = Date.now();
      results.labor.success = true;
    } catch (error) {
      console.error('Error syncing labor data:', error);
      results.labor.error = error.message;
    }
    
    // Sync materials data
    try {
      const newMaterialsData = await this.apiManager.fetchData('materials', force);
      
      if (this.hasDataChanged(this.materialsData, newMaterialsData)) {
        this.materialsData = newMaterialsData;
        results.materials.updated = true;
        this.onDataUpdate('materials', newMaterialsData);
      }
      
      this.lastSyncTime.materials = Date.now();
      results.materials.success = true;
    } catch (error) {
      console.error('Error syncing materials data:', error);
      results.materials.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Check if data has changed
   * @param {Array|Object} oldData - The old data
   * @param {Array|Object} newData - The new data
   * @returns {boolean} - Whether the data has changed
   */
  hasDataChanged(oldData, newData) {
    if (!oldData || !newData) {
      return true;
    }
    
    // Simple length check for arrays
    if (Array.isArray(oldData) && Array.isArray(newData)) {
      if (oldData.length !== newData.length) {
        return true;
      }
    }
    
    // Deep comparison would be more accurate but more expensive
    // For simplicity, we'll use JSON stringify comparison
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  }
  
  /**
   * Get labor data
   * @returns {Array} - Labor data
   */
  getLaborData() {
    return this.laborData || [];
  }
  
  /**
   * Get materials data
   * @returns {Array} - Materials data
   */
  getMaterialsData() {
    return this.materialsData || [];
  }
  
  /**
   * Set callback for data updates
   * @param {Function} callback - The callback function
   */
  setDataUpdateCallback(callback) {
    if (typeof callback === 'function') {
      this.onDataUpdate = callback;
    }
  }
  
  /**
   * Force refresh all data
   * @returns {Promise<Object>} - Refresh results
   */
  async forceRefresh() {
    return this.syncData(true);
  }
  
  /**
   * Get time since last sync
   * @param {string} type - The data type ('labor' or 'materials')
   * @returns {number} - Time in milliseconds since last sync
   */
  getTimeSinceLastSync(type) {
    if (!this.lastSyncTime[type]) {
      return Infinity;
    }
    
    return Date.now() - this.lastSyncTime[type];
  }
}

class QuoteSubmissionManager {
  constructor(apiManager) {
    this.apiManager = apiManager;
    this.pendingQuotes = [];
    this.loadPendingQuotes();
  }
  
  /**
   * Load pending quotes from localStorage
   */
  loadPendingQuotes() {
    try {
      const pendingQuotes = localStorage.getItem('pending_quotes');
      
      if (pendingQuotes) {
        this.pendingQuotes = JSON.parse(pendingQuotes);
      }
    } catch (error) {
      console.error('Error loading pending quotes:', error);
      this.pendingQuotes = [];
    }
  }
  
  /**
   * Save pending quotes to localStorage
   */
  savePendingQuotes() {
    try {
      localStorage.setItem('pending_quotes', JSON.stringify(this.pendingQuotes));
    } catch (error) {
      console.error('Error saving pending quotes:', error);
    }
  }
  
  /**
   * Submit a quote
   * @param {Object} quoteData - The quote data to submit
   * @returns {Promise<Object>} - Submission result
   */
  async submitQuote(quoteData) {
    try {
      // Add timestamp
      const quote = {
        ...quoteData,
        createdAt: new Date().toISOString()
      };
      
      // Try to submit to API
      if (this.apiManager.onlineStatus) {
        try {
          const result = await this.apiManager.submitData('quotes', quote);
          return {
            success: true,
            online: true,
            quoteId: result.quoteId || null,
            quote: quote
          };
        } catch (error) {
          console.warn('Error submitting quote to API, saving locally:', error);
          
          // Save locally
          this.addPendingQuote(quote);
          
          return {
            success: true,
            online: false,
            pending: true,
            quote: quote
          };
        }
      } else {
        // Save locally
        this.addPendingQuote(quote);
        
        return {
          success: true,
          online: false,
          pending: true,
          quote: quote
        };
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Add a quote to pending quotes
   * @param {Object} quote - The quote to add
   */
  addPendingQuote(quote) {
    this.pendingQuotes.push(quote);
    this.savePendingQuotes();
  }
  
  /**
   * Get pending quotes
   * @returns {Array} - Pending quotes
   */
  getPendingQuotes() {
    return [...this.pendingQuotes];
  }
  
  /**
   * Submit pending quotes
   * @returns {Promise<Object>} - Submission results
   */
  async submitPendingQuotes() {
    if (!this.apiManager.onlineStatus) {
      return {
        success: false,
        message: 'Cannot submit quotes while offline',
        submitted: 0,
        total: this.pendingQuotes.length
      };
    }
    
    if (this.pendingQuotes.length === 0) {
      return {
        success: true,
        message: 'No pending quotes to submit',
        submitted: 0,
        total: 0
      };
    }
    
    const results = {
      success: true,
      submitted: 0,
      failed: 0,
      total: this.pendingQuotes.length,
      quotes: []
    };
    
    const newPendingQuotes = [];
    
    for (const quote of this.pendingQuotes) {
      try {
        const result = await this.apiManager.submitData('quotes', quote);
        
        results.submitted++;
        results.quotes.push({
          success: true,
          quoteId: result.quoteId || null,
          quote: quote
        });
      } catch (error) {
        console.error('Error submitting pending quote:', error);
        
        results.failed++;
        newPendingQuotes.push(quote);
        
        results.quotes.push({
          success: false,
          error: error.message,
          quote: quote
        });
      }
    }
    
    this.pendingQuotes = newPendingQuotes;
    this.savePendingQuotes();
    
    results.message = `Submitted ${results.submitted} of ${results.total} quotes`;
    
    return results;
  }
  
  /**
   * Clear pending quotes
   */
  clearPendingQuotes() {
    this.pendingQuotes = [];
    this.savePendingQuotes();
  }
}

// Export the module
export {
  APIConnectionManager,
  DataSyncManager,
  QuoteSubmissionManager
};
