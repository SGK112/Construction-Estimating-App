/**
 * MongoDB Image Integration Module for Construction Estimator Platform
 * 
 * This module provides integration with MongoDB for image management,
 * enabling seamless image retrieval and storage for the estimator platform.
 */

const mongoose = require('mongoose');

class MongoDBImageModule {
  constructor(options = {}) {
    // Configuration
    this.config = {
      mongodbUri: options.mongodbUri || process.env.MONGODB_URI || '',
      collectionName: options.collectionName || 'images',
      cloudinaryConfig: options.cloudinaryConfig || {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || ''
      },
      connectionOptions: options.connectionOptions || {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000 // 5 seconds
      },
      cacheExpiration: options.cacheExpiration || 300000, // 5 minutes
      defaultImageUrl: options.defaultImageUrl || '/assets/images/no-image.jpg',
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000 // 1 second
    };
    
    // Validate required configuration
    if (!this.config.mongodbUri) {
      console.warn('MongoDB URI not provided. Integration will be disabled.');
    }
    
    // Connection status
    this.connectionStatus = {
      connected: false,
      lastError: null,
      lastConnection: null
    };
    
    // Image cache
    this.imageCache = new Map();
    
    // Initialize event listeners
    this.eventListeners = {
      'connection:established': [],
      'connection:failed': [],
      'connection:closed': [],
      'image:fetched': [],
      'image:notFound': [],
      'image:cached': [],
      'image:error': []
    };
    
    // Initialize MongoDB connection if URI is provided
    if (this.config.mongodbUri) {
      this.initConnection();
    }
    
    // Initialize Cloudinary if configured
    if (this.isCloudinaryConfigured()) {
      this.initCloudinary();
    }
  }
  
  /**
   * Initialize MongoDB connection
   * @returns {Promise<boolean>} Connection status
   */
  async initConnection() {
    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        this.connectionStatus.connected = true;
        this.connectionStatus.lastConnection = new Date().toISOString();
        return true;
      }
      
      // Connect to MongoDB
      await mongoose.connect(this.config.mongodbUri, this.config.connectionOptions);
      
      // Update connection status
      this.connectionStatus.connected = true;
      this.connectionStatus.lastConnection = new Date().toISOString();
      this.connectionStatus.lastError = null;
      
      // Set up connection event listeners
      mongoose.connection.on('disconnected', () => {
        this.connectionStatus.connected = false;
        this.emitEvent('connection:closed', {
          timestamp: new Date().toISOString()
        });
      });
      
      mongoose.connection.on('error', (err) => {
        this.connectionStatus.lastError = err.message;
        this.emitEvent('connection:failed', {
          error: err.message,
          timestamp: new Date().toISOString()
        });
      });
      
      // Emit connection established event
      this.emitEvent('connection:established', {
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      // Update connection status
      this.connectionStatus.connected = false;
      this.connectionStatus.lastError = error.message;
      
      // Emit connection failed event
      this.emitEvent('connection:failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error('MongoDB connection error:', error);
      return false;
    }
  }
  
  /**
   * Initialize Cloudinary
   * @returns {boolean} Initialization status
   */
  initCloudinary() {
    try {
      // In a real app, this would initialize the Cloudinary SDK
      // For this example, we'll just return true
      return true;
    } catch (error) {
      console.error('Cloudinary initialization error:', error);
      return false;
    }
  }
  
  /**
   * Check if module is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!this.config.mongodbUri;
  }
  
  /**
   * Check if Cloudinary is properly configured
   * @returns {boolean} Configuration status
   */
  isCloudinaryConfigured() {
    return !!(
      this.config.cloudinaryConfig.cloudName &&
      this.config.cloudinaryConfig.apiKey &&
      this.config.cloudinaryConfig.apiSecret
    );
  }
  
  /**
   * Get image by color name
   * @param {string} colorName - Color name
   * @returns {Promise<Object>} Image data
   */
  async getImageByColorName(colorName) {
    // Check if module is configured
    if (!this.isConfigured()) {
      return this.getDefaultImage('Module not configured');
    }
    
    // Check if connection is established
    if (!this.connectionStatus.connected) {
      try {
        await this.initConnection();
      } catch (error) {
        return this.getDefaultImage(`Connection failed: ${error.message}`);
      }
    }
    
    // Check cache first
    const cacheKey = `color:${colorName}`;
    if (this.imageCache.has(cacheKey)) {
      const cachedImage = this.imageCache.get(cacheKey);
      if (this.isCacheValid(cachedImage)) {
        // Emit image cached event
        this.emitEvent('image:cached', {
          colorName,
          timestamp: new Date().toISOString()
        });
        
        return cachedImage.data;
      }
    }
    
    try {
      // Define Image model if not already defined
      const Image = this.getImageModel();
      
      // Query for image
      const image = await Image.findOne({
        colorName: { $regex: `^${colorName}$`, $options: 'i' }
      }).exec();
      
      if (!image) {
        // Emit image not found event
        this.emitEvent('image:notFound', {
          colorName,
          timestamp: new Date().toISOString()
        });
        
        return this.getDefaultImage('Image not found');
      }
      
      // Prepare image data
      const imageData = {
        id: image._id.toString(),
        colorName: image.colorName,
        imageUrl: image.imageUrl,
        metadata: image.metadata || {}
      };
      
      // Cache image data
      this.cacheImage(cacheKey, imageData);
      
      // Emit image fetched event
      this.emitEvent('image:fetched', {
        colorName,
        imageId: imageData.id,
        timestamp: new Date().toISOString()
      });
      
      return imageData;
    } catch (error) {
      // Emit image error event
      this.emitEvent('image:error', {
        colorName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error(`Error fetching image for ${colorName}:`, error);
      return this.getDefaultImage(`Error: ${error.message}`);
    }
  }
  
  /**
   * Get image by ID
   * @param {string} imageId - Image ID
   * @returns {Promise<Object>} Image data
   */
  async getImageById(imageId) {
    // Check if module is configured
    if (!this.isConfigured()) {
      return this.getDefaultImage('Module not configured');
    }
    
    // Check if connection is established
    if (!this.connectionStatus.connected) {
      try {
        await this.initConnection();
      } catch (error) {
        return this.getDefaultImage(`Connection failed: ${error.message}`);
      }
    }
    
    // Check cache first
    const cacheKey = `id:${imageId}`;
    if (this.imageCache.has(cacheKey)) {
      const cachedImage = this.imageCache.get(cacheKey);
      if (this.isCacheValid(cachedImage)) {
        return cachedImage.data;
      }
    }
    
    try {
      // Define Image model if not already defined
      const Image = this.getImageModel();
      
      // Query for image
      const image = await Image.findById(imageId).exec();
      
      if (!image) {
        return this.getDefaultImage('Image not found');
      }
      
      // Prepare image data
      const imageData = {
        id: image._id.toString(),
        colorName: image.colorName,
        imageUrl: image.imageUrl,
        metadata: image.metadata || {}
      };
      
      // Cache image data
      this.cacheImage(cacheKey, imageData);
      
      return imageData;
    } catch (error) {
      console.error(`Error fetching image ${imageId}:`, error);
      return this.getDefaultImage(`Error: ${error.message}`);
    }
  }
  
  /**
   * Search images
   * @param {Object} query - Search query
   * @returns {Promise<Array>} Matching images
   */
  async searchImages(query = {}) {
    // Check if module is configured
    if (!this.isConfigured()) {
      return [];
    }
    
    // Check if connection is established
    if (!this.connectionStatus.connected) {
      try {
        await this.initConnection();
      } catch (error) {
        return [];
      }
    }
    
    try {
      // Define Image model if not already defined
      const Image = this.getImageModel();
      
      // Build MongoDB query
      const mongoQuery = {};
      
      if (query.colorName) {
        mongoQuery.colorName = { $regex: query.colorName, $options: 'i' };
      }
      
      if (query.metadata) {
        for (const [key, value] of Object.entries(query.metadata)) {
          mongoQuery[`metadata.${key}`] = value;
        }
      }
      
      // Execute query
      const images = await Image.find(mongoQuery)
        .limit(query.limit || 100)
        .exec();
      
      // Map results
      return images.map(image => ({
        id: image._id.toString(),
        colorName: image.colorName,
        imageUrl: image.imageUrl,
        metadata: image.metadata || {}
      }));
    } catch (error) {
      console.error('Error searching images:', error);
      return [];
    }
  }
  
  /**
   * Upload image to Cloudinary
   * @param {Object} imageData - Image data
   * @returns {Promise<Object>} Upload result
   */
  async uploadImageToCloudinary(imageData) {
    // Check if Cloudinary is configured
    if (!this.isCloudinaryConfigured()) {
      throw new Error('Cloudinary not configured');
    }
    
    try {
      // In a real app, this would upload to Cloudinary
      // For this example, we'll just return a mock result
      return {
        public_id: `sample_${Date.now()}`,
        secure_url: imageData.imageUrl || 'https://example.com/sample.jpg',
        format: 'jpg',
        width: 800,
        height: 600
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }
  
  /**
   * Save image to MongoDB
   * @param {Object} imageData - Image data
   * @returns {Promise<Object>} Saved image
   */
  async saveImage(imageData) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Check if connection is established
    if (!this.connectionStatus.connected) {
      await this.initConnection();
    }
    
    // Validate required fields
    if (!imageData.colorName || !imageData.imageUrl) {
      throw new Error('Color name and image URL are required');
    }
    
    try {
      // Define Image model if not already defined
      const Image = this.getImageModel();
      
      // Check if image already exists
      const existingImage = await Image.findOne({
        colorName: { $regex: `^${imageData.colorName}$`, $options: 'i' }
      }).exec();
      
      if (existingImage) {
        // Update existing image
        existingImage.imageUrl = imageData.imageUrl;
        
        if (imageData.metadata) {
          existingImage.metadata = {
            ...existingImage.metadata,
            ...imageData.metadata
          };
        }
        
        await existingImage.save();
        
        // Clear cache
        this.clearImageCache(`color:${imageData.colorName}`);
        this.clearImageCache(`id:${existingImage._id.toString()}`);
        
        return {
          id: existingImage._id.toString(),
          colorName: existingImage.colorName,
          imageUrl: existingImage.imageUrl,
          metadata: existingImage.metadata || {},
          updated: true
        };
      } else {
        // Create new image
        const newImage = new Image({
          colorName: imageData.colorName,
          imageUrl: imageData.imageUrl,
          metadata: imageData.metadata || {}
        });
        
        await newImage.save();
        
        return {
          id: newImage._id.toString(),
          colorName: newImage.colorName,
          imageUrl: newImage.imageUrl,
          metadata: newImage.metadata || {},
          created: true
        };
      }
    } catch (error) {
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }
  
  /**
   * Delete image
   * @param {string} imageId - Image ID
   * @returns {Promise<boolean>} Deletion status
   */
  async deleteImage(imageId) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Check if connection is established
    if (!this.connectionStatus.connected) {
      await this.initConnection();
    }
    
    try {
      // Define Image model if not already defined
      const Image = this.getImageModel();
      
      // Find image to get color name for cache clearing
      const image = await Image.findById(imageId).exec();
      
      if (!image) {
        return false;
      }
      
      // Delete image
      await Image.deleteOne({ _id: imageId }).exec();
      
      // Clear cache
      this.clearImageCache(`id:${imageId}`);
      this.clearImageCache(`color:${image.colorName}`);
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
  
  /**
   * Get default image
   * @param {string} reason - Reason for default image
   * @returns {Object} Default image data
   */
  getDefaultImage(reason = 'Unknown') {
    return {
      id: 'default',
      colorName: 'default',
      imageUrl: this.config.defaultImageUrl,
      metadata: {
        isDefault: true,
        reason
      }
    };
  }
  
  /**
   * Get Image model
   * @returns {Object} Mongoose model
   */
  getImageModel() {
    try {
      // Try to get existing model
      return mongoose.model('Image');
    } catch (e) {
      // Define schema and model
      const ImageSchema = new mongoose.Schema({
        colorName: { type: String, required: true, index: true },
        imageUrl: { type: String, required: true },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
      }, { timestamps: true });
      
      // Add text index for search
      ImageSchema.index({ colorName: 'text' });
      
      // Create and return model
      return mongoose.model('Image', ImageSchema, this.config.collectionName);
    }
  }
  
  /**
   * Cache image data
   * @param {string} key - Cache key
   * @param {Object} data - Image data
   */
  cacheImage(key, data) {
    this.imageCache.set(key, {
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * Clear image cache
   * @param {string} key - Cache key (optional, if not provided, clear all)
   */
  clearImageCache(key = null) {
    if (key) {
      this.imageCache.delete(key);
    } else {
      this.imageCache.clear();
    }
  }
  
  /**
   * Check if cache is valid
   * @param {Object} cachedItem - Cached item
   * @returns {boolean} Cache validity
   */
  isCacheValid(cachedItem) {
    return cachedItem && (Date.now() - cachedItem.timestamp) < this.config.cacheExpiration;
  }
  
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  addEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(listener);
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  removeEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event] = this.eventListeners[event].filter(l => l !== listener);
  }
  
  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitEvent(event, data) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e);
      }
    });
  }
  
  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getConnectionStatus() {
    return { ...this.connectionStatus };
  }
  
  /**
   * Close MongoDB connection
   * @returns {Promise<boolean>} Success status
   */
  async closeConnection() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      
      this.connectionStatus.connected = false;
      
      // Emit connection closed event
      this.emitEvent('connection:closed', {
        timestamp: new Date().toISOString()
      });
      
      return true;
    }
    
    return false;
  }
}

// Example usage:
/*
const mongoDBImageModule = new MongoDBImageModule({
  mongodbUri: 'mongodb+srv://username:password@cluster.mongodb.net/database',
  collectionName: 'images'
});

// Register event listeners
mongoDBImageModule.addEventListener('image:fetched', (data) => {
  console.log(`Image fetched: ${data.colorName}`);
});

// Get image by color name
mongoDBImageModule.getImageByColorName('Black Galaxy').then(image => {
  console.log('Image:', image);
});
*/

// Export the module
module.exports = MongoDBImageModule;
