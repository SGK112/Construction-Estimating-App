/**
 * Shopify Integration Module for Construction Estimator Platform
 * 
 * This module provides integration with Shopify for product catalog synchronization,
 * enabling seamless product data flow between Shopify and the estimator platform.
 */

const axios = require('axios');

class ShopifyIntegrationModule {
  constructor(options = {}) {
    // Configuration
    this.config = {
      shopifyStoreUrl: options.shopifyStoreUrl || process.env.SHOPIFY_STORE_URL || '',
      shopifyAccessToken: options.shopifyAccessToken || process.env.SHOPIFY_ACCESS_TOKEN || '',
      syncInterval: options.syncInterval || 3600000, // 1 hour
      productLimit: options.productLimit || 250,
      enableAutoSync: options.enableAutoSync !== false,
      webhookEndpoint: options.webhookEndpoint || '/api/webhooks/shopify',
      productMapping: options.productMapping || {
        id: 'id',
        title: 'name',
        product_type: 'category',
        tags: 'tags',
        variants: 'variants',
        images: 'images',
        body_html: 'description'
      },
      variantMapping: options.variantMapping || {
        id: 'id',
        price: 'price',
        sku: 'sku',
        inventory_quantity: 'inventory',
        title: 'title',
        option1: 'option1',
        option2: 'option2',
        option3: 'option3'
      },
      defaultCategory: options.defaultCategory || 'Uncategorized',
      includeOutOfStock: options.includeOutOfStock !== false,
      includeArchived: options.includeArchived === true,
      cacheExpiration: options.cacheExpiration || 300000 // 5 minutes
    };
    
    // Validate required configuration
    if (!this.config.shopifyStoreUrl) {
      console.warn('Shopify store URL not provided. Integration will be disabled.');
    }
    
    if (!this.config.shopifyAccessToken) {
      console.warn('Shopify access token not provided. Integration will be disabled.');
    }
    
    // Product cache
    this.productCache = {
      timestamp: 0,
      products: []
    };
    
    // Collection cache
    this.collectionCache = {
      timestamp: 0,
      collections: []
    };
    
    // Sync status
    this.syncStatus = {
      lastSync: null,
      inProgress: false,
      lastError: null,
      stats: {
        total: 0,
        created: 0,
        updated: 0,
        failed: 0
      }
    };
    
    // Initialize event listeners
    this.eventListeners = {
      'sync:started': [],
      'sync:completed': [],
      'sync:failed': [],
      'product:created': [],
      'product:updated': [],
      'product:deleted': [],
      'collection:created': [],
      'collection:updated': [],
      'collection:deleted': [],
      'webhook:received': []
    };
    
    // Start auto sync if enabled
    if (this.config.enableAutoSync && this.isConfigured()) {
      this.startAutoSync();
    }
  }
  
  /**
   * Check if module is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(this.config.shopifyStoreUrl && this.config.shopifyAccessToken);
  }
  
  /**
   * Start automatic synchronization
   * @returns {boolean} Success status
   */
  startAutoSync() {
    if (!this.isConfigured()) {
      return false;
    }
    
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Set up new interval
    this.syncInterval = setInterval(() => {
      this.syncProducts();
    }, this.config.syncInterval);
    
    // Run initial sync
    setTimeout(() => {
      this.syncProducts();
    }, 1000);
    
    return true;
  }
  
  /**
   * Stop automatic synchronization
   * @returns {boolean} Success status
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      return true;
    }
    
    return false;
  }
  
  /**
   * Synchronize products from Shopify
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncProducts(options = {}) {
    // Check if sync is already in progress
    if (this.syncStatus.inProgress) {
      return {
        success: false,
        error: 'Sync already in progress',
        inProgress: true
      };
    }
    
    // Check if module is configured
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Module not configured',
        inProgress: false
      };
    }
    
    // Update sync status
    this.syncStatus.inProgress = true;
    this.syncStatus.lastError = null;
    
    // Reset stats
    this.syncStatus.stats = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0
    };
    
    // Emit sync started event
    this.emitEvent('sync:started', {
      timestamp: new Date().toISOString(),
      options
    });
    
    try {
      // Fetch collections first (for categorization)
      await this.fetchCollections();
      
      // Fetch products
      const products = await this.fetchAllProducts(options);
      
      // Process products
      const results = await this.processProducts(products, options);
      
      // Update sync status
      this.syncStatus.inProgress = false;
      this.syncStatus.lastSync = new Date().toISOString();
      this.syncStatus.stats = results.stats;
      
      // Emit sync completed event
      this.emitEvent('sync:completed', {
        timestamp: new Date().toISOString(),
        stats: results.stats
      });
      
      return {
        success: true,
        stats: results.stats,
        inProgress: false
      };
    } catch (error) {
      // Update sync status
      this.syncStatus.inProgress = false;
      this.syncStatus.lastError = error.message;
      
      // Emit sync failed event
      this.emitEvent('sync:failed', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      return {
        success: false,
        error: error.message,
        inProgress: false
      };
    }
  }
  
  /**
   * Fetch all products from Shopify
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} Products
   */
  async fetchAllProducts(options = {}) {
    const limit = options.limit || this.config.productLimit;
    let page = 1;
    let allProducts = [];
    let hasMore = true;
    
    // Check cache first if not forced refresh
    if (!options.forceRefresh && this.isCacheValid(this.productCache)) {
      return this.productCache.products;
    }
    
    while (hasMore) {
      const response = await this.fetchProducts(page, limit);
      
      if (response.products && response.products.length > 0) {
        allProducts = [...allProducts, ...response.products];
        
        if (response.products.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Update cache
    this.productCache = {
      timestamp: Date.now(),
      products: allProducts
    };
    
    return allProducts;
  }
  
  /**
   * Fetch products from Shopify (paginated)
   * @param {number} page - Page number
   * @param {number} limit - Products per page
   * @returns {Promise<Object>} Shopify response
   */
  async fetchProducts(page = 1, limit = 50) {
    try {
      const response = await axios.get(`https://${this.config.shopifyStoreUrl}/admin/api/2023-04/products.json`, {
        params: {
          limit,
          page
        },
        headers: {
          'X-Shopify-Access-Token': this.config.shopifyAccessToken
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }
  
  /**
   * Fetch collections from Shopify
   * @returns {Promise<Array>} Collections
   */
  async fetchCollections() {
    // Check cache first
    if (this.isCacheValid(this.collectionCache)) {
      return this.collectionCache.collections;
    }
    
    try {
      const response = await axios.get(`https://${this.config.shopifyStoreUrl}/admin/api/2023-04/custom_collections.json`, {
        headers: {
          'X-Shopify-Access-Token': this.config.shopifyAccessToken
        }
      });
      
      // Also fetch smart collections
      const smartResponse = await axios.get(`https://${this.config.shopifyStoreUrl}/admin/api/2023-04/smart_collections.json`, {
        headers: {
          'X-Shopify-Access-Token': this.config.shopifyAccessToken
        }
      });
      
      // Combine collections
      const collections = [
        ...(response.data.custom_collections || []),
        ...(smartResponse.data.smart_collections || [])
      ];
      
      // Update cache
      this.collectionCache = {
        timestamp: Date.now(),
        collections
      };
      
      return collections;
    } catch (error) {
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
  }
  
  /**
   * Process products for synchronization
   * @param {Array} products - Shopify products
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processProducts(products, options = {}) {
    const stats = {
      total: products.length,
      created: 0,
      updated: 0,
      failed: 0
    };
    
    const processedProducts = [];
    
    for (const shopifyProduct of products) {
      try {
        // Map Shopify product to internal format
        const mappedProduct = this.mapShopifyProduct(shopifyProduct);
        
        // Skip products that don't meet criteria
        if (!this.shouldIncludeProduct(mappedProduct, options)) {
          continue;
        }
        
        // Check if product already exists
        const existingProduct = await this.findExistingProduct(mappedProduct.id);
        
        if (existingProduct) {
          // Update existing product
          const updatedProduct = await this.updateProduct(existingProduct.id, mappedProduct);
          processedProducts.push(updatedProduct);
          stats.updated++;
          
          // Emit product updated event
          this.emitEvent('product:updated', {
            productId: updatedProduct.id,
            shopifyId: shopifyProduct.id,
            timestamp: new Date().toISOString()
          });
        } else {
          // Create new product
          const newProduct = await this.createProduct(mappedProduct);
          processedProducts.push(newProduct);
          stats.created++;
          
          // Emit product created event
          this.emitEvent('product:created', {
            productId: newProduct.id,
            shopifyId: shopifyProduct.id,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error processing product ${shopifyProduct.id}:`, error);
        stats.failed++;
      }
    }
    
    return {
      products: processedProducts,
      stats
    };
  }
  
  /**
   * Map Shopify product to internal format
   * @param {Object} shopifyProduct - Shopify product
   * @returns {Object} Mapped product
   */
  mapShopifyProduct(shopifyProduct) {
    const mappedProduct = {};
    
    // Map basic fields
    for (const [shopifyField, internalField] of Object.entries(this.config.productMapping)) {
      if (shopifyField === 'variants' || shopifyField === 'images') {
        continue; // Handle these separately
      }
      
      mappedProduct[internalField] = shopifyProduct[shopifyField];
    }
    
    // Extract HTML description to plain text
    if (shopifyProduct.body_html) {
      mappedProduct.description = this.stripHtml(shopifyProduct.body_html);
    }
    
    // Map variants
    if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
      mappedProduct.variants = shopifyProduct.variants.map(variant => {
        const mappedVariant = {};
        
        for (const [shopifyField, internalField] of Object.entries(this.config.variantMapping)) {
          mappedVariant[internalField] = variant[shopifyField];
        }
        
        // Convert price to number
        if (mappedVariant.price) {
          mappedVariant.price = parseFloat(mappedVariant.price);
        }
        
        // Convert inventory to number
        if (mappedVariant.inventory) {
          mappedVariant.inventory = parseInt(mappedVariant.inventory, 10);
        }
        
        return mappedVariant;
      });
      
      // Use first variant's price as default product price
      mappedProduct.price = parseFloat(shopifyProduct.variants[0].price);
    }
    
    // Map images
    if (shopifyProduct.images && shopifyProduct.images.length > 0) {
      mappedProduct.images = shopifyProduct.images.map(image => ({
        id: image.id,
        url: image.src,
        alt: image.alt || mappedProduct.name,
        position: image.position
      }));
      
      // Set primary image
      mappedProduct.primaryImage = shopifyProduct.images[0].src;
    }
    
    // Add collections/categories
    mappedProduct.collections = [];
    
    // Add metadata
    mappedProduct.metadata = {
      shopifyId: shopifyProduct.id,
      shopifyHandle: shopifyProduct.handle,
      shopifyCreatedAt: shopifyProduct.created_at,
      shopifyUpdatedAt: shopifyProduct.updated_at,
      shopifyPublishedAt: shopifyProduct.published_at,
      shopifyStatus: shopifyProduct.status
    };
    
    // Add vendor
    if (shopifyProduct.vendor) {
      mappedProduct.vendor = shopifyProduct.vendor;
    }
    
    // Add unit
    mappedProduct.unit = 'each'; // Default unit
    
    // Add SKU if available from first variant
    if (shopifyProduct.variants && shopifyProduct.variants.length > 0 && shopifyProduct.variants[0].sku) {
      mappedProduct.sku = shopifyProduct.variants[0].sku;
    }
    
    return mappedProduct;
  }
  
  /**
   * Strip HTML tags from text
   * @param {string} html - HTML text
   * @returns {string} Plain text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>?/gm, '').trim();
  }
  
  /**
   * Check if product should be included in sync
   * @param {Object} product - Mapped product
   * @param {Object} options - Sync options
   * @returns {boolean} Include status
   */
  shouldIncludeProduct(product, options = {}) {
    // Check if product is out of stock and should be excluded
    if (!this.config.includeOutOfStock) {
      const hasStock = product.variants && product.variants.some(variant => variant.inventory > 0);
      if (!hasStock) {
        return false;
      }
    }
    
    // Check if product is archived and should be excluded
    if (!this.config.includeArchived && product.metadata.shopifyStatus === 'archived') {
      return false;
    }
    
    // Check if product matches category filter
    if (options.categories && options.categories.length > 0) {
      if (!options.categories.includes(product.category)) {
        return false;
      }
    }
    
    // Check if product matches vendor filter
    if (options.vendors && options.vendors.length > 0) {
      if (!options.vendors.includes(product.vendor)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Find existing product by Shopify ID
   * @param {string} shopifyId - Shopify product ID
   * @returns {Promise<Object>} Existing product or null
   */
  async findExistingProduct(shopifyId) {
    // In a real app, this would query a database
    // For this example, we'll just return null to simulate a new product
    return null;
  }
  
  /**
   * Create new product
   * @param {Object} product - Mapped product
   * @returns {Promise<Object>} Created product
   */
  async createProduct(product) {
    // In a real app, this would save to a database
    // For this example, we'll just return the product with an ID
    return {
      ...product,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Update existing product
   * @param {string} productId - Product ID
   * @param {Object} product - Updated product data
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(productId, product) {
    // In a real app, this would update a database record
    // For this example, we'll just return the updated product
    return {
      ...product,
      id: productId,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product
   */
  async getProduct(productId) {
    try {
      const response = await axios.get(`https://${this.config.shopifyStoreUrl}/admin/api/2023-04/products/${productId}.json`, {
        headers: {
          'X-Shopify-Access-Token': this.config.shopifyAccessToken
        }
      });
      
      return this.mapShopifyProduct(response.data.product);
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }
  
  /**
   * Search products
   * @param {Object} query - Search query
   * @returns {Promise<Array>} Matching products
   */
  async searchProducts(query = {}) {
    // Ensure products are loaded
    await this.fetchAllProducts();
    
    // Filter products based on query
    return this.productCache.products
      .filter(product => {
        // Filter by title/name
        if (query.title && !product.title.toLowerCase().includes(query.title.toLowerCase())) {
          return false;
        }
        
        // Filter by product type/category
        if (query.product_type && product.product_type !== query.product_type) {
          return false;
        }
        
        // Filter by vendor
        if (query.vendor && product.vendor !== query.vendor) {
          return false;
        }
        
        // Filter by tag
        if (query.tag && (!product.tags || !product.tags.includes(query.tag))) {
          return false;
        }
        
        // Filter by price range
        if (query.price_min || query.price_max) {
          const price = parseFloat(product.variants[0].price);
          
          if (query.price_min && price < parseFloat(query.price_min)) {
            return false;
          }
          
          if (query.price_max && price > parseFloat(query.price_max)) {
            return false;
          }
        }
        
        return true;
      })
      .map(product => this.mapShopifyProduct(product));
  }
  
  /**
   * Get product categories
   * @returns {Promise<Array>} Categories
   */
  async getProductCategories() {
    // Ensure products are loaded
    await this.fetchAllProducts();
    
    // Extract unique categories
    const categories = new Set();
    
    this.productCache.products.forEach(product => {
      if (product.product_type) {
        categories.add(product.product_type);
      }
    });
    
    return Array.from(categories);
  }
  
  /**
   * Get product vendors
   * @returns {Promise<Array>} Vendors
   */
  async getProductVendors() {
    // Ensure products are loaded
    await this.fetchAllProducts();
    
    // Extract unique vendors
    const vendors = new Set();
    
    this.productCache.products.forEach(product => {
      if (product.vendor) {
        vendors.add(product.vendor);
      }
    });
    
    return Array.from(vendors);
  }
  
  /**
   * Handle Shopify webhook
   * @param {Object} webhook - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhook(webhook) {
    // Validate webhook
    if (!webhook || !webhook.topic || !webhook.domain || !webhook.data) {
      throw new Error('Invalid webhook data');
    }
    
    // Emit webhook received event
    this.emitEvent('webhook:received', {
      topic: webhook.topic,
      domain: webhook.domain,
      timestamp: new Date().toISOString()
    });
    
    // Process webhook based on topic
    switch (webhook.topic) {
      case 'products/create':
        return this.handleProductCreate(webhook.data);
      
      case 'products/update':
        return this.handleProductUpdate(webhook.data);
      
      case 'products/delete':
        return this.handleProductDelete(webhook.data);
      
      case 'collections/create':
        return this.handleCollectionCreate(webhook.data);
      
      case 'collections/update':
        return this.handleCollectionUpdate(webhook.data);
      
      case 'collections/delete':
        return this.handleCollectionDelete(webhook.data);
      
      default:
        return {
          success: false,
          message: `Unsupported webhook topic: ${webhook.topic}`
        };
    }
  }
  
  /**
   * Handle product create webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleProductCreate(data) {
    try {
      // Map product
      const mappedProduct = this.mapShopifyProduct(data);
      
      // Create product
      const newProduct = await this.createProduct(mappedProduct);
      
      // Emit product created event
      this.emitEvent('product:created', {
        productId: newProduct.id,
        shopifyId: data.id,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate cache
      this.productCache.timestamp = 0;
      
      return {
        success: true,
        productId: newProduct.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle product update webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleProductUpdate(data) {
    try {
      // Find existing product
      const existingProduct = await this.findExistingProduct(data.id);
      
      if (!existingProduct) {
        return this.handleProductCreate(data);
      }
      
      // Map product
      const mappedProduct = this.mapShopifyProduct(data);
      
      // Update product
      const updatedProduct = await this.updateProduct(existingProduct.id, mappedProduct);
      
      // Emit product updated event
      this.emitEvent('product:updated', {
        productId: updatedProduct.id,
        shopifyId: data.id,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate cache
      this.productCache.timestamp = 0;
      
      return {
        success: true,
        productId: updatedProduct.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle product delete webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleProductDelete(data) {
    try {
      // Find existing product
      const existingProduct = await this.findExistingProduct(data.id);
      
      if (!existingProduct) {
        return {
          success: false,
          error: 'Product not found'
        };
      }
      
      // In a real app, this would delete from database or mark as deleted
      
      // Emit product deleted event
      this.emitEvent('product:deleted', {
        productId: existingProduct.id,
        shopifyId: data.id,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate cache
      this.productCache.timestamp = 0;
      
      return {
        success: true,
        productId: existingProduct.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle collection create webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleCollectionCreate(data) {
    // Invalidate collection cache
    this.collectionCache.timestamp = 0;
    
    // Emit collection created event
    this.emitEvent('collection:created', {
      collectionId: data.id,
      title: data.title,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      collectionId: data.id
    };
  }
  
  /**
   * Handle collection update webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleCollectionUpdate(data) {
    // Invalidate collection cache
    this.collectionCache.timestamp = 0;
    
    // Emit collection updated event
    this.emitEvent('collection:updated', {
      collectionId: data.id,
      title: data.title,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      collectionId: data.id
    };
  }
  
  /**
   * Handle collection delete webhook
   * @param {Object} data - Webhook data
   * @returns {Promise<Object>} Processing result
   */
  async handleCollectionDelete(data) {
    // Invalidate collection cache
    this.collectionCache.timestamp = 0;
    
    // Emit collection deleted event
    this.emitEvent('collection:deleted', {
      collectionId: data.id,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      collectionId: data.id
    };
  }
  
  /**
   * Check if cache is valid
   * @param {Object} cache - Cache object
   * @returns {boolean} Cache validity
   */
  isCacheValid(cache) {
    return cache.timestamp > 0 && (Date.now() - cache.timestamp) < this.config.cacheExpiration;
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
   * Get sync status
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    return { ...this.syncStatus };
  }
}

// Example usage:
/*
const shopifyIntegration = new ShopifyIntegrationModule({
  shopifyStoreUrl: 'your-store.myshopify.com',
  shopifyAccessToken: 'your-access-token'
});

// Register event listeners
shopifyIntegration.addEventListener('sync:completed', (data) => {
  console.log(`Sync completed: ${data.stats.created} created, ${data.stats.updated} updated`);
});

// Start sync
shopifyIntegration.syncProducts().then(result => {
  console.log('Sync result:', result);
});
*/

// Export the module
module.exports = ShopifyIntegrationModule;
