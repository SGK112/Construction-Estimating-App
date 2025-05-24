/**
 * Dashboard Module for Construction Estimator Platform
 * 
 * This module provides comprehensive dashboard functionality for tracking leads,
 * purchases, sales, and project status with role-based views and widgets.
 */

class DashboardModule {
  constructor(options = {}) {
    // Configuration
    this.config = {
      defaultDateRange: options.defaultDateRange || 30, // days
      refreshInterval: options.refreshInterval || 300000, // 5 minutes
      maxLeadsPerPage: options.maxLeadsPerPage || 10,
      maxProjectsPerPage: options.maxProjectsPerPage || 10,
      maxPurchasesPerPage: options.maxPurchasesPerPage || 10,
      enableRealTimeUpdates: options.enableRealTimeUpdates !== false,
      cacheExpiration: options.cacheExpiration || 60000, // 1 minute
      defaultCurrency: options.defaultCurrency || 'USD',
      dateFormat: options.dateFormat || 'MM/DD/YYYY',
      timeZone: options.timeZone || 'UTC'
    };
    
    // Data stores (in a real app, this would be database queries)
    this.leads = [];
    this.projects = [];
    this.purchases = [];
    this.sales = [];
    this.customers = [];
    this.products = [];
    this.vendors = [];
    
    // Cache for expensive calculations
    this.cache = new Map();
    
    // Dashboard widgets configuration
    this.widgetRegistry = {
      // Customer dashboard widgets
      customer: [
        {
          id: 'project-status',
          title: 'Project Status',
          type: 'status-cards',
          dataSource: 'getProjectStatusData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['customer']
        },
        {
          id: 'recent-quotes',
          title: 'Recent Quotes',
          type: 'data-table',
          dataSource: 'getRecentQuotesData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['customer']
        },
        {
          id: 'payment-schedule',
          title: 'Payment Schedule',
          type: 'timeline',
          dataSource: 'getPaymentScheduleData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['customer']
        },
        {
          id: 'project-timeline',
          title: 'Project Timeline',
          type: 'gantt-chart',
          dataSource: 'getProjectTimelineData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['customer']
        }
      ],
      
      // Admin dashboard widgets
      admin: [
        {
          id: 'sales-overview',
          title: 'Sales Overview',
          type: 'chart',
          chartType: 'bar',
          dataSource: 'getSalesOverviewData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        },
        {
          id: 'lead-funnel',
          title: 'Lead Funnel',
          type: 'funnel-chart',
          dataSource: 'getLeadFunnelData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        },
        {
          id: 'recent-leads',
          title: 'Recent Leads',
          type: 'data-table',
          dataSource: 'getRecentLeadsData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        },
        {
          id: 'project-status-summary',
          title: 'Project Status Summary',
          type: 'pie-chart',
          dataSource: 'getProjectStatusSummaryData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        },
        {
          id: 'revenue-by-product',
          title: 'Revenue by Product',
          type: 'chart',
          chartType: 'bar',
          dataSource: 'getRevenueByProductData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        },
        {
          id: 'top-customers',
          title: 'Top Customers',
          type: 'data-table',
          dataSource: 'getTopCustomersData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['admin']
        }
      ],
      
      // Vendor dashboard widgets
      vendor: [
        {
          id: 'vendor-sales',
          title: 'Sales Overview',
          type: 'chart',
          chartType: 'line',
          dataSource: 'getVendorSalesData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['vendor']
        },
        {
          id: 'product-performance',
          title: 'Product Performance',
          type: 'data-table',
          dataSource: 'getProductPerformanceData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['vendor']
        },
        {
          id: 'pending-orders',
          title: 'Pending Orders',
          type: 'data-table',
          dataSource: 'getPendingOrdersData',
          refreshInterval: 300000, // 5 minutes
          permissions: ['vendor']
        }
      ]
    };
    
    // Initialize event listeners
    this.eventListeners = {
      'dashboard:loaded': [],
      'widget:loaded': [],
      'data:refreshed': [],
      'filter:changed': [],
      'export:started': [],
      'export:completed': []
    };
    
    // Custom widget registry
    this.customWidgets = new Map();
  }
  
  /**
   * Get dashboard configuration for a user
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Object} Dashboard configuration
   */
  getDashboardConfig(userId, role) {
    // Get widgets for user role
    let widgets = [];
    
    if (role === 'admin') {
      widgets = [...this.widgetRegistry.admin];
    } else if (role === 'customer') {
      widgets = [...this.widgetRegistry.customer];
    } else if (role === 'vendor') {
      widgets = [...this.widgetRegistry.vendor];
    }
    
    // Add custom widgets for this user
    const customWidgets = this.getCustomWidgetsForUser(userId);
    widgets = [...widgets, ...customWidgets];
    
    // Get user preferences (layout, visible widgets, etc.)
    const preferences = this.getUserPreferences(userId);
    
    return {
      userId,
      role,
      widgets,
      layout: preferences.layout || 'grid',
      visibleWidgets: preferences.visibleWidgets || widgets.map(w => w.id),
      refreshInterval: preferences.refreshInterval || this.config.refreshInterval,
      dateRange: preferences.dateRange || this.config.defaultDateRange
    };
  }
  
  /**
   * Get custom widgets for a user
   * @param {string} userId - User ID
   * @returns {Array} Custom widgets
   */
  getCustomWidgetsForUser(userId) {
    // In a real app, this would query a database
    return Array.from(this.customWidgets.values())
      .filter(widget => widget.userId === userId || widget.userId === '*');
  }
  
  /**
   * Get user dashboard preferences
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  getUserPreferences(userId) {
    // In a real app, this would query a database
    // For now, return default preferences
    return {
      layout: 'grid',
      visibleWidgets: [],
      refreshInterval: this.config.refreshInterval,
      dateRange: this.config.defaultDateRange
    };
  }
  
  /**
   * Save user dashboard preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @returns {boolean} Success status
   */
  saveUserPreferences(userId, preferences) {
    // In a real app, this would save to a database
    // For now, just return success
    return true;
  }
  
  /**
   * Get widget data
   * @param {string} widgetId - Widget ID
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Widget data
   */
  getWidgetData(widgetId, userId, filters = {}) {
    // Find widget in registry
    let widget = null;
    
    // Check in standard widgets
    for (const role in this.widgetRegistry) {
      const found = this.widgetRegistry[role].find(w => w.id === widgetId);
      if (found) {
        widget = found;
        break;
      }
    }
    
    // Check in custom widgets if not found
    if (!widget && this.customWidgets.has(widgetId)) {
      widget = this.customWidgets.get(widgetId);
    }
    
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }
    
    // Check cache first
    const cacheKey = this.generateCacheKey(widgetId, userId, filters);
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < this.config.cacheExpiration) {
        return cachedData.data;
      }
    }
    
    // Call data source method
    if (typeof this[widget.dataSource] !== 'function') {
      throw new Error(`Data source method not found: ${widget.dataSource}`);
    }
    
    const data = this[widget.dataSource](userId, filters);
    
    // Cache the result
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    // Emit widget loaded event
    this.emitEvent('widget:loaded', {
      widgetId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    return data;
  }
  
  /**
   * Generate cache key for widget data
   * @param {string} widgetId - Widget ID
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {string} Cache key
   */
  generateCacheKey(widgetId, userId, filters) {
    return `${widgetId}:${userId}:${JSON.stringify(filters)}`;
  }
  
  /**
   * Clear cache for a widget
   * @param {string} widgetId - Widget ID
   * @param {string} userId - User ID (optional, if not provided, clear for all users)
   * @returns {boolean} Success status
   */
  clearWidgetCache(widgetId, userId = null) {
    if (userId) {
      // Clear cache for specific user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${widgetId}:${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear cache for all users
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${widgetId}:`)) {
          this.cache.delete(key);
        }
      }
    }
    
    return true;
  }
  
  /**
   * Clear all cache
   * @returns {boolean} Success status
   */
  clearAllCache() {
    this.cache.clear();
    return true;
  }
  
  /**
   * Register a custom widget
   * @param {Object} widget - Widget configuration
   * @returns {string} Widget ID
   */
  registerCustomWidget(widget) {
    if (!widget.id) {
      widget.id = `custom-${Date.now()}`;
    }
    
    if (!widget.dataSource) {
      throw new Error('Widget must have a dataSource');
    }
    
    // Check if data source method exists
    if (typeof this[widget.dataSource] !== 'function') {
      throw new Error(`Data source method not found: ${widget.dataSource}`);
    }
    
    // Add widget to registry
    this.customWidgets.set(widget.id, widget);
    
    return widget.id;
  }
  
  /**
   * Unregister a custom widget
   * @param {string} widgetId - Widget ID
   * @returns {boolean} Success status
   */
  unregisterCustomWidget(widgetId) {
    if (!this.customWidgets.has(widgetId)) {
      return false;
    }
    
    this.customWidgets.delete(widgetId);
    return true;
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
   * Export dashboard data
   * @param {string} format - Export format (csv, pdf, excel)
   * @param {string} userId - User ID
   * @param {Array} widgetIds - Widget IDs to export
   * @param {Object} filters - Data filters
   * @returns {Object} Export result
   */
  exportDashboardData(format, userId, widgetIds, filters = {}) {
    // Emit export started event
    this.emitEvent('export:started', {
      format,
      userId,
      widgetIds,
      timestamp: new Date().toISOString()
    });
    
    // Collect data from widgets
    const data = {};
    
    for (const widgetId of widgetIds) {
      try {
        data[widgetId] = this.getWidgetData(widgetId, userId, filters);
      } catch (e) {
        console.error(`Error getting data for widget ${widgetId}:`, e);
      }
    }
    
    // Format data based on export format
    let exportData;
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportData = this.formatDataAsCSV(data);
        break;
      case 'pdf':
        exportData = this.formatDataAsPDF(data);
        break;
      case 'excel':
        exportData = this.formatDataAsExcel(data);
        break;
      default:
        exportData = data;
    }
    
    // Emit export completed event
    this.emitEvent('export:completed', {
      format,
      userId,
      widgetIds,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      format,
      data: exportData
    };
  }
  
  /**
   * Format data as CSV
   * @param {Object} data - Widget data
   * @returns {string} CSV data
   */
  formatDataAsCSV(data) {
    // In a real app, this would convert data to CSV format
    // For now, just return JSON string
    return JSON.stringify(data);
  }
  
  /**
   * Format data as PDF
   * @param {Object} data - Widget data
   * @returns {Buffer} PDF data
   */
  formatDataAsPDF(data) {
    // In a real app, this would generate a PDF
    // For now, just return JSON string
    return JSON.stringify(data);
  }
  
  /**
   * Format data as Excel
   * @param {Object} data - Widget data
   * @returns {Buffer} Excel data
   */
  formatDataAsExcel(data) {
    // In a real app, this would generate an Excel file
    // For now, just return JSON string
    return JSON.stringify(data);
  }
  
  /**
   * Get project status data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Project status data
   */
  getProjectStatusData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      projects: [
        {
          id: 'p1',
          name: 'Kitchen Remodel',
          status: 'in_progress',
          progress: 65,
          startDate: '2025-04-15',
          endDate: '2025-06-30',
          budget: 15000,
          spent: 9750
        },
        {
          id: 'p2',
          name: 'Bathroom Renovation',
          status: 'quoted',
          progress: 0,
          startDate: '2025-06-01',
          endDate: '2025-07-15',
          budget: 8500,
          spent: 0
        }
      ],
      summary: {
        total: 2,
        inProgress: 1,
        completed: 0,
        quoted: 1,
        draft: 0
      }
    };
  }
  
  /**
   * Get recent quotes data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Recent quotes data
   */
  getRecentQuotesData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      quotes: [
        {
          id: 'q1',
          projectName: 'Kitchen Remodel',
          date: '2025-04-10',
          amount: 15000,
          status: 'approved'
        },
        {
          id: 'q2',
          projectName: 'Bathroom Renovation',
          date: '2025-05-20',
          amount: 8500,
          status: 'pending'
        }
      ],
      summary: {
        total: 2,
        approved: 1,
        pending: 1,
        rejected: 0
      }
    };
  }
  
  /**
   * Get payment schedule data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Payment schedule data
   */
  getPaymentScheduleData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      payments: [
        {
          id: 'pay1',
          projectId: 'p1',
          projectName: 'Kitchen Remodel',
          amount: 5000,
          dueDate: '2025-04-15',
          status: 'paid',
          description: 'Deposit'
        },
        {
          id: 'pay2',
          projectId: 'p1',
          projectName: 'Kitchen Remodel',
          amount: 5000,
          dueDate: '2025-05-15',
          status: 'paid',
          description: 'Progress payment'
        },
        {
          id: 'pay3',
          projectId: 'p1',
          projectName: 'Kitchen Remodel',
          amount: 5000,
          dueDate: '2025-06-30',
          status: 'pending',
          description: 'Final payment'
        }
      ],
      summary: {
        total: 15000,
        paid: 10000,
        pending: 5000,
        overdue: 0
      }
    };
  }
  
  /**
   * Get project timeline data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Project timeline data
   */
  getProjectTimelineData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      project: {
        id: 'p1',
        name: 'Kitchen Remodel',
        startDate: '2025-04-15',
        endDate: '2025-06-30'
      },
      phases: [
        {
          id: 'phase1',
          name: 'Design and Planning',
          startDate: '2025-04-15',
          endDate: '2025-04-30',
          progress: 100,
          status: 'completed'
        },
        {
          id: 'phase2',
          name: 'Demolition',
          startDate: '2025-05-01',
          endDate: '2025-05-10',
          progress: 100,
          status: 'completed'
        },
        {
          id: 'phase3',
          name: 'Plumbing and Electrical',
          startDate: '2025-05-11',
          endDate: '2025-05-25',
          progress: 80,
          status: 'in_progress'
        },
        {
          id: 'phase4',
          name: 'Cabinets and Countertops',
          startDate: '2025-05-26',
          endDate: '2025-06-15',
          progress: 0,
          status: 'not_started'
        },
        {
          id: 'phase5',
          name: 'Finishing',
          startDate: '2025-06-16',
          endDate: '2025-06-30',
          progress: 0,
          status: 'not_started'
        }
      ]
    };
  }
  
  /**
   * Get sales overview data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Sales overview data
   */
  getSalesOverviewData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      series: [
        {
          name: 'Revenue',
          data: [45000, 52000, 49000, 60000, 55000]
        },
        {
          name: 'Costs',
          data: [30000, 35000, 32000, 40000, 36000]
        },
        {
          name: 'Profit',
          data: [15000, 17000, 17000, 20000, 19000]
        }
      ],
      summary: {
        totalRevenue: 261000,
        totalCosts: 173000,
        totalProfit: 88000,
        growthRate: 8.5
      }
    };
  }
  
  /**
   * Get lead funnel data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Lead funnel data
   */
  getLeadFunnelData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      stages: [
        {
          name: 'Inquiries',
          value: 120,
          percentage: 100
        },
        {
          name: 'Qualified Leads',
          value: 80,
          percentage: 66.7
        },
        {
          name: 'Quotes Sent',
          value: 45,
          percentage: 37.5
        },
        {
          name: 'Negotiations',
          value: 25,
          percentage: 20.8
        },
        {
          name: 'Closed Won',
          value: 15,
          percentage: 12.5
        }
      ],
      conversionRate: 12.5,
      averageValue: 12500
    };
  }
  
  /**
   * Get recent leads data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Recent leads data
   */
  getRecentLeadsData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      leads: [
        {
          id: 'l1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '555-123-4567',
          source: 'Website',
          date: '2025-05-20',
          status: 'qualified',
          project: 'Kitchen Remodel',
          estimatedValue: 15000
        },
        {
          id: 'l2',
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '555-987-6543',
          source: 'Referral',
          date: '2025-05-19',
          status: 'contacted',
          project: 'Bathroom Renovation',
          estimatedValue: 8500
        },
        {
          id: 'l3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          phone: '555-456-7890',
          source: 'Google Ads',
          date: '2025-05-18',
          status: 'new',
          project: 'Countertop Replacement',
          estimatedValue: 3500
        }
      ],
      summary: {
        total: 3,
        new: 1,
        contacted: 1,
        qualified: 1,
        lost: 0
      }
    };
  }
  
  /**
   * Get project status summary data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Project status summary data
   */
  getProjectStatusSummaryData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      statuses: [
        {
          name: 'Draft',
          value: 5,
          percentage: 10
        },
        {
          name: 'Quoted',
          value: 10,
          percentage: 20
        },
        {
          name: 'Approved',
          value: 8,
          percentage: 16
        },
        {
          name: 'In Progress',
          value: 15,
          percentage: 30
        },
        {
          name: 'Completed',
          value: 12,
          percentage: 24
        }
      ],
      total: 50
    };
  }
  
  /**
   * Get revenue by product data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Revenue by product data
   */
  getRevenueByProductData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      products: [
        {
          name: 'Granite Countertops',
          revenue: 85000,
          percentage: 32.6
        },
        {
          name: 'Quartz Countertops',
          revenue: 65000,
          percentage: 24.9
        },
        {
          name: 'Marble Countertops',
          revenue: 45000,
          percentage: 17.2
        },
        {
          name: 'Cabinet Installation',
          revenue: 35000,
          percentage: 13.4
        },
        {
          name: 'Backsplash Installation',
          revenue: 31000,
          percentage: 11.9
        }
      ],
      total: 261000
    };
  }
  
  /**
   * Get top customers data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Top customers data
   */
  getTopCustomersData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      customers: [
        {
          id: 'c1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          totalSpent: 25000,
          projects: 2,
          lastPurchase: '2025-04-15'
        },
        {
          id: 'c2',
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          totalSpent: 18500,
          projects: 2,
          lastPurchase: '2025-03-20'
        },
        {
          id: 'c3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          totalSpent: 15000,
          projects: 1,
          lastPurchase: '2025-05-10'
        },
        {
          id: 'c4',
          name: 'Alice Williams',
          email: 'alice.williams@example.com',
          totalSpent: 12500,
          projects: 1,
          lastPurchase: '2025-02-28'
        },
        {
          id: 'c5',
          name: 'Charlie Brown',
          email: 'charlie.brown@example.com',
          totalSpent: 10000,
          projects: 1,
          lastPurchase: '2025-01-15'
        }
      ],
      summary: {
        totalCustomers: 20,
        totalRevenue: 261000,
        averageRevenue: 13050
      }
    };
  }
  
  /**
   * Get vendor sales data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Vendor sales data
   */
  getVendorSalesData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      series: [
        {
          name: 'Sales',
          data: [25000, 28000, 26000, 32000, 30000]
        }
      ],
      summary: {
        totalSales: 141000,
        growthRate: 6.8,
        bestMonth: 'Apr',
        bestMonthSales: 32000
      }
    };
  }
  
  /**
   * Get product performance data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Product performance data
   */
  getProductPerformanceData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      products: [
        {
          id: 'p1',
          name: 'Granite Countertop - Black',
          sales: 45000,
          units: 30,
          averagePrice: 1500,
          growth: 8.5
        },
        {
          id: 'p2',
          name: 'Granite Countertop - White',
          sales: 40000,
          units: 25,
          averagePrice: 1600,
          growth: 12.3
        },
        {
          id: 'p3',
          name: 'Quartz Countertop - Beige',
          sales: 35000,
          units: 20,
          averagePrice: 1750,
          growth: 5.2
        },
        {
          id: 'p4',
          name: 'Quartz Countertop - Gray',
          sales: 30000,
          units: 18,
          averagePrice: 1667,
          growth: 3.8
        },
        {
          id: 'p5',
          name: 'Marble Countertop - White',
          sales: 25000,
          units: 10,
          averagePrice: 2500,
          growth: -2.1
        }
      ],
      summary: {
        totalProducts: 15,
        totalSales: 141000,
        totalUnits: 103,
        averagePrice: 1369
      }
    };
  }
  
  /**
   * Get pending orders data
   * @param {string} userId - User ID
   * @param {Object} filters - Data filters
   * @returns {Object} Pending orders data
   */
  getPendingOrdersData(userId, filters = {}) {
    // In a real app, this would query a database
    // For now, return mock data
    return {
      orders: [
        {
          id: 'o1',
          customer: 'John Smith',
          date: '2025-05-15',
          amount: 3000,
          items: [
            {
              product: 'Granite Countertop - Black',
              quantity: 2,
              price: 1500
            }
          ],
          status: 'processing'
        },
        {
          id: 'o2',
          customer: 'Jane Doe',
          date: '2025-05-18',
          amount: 1750,
          items: [
            {
              product: 'Quartz Countertop - Beige',
              quantity: 1,
              price: 1750
            }
          ],
          status: 'confirmed'
        },
        {
          id: 'o3',
          customer: 'Bob Johnson',
          date: '2025-05-20',
          amount: 2500,
          items: [
            {
              product: 'Marble Countertop - White',
              quantity: 1,
              price: 2500
            }
          ],
          status: 'pending'
        }
      ],
      summary: {
        total: 3,
        processing: 1,
        confirmed: 1,
        pending: 1,
        totalValue: 7250
      }
    };
  }
  
  /**
   * Add a lead
   * @param {Object} leadData - Lead data
   * @returns {Object} Created lead
   */
  addLead(leadData) {
    // Validate required fields
    if (!leadData.name || !leadData.email) {
      throw new Error('Name and email are required');
    }
    
    // Create lead object
    const lead = {
      id: `l${this.leads.length + 1}`,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone || '',
      source: leadData.source || 'Direct',
      date: leadData.date || new Date().toISOString().split('T')[0],
      status: leadData.status || 'new',
      project: leadData.project || '',
      estimatedValue: leadData.estimatedValue || 0,
      notes: leadData.notes || '',
      assignedTo: leadData.assignedTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add lead to storage
    this.leads.push(lead);
    
    // Clear cache for leads widgets
    this.clearWidgetCache('recent-leads');
    this.clearWidgetCache('lead-funnel');
    
    return lead;
  }
  
  /**
   * Update lead status
   * @param {string} leadId - Lead ID
   * @param {string} status - New status
   * @returns {Object} Updated lead
   */
  updateLeadStatus(leadId, status) {
    // Find lead
    const leadIndex = this.leads.findIndex(l => l.id === leadId);
    
    if (leadIndex === -1) {
      throw new Error('Lead not found');
    }
    
    // Update status
    const lead = this.leads[leadIndex];
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    
    // Save updated lead
    this.leads[leadIndex] = lead;
    
    // Clear cache for leads widgets
    this.clearWidgetCache('recent-leads');
    this.clearWidgetCache('lead-funnel');
    
    return lead;
  }
  
  /**
   * Convert lead to project
   * @param {string} leadId - Lead ID
   * @param {Object} projectData - Project data
   * @returns {Object} Created project
   */
  convertLeadToProject(leadId, projectData) {
    // Find lead
    const lead = this.leads.find(l => l.id === leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Create project object
    const project = {
      id: `p${this.projects.length + 1}`,
      name: projectData.name || lead.project,
      description: projectData.description || '',
      customerId: projectData.customerId,
      status: 'draft',
      projectType: projectData.projectType || 'remodel',
      location: projectData.location || {},
      timeline: {
        estimatedStartDate: projectData.startDate || null,
        estimatedCompletionDate: projectData.endDate || null,
        actualStartDate: null,
        actualCompletionDate: null
      },
      rooms: projectData.rooms || [],
      components: projectData.components || [],
      pricing: {
        subtotal: projectData.subtotal || lead.estimatedValue,
        discounts: projectData.discounts || [],
        taxes: projectData.taxes || [],
        fees: projectData.fees || [],
        total: projectData.total || lead.estimatedValue
      },
      paymentSchedule: projectData.paymentSchedule || [],
      documents: [],
      notes: lead.notes,
      assignedTo: lead.assignedTo,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add project to storage
    this.projects.push(project);
    
    // Update lead status
    this.updateLeadStatus(leadId, 'converted');
    
    // Clear cache for project widgets
    this.clearWidgetCache('project-status');
    this.clearWidgetCache('project-status-summary');
    
    return project;
  }
  
  /**
   * Update project status
   * @param {string} projectId - Project ID
   * @param {string} status - New status
   * @returns {Object} Updated project
   */
  updateProjectStatus(projectId, status) {
    // Find project
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }
    
    // Update status
    const project = this.projects[projectIndex];
    project.status = status;
    project.updatedAt = new Date().toISOString();
    
    // Update timeline based on status
    if (status === 'in_progress' && !project.timeline.actualStartDate) {
      project.timeline.actualStartDate = new Date().toISOString().split('T')[0];
    } else if (status === 'completed' && !project.timeline.actualCompletionDate) {
      project.timeline.actualCompletionDate = new Date().toISOString().split('T')[0];
    }
    
    // Save updated project
    this.projects[projectIndex] = project;
    
    // Clear cache for project widgets
    this.clearWidgetCache('project-status');
    this.clearWidgetCache('project-status-summary');
    this.clearWidgetCache('project-timeline');
    
    return project;
  }
  
  /**
   * Record payment
   * @param {string} projectId - Project ID
   * @param {Object} paymentData - Payment data
   * @returns {Object} Updated project
   */
  recordPayment(projectId, paymentData) {
    // Find project
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }
    
    // Validate payment data
    if (!paymentData.amount || !paymentData.description) {
      throw new Error('Amount and description are required');
    }
    
    // Create payment object
    const payment = {
      id: `pay${Date.now()}`,
      projectId,
      projectName: this.projects[projectIndex].name,
      amount: paymentData.amount,
      dueDate: paymentData.dueDate || new Date().toISOString().split('T')[0],
      status: paymentData.status || 'pending',
      description: paymentData.description,
      metadata: paymentData.metadata || {}
    };
    
    // Add payment to project
    const project = this.projects[projectIndex];
    
    if (!project.paymentSchedule) {
      project.paymentSchedule = [];
    }
    
    project.paymentSchedule.push(payment);
    project.updatedAt = new Date().toISOString();
    
    // Save updated project
    this.projects[projectIndex] = project;
    
    // Record purchase if payment is paid
    if (payment.status === 'paid') {
      this.recordPurchase({
        projectId,
        customerId: project.customerId,
        amount: payment.amount,
        description: payment.description,
        date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Clear cache for payment widgets
    this.clearWidgetCache('payment-schedule');
    
    return project;
  }
  
  /**
   * Record purchase
   * @param {Object} purchaseData - Purchase data
   * @returns {Object} Created purchase
   */
  recordPurchase(purchaseData) {
    // Validate required fields
    if (!purchaseData.amount) {
      throw new Error('Amount is required');
    }
    
    // Create purchase object
    const purchase = {
      id: `pur${this.purchases.length + 1}`,
      projectId: purchaseData.projectId,
      customerId: purchaseData.customerId,
      amount: purchaseData.amount,
      description: purchaseData.description || '',
      date: purchaseData.date || new Date().toISOString().split('T')[0],
      items: purchaseData.items || [],
      metadata: purchaseData.metadata || {},
      createdAt: new Date().toISOString()
    };
    
    // Add purchase to storage
    this.purchases.push(purchase);
    
    // Record sale
    this.recordSale({
      purchaseId: purchase.id,
      amount: purchase.amount,
      date: purchase.date,
      items: purchase.items
    });
    
    // Clear cache for purchase widgets
    this.clearWidgetCache('top-customers');
    
    return purchase;
  }
  
  /**
   * Record sale
   * @param {Object} saleData - Sale data
   * @returns {Object} Created sale
   */
  recordSale(saleData) {
    // Validate required fields
    if (!saleData.amount) {
      throw new Error('Amount is required');
    }
    
    // Create sale object
    const sale = {
      id: `sale${this.sales.length + 1}`,
      purchaseId: saleData.purchaseId,
      amount: saleData.amount,
      date: saleData.date || new Date().toISOString().split('T')[0],
      items: saleData.items || [],
      metadata: saleData.metadata || {},
      createdAt: new Date().toISOString()
    };
    
    // Add sale to storage
    this.sales.push(sale);
    
    // Clear cache for sales widgets
    this.clearWidgetCache('sales-overview');
    this.clearWidgetCache('revenue-by-product');
    this.clearWidgetCache('vendor-sales');
    this.clearWidgetCache('product-performance');
    
    return sale;
  }
}

// Example usage:
/*
const dashboardModule = new DashboardModule();

// Register event listeners
dashboardModule.addEventListener('widget:loaded', (data) => {
  console.log(`Widget loaded: ${data.widgetId}`);
});

// Get dashboard config for user
const dashboardConfig = dashboardModule.getDashboardConfig('user123', 'admin');

// Get widget data
const salesData = dashboardModule.getWidgetData('sales-overview', 'user123', {
  dateRange: 30
});

// Add a lead
const lead = dashboardModule.addLead({
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '555-123-4567',
  project: 'Kitchen Remodel',
  estimatedValue: 15000
});

// Convert lead to project
const project = dashboardModule.convertLeadToProject(lead.id, {
  name: 'Smith Kitchen Remodel',
  startDate: '2025-06-01',
  endDate: '2025-07-15'
});
*/

// Export the module
module.exports = DashboardModule;
