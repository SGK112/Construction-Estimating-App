/**
 * Stripe Payment Integration Module for Construction Estimator Platform
 * 
 * This module provides integration with Stripe for payment processing,
 * enabling secure checkout flows and payment management for construction projects.
 */

const stripe = require('stripe');

class StripePaymentModule {
  constructor(options = {}) {
    // Configuration
    this.config = {
      stripeSecretKey: options.stripeSecretKey || process.env.STRIPE_SECERET_KEY || '',
      stripePublicKey: options.stripePublicKey || process.env.STRIPE_PUBLIC_KEY || '',
      webhookSecret: options.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
      currency: options.currency || 'usd',
      paymentMethods: options.paymentMethods || ['card'],
      successUrl: options.successUrl || '/checkout/success',
      cancelUrl: options.cancelUrl || '/checkout/cancel',
      paymentIntentSuccessUrl: options.paymentIntentSuccessUrl || '/payment/success',
      paymentIntentCancelUrl: options.paymentIntentCancelUrl || '/payment/cancel',
      enableAutomaticTax: options.enableAutomaticTax !== false,
      taxRates: options.taxRates || {},
      allowPartialPayments: options.allowPartialPayments === true,
      minimumPaymentPercentage: options.minimumPaymentPercentage || 25,
      paymentScheduleOptions: options.paymentScheduleOptions || [
        { name: 'Full Payment', value: 100 },
        { name: 'Deposit (50%)', value: 50 },
        { name: 'Deposit (25%)', value: 25 }
      ],
      metadata: options.metadata || {}
    };
    
    // Validate required configuration
    if (!this.config.stripeSecretKey) {
      console.warn('Stripe secret key not provided. Integration will be disabled.');
    }
    
    // Initialize Stripe client
    if (this.isConfigured()) {
      this.stripe = stripe(this.config.stripeSecretKey);
    } else {
      this.stripe = null;
    }
    
    // Payment cache
    this.paymentCache = new Map();
    
    // Initialize event listeners
    this.eventListeners = {
      'payment:created': [],
      'payment:succeeded': [],
      'payment:failed': [],
      'payment:refunded': [],
      'checkout:created': [],
      'checkout:succeeded': [],
      'checkout:failed': [],
      'webhook:received': [],
      'customer:created': [],
      'customer:updated': []
    };
  }
  
  /**
   * Check if module is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!this.config.stripeSecretKey;
  }
  
  /**
   * Create a Stripe checkout session
   * @param {Object} options - Checkout options
   * @returns {Promise<Object>} Checkout session
   */
  async createCheckoutSession(options) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Validate required fields
    if (!options.items || !options.items.length) {
      throw new Error('Items are required');
    }
    
    try {
      // Prepare line items
      const lineItems = options.items.map(item => ({
        price_data: {
          currency: this.config.currency,
          product_data: {
            name: item.name,
            description: item.description || '',
            images: item.images || [],
            metadata: {
              productId: item.productId || '',
              sku: item.sku || '',
              ...item.metadata
            }
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
          tax_behavior: 'exclusive'
        },
        quantity: item.quantity || 1,
        adjustable_quantity: item.adjustableQuantity ? {
          enabled: true,
          minimum: item.minimumQuantity || 1,
          maximum: item.maximumQuantity || 10
        } : undefined
      }));
      
      // Prepare checkout session parameters
      const sessionParams = {
        payment_method_types: this.config.paymentMethods,
        line_items: lineItems,
        mode: 'payment',
        success_url: options.successUrl || this.config.successUrl,
        cancel_url: options.cancelUrl || this.config.cancelUrl,
        customer_email: options.customerEmail,
        client_reference_id: options.referenceId || '',
        metadata: {
          projectId: options.projectId || '',
          customerId: options.customerId || '',
          ...this.config.metadata,
          ...options.metadata
        }
      };
      
      // Add shipping options if provided
      if (options.shipping) {
        sessionParams.shipping_options = options.shipping.map(option => ({
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: Math.round(option.price * 100), // Convert to cents
              currency: this.config.currency
            },
            display_name: option.name,
            delivery_estimate: option.deliveryEstimate
          }
        }));
      }
      
      // Add automatic tax calculation if enabled
      if (this.config.enableAutomaticTax) {
        sessionParams.automatic_tax = { enabled: true };
      }
      
      // Add tax rates if provided
      if (options.taxRates && options.taxRates.length) {
        lineItems.forEach(item => {
          item.tax_rates = options.taxRates;
        });
      }
      
      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(sessionParams);
      
      // Emit checkout created event
      this.emitEvent('checkout:created', {
        sessionId: session.id,
        amount: session.amount_total / 100, // Convert from cents
        currency: session.currency,
        customerId: options.customerId,
        projectId: options.projectId,
        timestamp: new Date().toISOString()
      });
      
      return session;
    } catch (error) {
      // Emit checkout failed event
      this.emitEvent('checkout:failed', {
        error: error.message,
        customerId: options.customerId,
        projectId: options.projectId,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }
  
  /**
   * Create a payment intent
   * @param {Object} options - Payment options
   * @returns {Promise<Object>} Payment intent
   */
  async createPaymentIntent(options) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Validate required fields
    if (!options.amount) {
      throw new Error('Amount is required');
    }
    
    try {
      // Prepare payment intent parameters
      const paymentIntentParams = {
        amount: Math.round(options.amount * 100), // Convert to cents
        currency: options.currency || this.config.currency,
        payment_method_types: options.paymentMethods || this.config.paymentMethods,
        description: options.description || '',
        receipt_email: options.customerEmail,
        metadata: {
          projectId: options.projectId || '',
          customerId: options.customerId || '',
          paymentType: options.paymentType || 'full',
          ...this.config.metadata,
          ...options.metadata
        }
      };
      
      // Add customer if provided
      if (options.customerId) {
        const customer = await this.getOrCreateCustomer({
          email: options.customerEmail,
          name: options.customerName,
          phone: options.customerPhone,
          metadata: {
            projectId: options.projectId
          }
        });
        
        paymentIntentParams.customer = customer.id;
      }
      
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
      
      // Emit payment created event
      this.emitEvent('payment:created', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        customerId: options.customerId,
        projectId: options.projectId,
        timestamp: new Date().toISOString()
      });
      
      return paymentIntent;
    } catch (error) {
      // Emit payment failed event
      this.emitEvent('payment:failed', {
        error: error.message,
        amount: options.amount,
        customerId: options.customerId,
        projectId: options.projectId,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }
  
  /**
   * Get or create a Stripe customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Stripe customer
   */
  async getOrCreateCustomer(customerData) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Validate required fields
    if (!customerData.email) {
      throw new Error('Customer email is required');
    }
    
    try {
      // Search for existing customer
      const customers = await this.stripe.customers.list({
        email: customerData.email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        // Update existing customer
        const customer = await this.stripe.customers.update(
          customers.data[0].id,
          {
            name: customerData.name,
            phone: customerData.phone,
            metadata: {
              ...customers.data[0].metadata,
              ...customerData.metadata
            }
          }
        );
        
        // Emit customer updated event
        this.emitEvent('customer:updated', {
          customerId: customer.id,
          email: customer.email,
          timestamp: new Date().toISOString()
        });
        
        return customer;
      } else {
        // Create new customer
        const customer = await this.stripe.customers.create({
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone,
          metadata: customerData.metadata
        });
        
        // Emit customer created event
        this.emitEvent('customer:created', {
          customerId: customer.id,
          email: customer.email,
          timestamp: new Date().toISOString()
        });
        
        return customer;
      }
    } catch (error) {
      throw new Error(`Failed to get or create customer: ${error.message}`);
    }
  }
  
  /**
   * Get payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent
   */
  async getPaymentIntent(paymentIntentId) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      throw new Error(`Failed to get payment intent: ${error.message}`);
    }
  }
  
  /**
   * Get checkout session
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<Object>} Checkout session
   */
  async getCheckoutSession(sessionId) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      throw new Error(`Failed to get checkout session: ${error.message}`);
    }
  }
  
  /**
   * Refund payment
   * @param {Object} options - Refund options
   * @returns {Promise<Object>} Refund
   */
  async refundPayment(options) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Validate required fields
    if (!options.paymentIntentId && !options.chargeId) {
      throw new Error('Payment intent ID or charge ID is required');
    }
    
    try {
      // Prepare refund parameters
      const refundParams = {
        payment_intent: options.paymentIntentId,
        charge: options.chargeId,
        amount: options.amount ? Math.round(options.amount * 100) : undefined, // Convert to cents if partial refund
        reason: options.reason || 'requested_by_customer',
        metadata: {
          projectId: options.projectId || '',
          customerId: options.customerId || '',
          refundReason: options.reason || 'requested_by_customer',
          ...options.metadata
        }
      };
      
      // Create refund
      const refund = await this.stripe.refunds.create(refundParams);
      
      // Emit payment refunded event
      this.emitEvent('payment:refunded', {
        refundId: refund.id,
        paymentIntentId: options.paymentIntentId,
        amount: refund.amount / 100, // Convert from cents
        reason: options.reason,
        customerId: options.customerId,
        projectId: options.projectId,
        timestamp: new Date().toISOString()
      });
      
      return refund;
    } catch (error) {
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }
  
  /**
   * Create a payment schedule
   * @param {Object} options - Schedule options
   * @returns {Promise<Array>} Payment schedule
   */
  async createPaymentSchedule(options) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Validate required fields
    if (!options.projectId || !options.totalAmount || !options.payments || !options.payments.length) {
      throw new Error('Project ID, total amount, and payments are required');
    }
    
    // Validate payment schedule
    const totalPercentage = options.payments.reduce((sum, payment) => sum + payment.percentage, 0);
    if (totalPercentage !== 100) {
      throw new Error('Payment percentages must add up to 100%');
    }
    
    try {
      const schedule = [];
      
      // Create payment intents for each payment
      for (const payment of options.payments) {
        const amount = (options.totalAmount * payment.percentage) / 100;
        
        // Skip zero amount payments
        if (amount <= 0) {
          continue;
        }
        
        // Create payment intent for future payment
        const paymentIntent = await this.createPaymentIntent({
          amount,
          currency: options.currency || this.config.currency,
          description: payment.description || `Payment ${payment.index + 1} of ${options.payments.length}`,
          customerEmail: options.customerEmail,
          customerName: options.customerName,
          customerPhone: options.customerPhone,
          customerId: options.customerId,
          projectId: options.projectId,
          paymentType: 'scheduled',
          metadata: {
            scheduleId: options.scheduleId || `schedule_${Date.now()}`,
            paymentIndex: payment.index,
            paymentPercentage: payment.percentage,
            dueDate: payment.dueDate,
            ...payment.metadata
          }
        });
        
        schedule.push({
          paymentIntentId: paymentIntent.id,
          amount,
          percentage: payment.percentage,
          dueDate: payment.dueDate,
          description: payment.description,
          status: 'pending'
        });
      }
      
      return schedule;
    } catch (error) {
      throw new Error(`Failed to create payment schedule: ${error.message}`);
    }
  }
  
  /**
   * Calculate payment options
   * @param {Object} options - Calculation options
   * @returns {Object} Payment options
   */
  calculatePaymentOptions(options) {
    // Validate required fields
    if (!options.totalAmount) {
      throw new Error('Total amount is required');
    }
    
    const totalAmount = parseFloat(options.totalAmount);
    const result = {
      totalAmount,
      options: []
    };
    
    // Calculate payment options based on configuration
    for (const option of this.config.paymentScheduleOptions) {
      const percentage = option.value;
      const initialPayment = (totalAmount * percentage) / 100;
      const remainingAmount = totalAmount - initialPayment;
      
      result.options.push({
        name: option.name,
        percentage,
        initialPayment,
        remainingAmount: percentage < 100 ? remainingAmount : 0,
        isFullPayment: percentage === 100
      });
    }
    
    return result;
  }
  
  /**
   * Handle Stripe webhook
   * @param {Object} event - Webhook event
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhook(event) {
    // Check if module is configured
    if (!this.isConfigured()) {
      throw new Error('Module not configured');
    }
    
    // Emit webhook received event
    this.emitEvent('webhook:received', {
      type: event.type,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Process webhook based on event type
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(event.data.object);
        
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object);
        
        case 'charge.refunded':
          return await this.handleChargeRefunded(event.data.object);
        
        default:
          return {
            success: true,
            message: `Unhandled event type: ${event.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle checkout session completed webhook
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Processing result
   */
  async handleCheckoutSessionCompleted(session) {
    // Extract metadata
    const projectId = session.metadata?.projectId;
    const customerId = session.metadata?.customerId;
    
    // Emit checkout succeeded event
    this.emitEvent('checkout:succeeded', {
      sessionId: session.id,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      customerId,
      projectId,
      timestamp: new Date().toISOString()
    });
    
    // In a real app, this would update the project status, record payment, etc.
    
    return {
      success: true,
      sessionId: session.id,
      amount: session.amount_total / 100,
      customerId,
      projectId
    };
  }
  
  /**
   * Handle payment intent succeeded webhook
   * @param {Object} paymentIntent - Payment intent
   * @returns {Promise<Object>} Processing result
   */
  async handlePaymentIntentSucceeded(paymentIntent) {
    // Extract metadata
    const projectId = paymentIntent.metadata?.projectId;
    const customerId = paymentIntent.metadata?.customerId;
    
    // Emit payment succeeded event
    this.emitEvent('payment:succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      customerId,
      projectId,
      timestamp: new Date().toISOString()
    });
    
    // In a real app, this would update the project status, record payment, etc.
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      customerId,
      projectId
    };
  }
  
  /**
   * Handle payment intent failed webhook
   * @param {Object} paymentIntent - Payment intent
   * @returns {Promise<Object>} Processing result
   */
  async handlePaymentIntentFailed(paymentIntent) {
    // Extract metadata
    const projectId = paymentIntent.metadata?.projectId;
    const customerId = paymentIntent.metadata?.customerId;
    
    // Get error message
    const error = paymentIntent.last_payment_error?.message || 'Unknown error';
    
    // Emit payment failed event
    this.emitEvent('payment:failed', {
      paymentIntentId: paymentIntent.id,
      error,
      amount: paymentIntent.amount / 100, // Convert from cents
      customerId,
      projectId,
      timestamp: new Date().toISOString()
    });
    
    // In a real app, this would update the project status, notify customer, etc.
    
    return {
      success: false,
      paymentIntentId: paymentIntent.id,
      error,
      customerId,
      projectId
    };
  }
  
  /**
   * Handle charge refunded webhook
   * @param {Object} charge - Charge
   * @returns {Promise<Object>} Processing result
   */
  async handleChargeRefunded(charge) {
    // Get payment intent
    const paymentIntentId = charge.payment_intent;
    let projectId, customerId;
    
    if (paymentIntentId) {
      try {
        const paymentIntent = await this.getPaymentIntent(paymentIntentId);
        projectId = paymentIntent.metadata?.projectId;
        customerId = paymentIntent.metadata?.customerId;
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
      }
    }
    
    // Emit payment refunded event
    this.emitEvent('payment:refunded', {
      chargeId: charge.id,
      paymentIntentId,
      amount: charge.amount_refunded / 100, // Convert from cents
      customerId,
      projectId,
      timestamp: new Date().toISOString()
    });
    
    // In a real app, this would update the project status, notify customer, etc.
    
    return {
      success: true,
      chargeId: charge.id,
      paymentIntentId,
      amount: charge.amount_refunded / 100,
      customerId,
      projectId
    };
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
   * Get public configuration
   * @returns {Object} Public configuration
   */
  getPublicConfig() {
    return {
      publicKey: this.config.stripePublicKey,
      currency: this.config.currency,
      paymentMethods: this.config.paymentMethods,
      paymentScheduleOptions: this.config.paymentScheduleOptions,
      allowPartialPayments: this.config.allowPartialPayments,
      minimumPaymentPercentage: this.config.minimumPaymentPercentage
    };
  }
}

// Example usage:
/*
const stripePaymentModule = new StripePaymentModule({
  stripeSecretKey: 'sk_test_...',
  stripePublicKey: 'pk_test_...'
});

// Register event listeners
stripePaymentModule.addEventListener('payment:succeeded', (data) => {
  console.log(`Payment succeeded: ${data.paymentIntentId}`);
});

// Create checkout session
stripePaymentModule.createCheckoutSession({
  items: [
    {
      name: 'Granite Countertop',
      description: 'Black Galaxy Granite Countertop',
      price: 1500,
      quantity: 1
    }
  ],
  customerEmail: 'customer@example.com',
  projectId: 'proj123',
  customerId: 'cust456'
}).then(session => {
  console.log('Checkout session:', session);
});
*/

// Export the module
module.exports = StripePaymentModule;
