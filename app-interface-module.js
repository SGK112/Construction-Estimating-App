/**
 * App Interface Module for Real-time CSV Data
 * 
 * This module provides React components and hooks for displaying and interacting
 * with real-time CSV data. It handles data loading states, vendor switching,
 * and dynamic updates when new data is available.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CSVIngestionModule from './csv-ingestion-module';

/**
 * Context provider for CSV data access throughout the application
 */
export const CSVDataContext = React.createContext({
  allData: [],
  vendorData: {},
  currentVendor: '',
  isLoading: false,
  error: null,
  setCurrentVendor: () => {},
  refreshData: () => {},
  availableVendors: [],
  availableMaterials: [],
  availableColors: [],
  availableThicknesses: []
});

/**
 * CSV Data Provider component
 * @param {Object} props - Component props
 * @param {Object} props.csvConfig - Configuration for CSV ingestion
 * @param {React.ReactNode} props.children - Child components
 */
export function CSVDataProvider({ csvConfig, children }) {
  const [csvModule] = useState(() => new CSVIngestionModule(csvConfig));
  const [allData, setAllData] = useState([]);
  const [vendorData, setVendorData] = useState({});
  const [currentVendor, setCurrentVendor] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableVendors, setAvailableVendors] = useState([]);
  
  // Initialize CSV sources
  useEffect(() => {
    const initSources = async () => {
      try {
        setIsLoading(true);
        
        // Register all vendor sources from config
        if (csvConfig.sources && Array.isArray(csvConfig.sources)) {
          csvConfig.sources.forEach(source => {
            csvModule.registerSource(source);
          });
          
          // Set available vendors
          setAvailableVendors(csvConfig.sources.map(source => ({
            id: source.id,
            name: source.name || source.id
          })));
          
          // Set default current vendor if available
          if (csvConfig.sources.length > 0) {
            setCurrentVendor(csvConfig.sources[0].id);
          }
        }
        
        // Initial data load
        await refreshAllData();
      } catch (err) {
        console.error('Failed to initialize CSV sources:', err);
        setError('Failed to load product data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initSources();
    
    // Subscribe to data updates
    const unsubscribe = csvModule.subscribe(handleDataUpdate);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Handle data updates from CSV module
  const handleDataUpdate = useCallback((sourceId) => {
    console.log(`Data updated for source: ${sourceId}`);
    refreshAllData();
  }, []);
  
  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all data
      const data = csvModule.getAllData();
      setAllData(data);
      
      // Get data by vendor
      const vendorDataMap = {};
      availableVendors.forEach(vendor => {
        vendorDataMap[vendor.id] = csvModule.getDataForVendor(vendor.id);
      });
      setVendorData(vendorDataMap);
      
      setError(null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError('Failed to update product data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [availableVendors]);
  
  // Force refresh data
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      await csvModule.refreshAllSources();
      await refreshAllData();
    } catch (err) {
      console.error('Failed to force refresh data:', err);
      setError('Failed to refresh product data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshAllData]);
  
  // Compute available materials, colors, and thicknesses based on current vendor
  const availableMaterials = useMemo(() => {
    if (!currentVendor || !vendorData[currentVendor]) return ['All Materials'];
    
    const materials = new Set();
    materials.add('All Materials');
    
    vendorData[currentVendor].forEach(item => {
      if (item.material) {
        materials.add(item.material);
      }
    });
    
    return Array.from(materials);
  }, [currentVendor, vendorData]);
  
  const availableColors = useMemo(() => {
    if (!currentVendor || !vendorData[currentVendor]) return ['All Colors'];
    
    const colors = new Set();
    colors.add('All Colors');
    
    vendorData[currentVendor].forEach(item => {
      if (item.colorName) {
        colors.add(item.colorName);
      }
    });
    
    return Array.from(colors);
  }, [currentVendor, vendorData]);
  
  const availableThicknesses = useMemo(() => {
    if (!currentVendor || !vendorData[currentVendor]) return ['All Thicknesses'];
    
    const thicknesses = new Set();
    thicknesses.add('All Thicknesses');
    
    vendorData[currentVendor].forEach(item => {
      if (item.thickness) {
        thicknesses.add(item.thickness);
      }
    });
    
    return Array.from(thicknesses);
  }, [currentVendor, vendorData]);
  
  // Context value
  const contextValue = {
    allData,
    vendorData,
    currentVendor,
    setCurrentVendor,
    isLoading,
    error,
    refreshData,
    availableVendors,
    availableMaterials,
    availableColors,
    availableThicknesses
  };
  
  return (
    <CSVDataContext.Provider value={contextValue}>
      {children}
    </CSVDataContext.Provider>
  );
}

/**
 * Hook for accessing CSV data in components
 * @returns {Object} CSV data context
 */
export function useCSVData() {
  const context = React.useContext(CSVDataContext);
  if (!context) {
    throw new Error('useCSVData must be used within a CSVDataProvider');
  }
  return context;
}

/**
 * Product Search component with real-time CSV data
 */
export function ProductSearch({ onProductSelect }) {
  const { 
    allData, 
    vendorData, 
    currentVendor, 
    setCurrentVendor,
    isLoading, 
    error,
    availableVendors,
    availableMaterials,
    availableColors,
    availableThicknesses
  } = useCSVData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    vendor: 'All Vendors',
    material: 'All Materials',
    color: 'All Colors',
    thickness: 'All Thicknesses'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Handle vendor change
  const handleVendorChange = (vendorId) => {
    setCurrentVendor(vendorId);
    setFilters({
      ...filters,
      vendor: vendorId,
      material: 'All Materials',
      color: 'All Colors',
      thickness: 'All Thicknesses'
    });
  };
  
  // Filter products based on search query and filters
  const filteredProducts = useMemo(() => {
    let products = [];
    
    // Get data based on vendor filter
    if (filters.vendor === 'All Vendors') {
      products = allData;
    } else {
      products = vendorData[filters.vendor] || [];
    }
    
    // Apply material filter
    if (filters.material !== 'All Materials') {
      products = products.filter(product => product.material === filters.material);
    }
    
    // Apply color filter
    if (filters.color !== 'All Colors') {
      products = products.filter(product => product.colorName === filters.color);
    }
    
    // Apply thickness filter
    if (filters.thickness !== 'All Thicknesses') {
      products = products.filter(product => product.thickness === filters.thickness);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      products = products.filter(product => {
        return (
          (product.colorName && product.colorName.toLowerCase().includes(query)) ||
          (product.material && product.material.toLowerCase().includes(query)) ||
          (product.vendorName && product.vendorName.toLowerCase().includes(query))
        );
      });
    }
    
    return products;
  }, [allData, vendorData, filters, searchQuery]);
  
  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.vendor !== 'All Vendors') count++;
    if (filters.material !== 'All Materials') count++;
    if (filters.color !== 'All Colors') count++;
    if (filters.thickness !== 'All Thicknesses') count++;
    return count;
  }, [filters]);
  
  // Clear all filters and search
  const clearFilters = () => {
    setFilters({
      vendor: 'All Vendors',
      material: 'All Materials',
      color: 'All Colors',
      thickness: 'All Thicknesses'
    });
    setSearchQuery('');
  };
  
  return (
    <div className="product-search">
      <div className="search-bar">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for colors, materials, vendors..."
          className="search-input"
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="filter-button"
          aria-label="Toggle filters"
        >
          <span className="filter-icon">⚙️</span>
          {activeFiltersCount > 0 && (
            <span className="filter-badge">{activeFiltersCount}</span>
          )}
        </button>
      </div>
      
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Filters</h3>
            <button onClick={clearFilters}>Clear All</button>
          </div>
          
          <div className="filter-group">
            <label>Vendor</label>
            <select
              value={filters.vendor}
              onChange={(e) => handleVendorChange(e.target.value)}
            >
              <option value="All Vendors">All Vendors</option>
              {availableVendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          
          {filters.vendor !== 'All Vendors' && (
            <>
              <div className="filter-group">
                <label>Material</label>
                <select
                  value={filters.material}
                  onChange={(e) => setFilters({...filters, material: e.target.value})}
                >
                  {availableMaterials.map(material => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Color</label>
                <select
                  value={filters.color}
                  onChange={(e) => setFilters({...filters, color: e.target.value})}
                >
                  {availableColors.map(color => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Thickness</label>
                <select
                  value={filters.thickness}
                  onChange={(e) => setFilters({...filters, thickness: e.target.value})}
                >
                  {availableThicknesses.map(thickness => (
                    <option key={thickness} value={thickness}>
                      {thickness}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="search-results">
        {isLoading ? (
          <div className="loading-indicator">
            <span className="spinner"></span>
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={refreshData}>Try Again</button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-results">
            <p>No products found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <p className="results-count">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
            <div className="product-grid">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onSelect={onProductSelect}
                  highlightText={searchQuery}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Product Card component
 */
export function ProductCard({ product, onSelect, highlightText }) {
  const price = typeof product.installedPricePerSqFt === 'number' && !isNaN(product.installedPricePerSqFt) 
    ? product.installedPricePerSqFt 
    : 0;
  
  // Highlight matching text in search results
  const highlightMatches = (text) => {
    if (!highlightText || !text) return text;
    
    const regex = new RegExp(`(${highlightText})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <span key={i} className="highlight">{part}</span> : 
        part
    );
  };
  
  // Get color swatch based on color name
  const getColorSwatch = (colorName) => {
    const name = typeof colorName === 'string' ? colorName.trim().toLowerCase() : '';
    
    if (name.includes('white')) return '#F5F5F5';
    if (name.includes('black')) return '#1F2937';
    if (name.includes('blue')) return '#3B82F6';
    if (name.includes('gray')) return '#6B7280';
    if (name.includes('brown')) return '#8B4513';
    if (name.includes('green')) return '#10B981';
    if (name.includes('gold')) return '#DAA520';
    if (name.includes('pearl')) return '#E6E0FA';
    
    return '#D1D5DB';
  };
  
  return (
    <div className="product-card">
      <div className="product-header">
        <div 
          className="color-swatch"
          style={{ backgroundColor: getColorSwatch(product.colorName) }}
        ></div>
        <h3 className="product-title">{highlightMatches(product.colorName)}</h3>
        {product.isNew && <span className="new-badge">New</span>}
      </div>
      
      <div className="product-details">
        <p className="product-material">
          Material: <span>{highlightMatches(product.material)}</span>
        </p>
        <p className="product-vendor">
          Vendor: <span>{highlightMatches(product.vendorName)}</span>
        </p>
        <p className="product-thickness">
          Thickness: <span>{highlightMatches(product.thickness || 'N/A')}</span>
        </p>
        <p className="product-price">
          Price: <span>${price.toFixed(2)}/sq ft</span>
          {price === 0 && <span className="price-note"> (Estimated)</span>}
        </p>
      </div>
      
      <button 
        className="select-button"
        onClick={() => onSelect(product)}
      >
        Select Product
      </button>
    </div>
  );
}

/**
 * Data Refresh Indicator component
 */
export function DataRefreshIndicator() {
  const { isLoading, refreshData } = useCSVData();
  
  return (
    <div className="data-refresh-indicator">
      {isLoading ? (
        <span className="refresh-spinner"></span>
      ) : (
        <button 
          className="refresh-button"
          onClick={refreshData}
          disabled={isLoading}
        >
          Refresh Data
        </button>
      )}
    </div>
  );
}

/**
 * CSV Data Statistics component
 */
export function CSVDataStatistics() {
  const { 
    allData, 
    vendorData, 
    availableVendors,
    isLoading
  } = useCSVData();
  
  if (isLoading) {
    return <div className="data-stats loading">Loading statistics...</div>;
  }
  
  return (
    <div className="data-statistics">
      <h3>Data Statistics</h3>
      <ul>
        <li>Total Products: {allData.length}</li>
        {availableVendors.map(vendor => (
          <li key={vendor.id}>
            {vendor.name}: {vendorData[vendor.id]?.length || 0} products
          </li>
        ))}
      </ul>
    </div>
  );
}

export default {
  CSVDataProvider,
  useCSVData,
  ProductSearch,
  ProductCard,
  DataRefreshIndicator,
  CSVDataStatistics
};
