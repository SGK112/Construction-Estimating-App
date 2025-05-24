# CSV-Connected Architecture Design

## System Architecture Overview

The redesigned application will follow a modular, scalable architecture that separates concerns and allows for easy extension with new CSV data sources, product types, and integrations.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
├─────────────┬─────────────┬─────────────┬─────────────┬─────┤
│  CSV Data   │    Data     │  Business   │     UI      │ API │
│   Module    │   Store     │   Logic     │  Components │ Client
├─────────────┼─────────────┼─────────────┼─────────────┼─────┤
│ CSV Fetcher │ Data Models │ Price Calc  │ Search/Filter│ Image│
│ CSV Parser  │ State Mgmt  │ Quote Mgmt  │ Product Cards│ Quote│
│ Data Cache  │ Persistence │ Validation  │ Multi-step UI│ Auth │
└─────────────┴─────────────┴─────────────┴─────────────┴─────┘
        ▲             ▲             ▲             ▲        ▲
        │             │             │             │        │
        ▼             ▼             ▼             ▼        ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  CSV Data   │ │   Browser   │ │   Backend   │ │  External   │
│   Sources   │ │   Storage   │ │   Services  │ │    APIs     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Core Modules

### 1. CSV Data Module

This module handles all aspects of CSV data acquisition, processing, and caching.

#### Components:

- **CSV Configuration Manager**
  - Stores and manages CSV source URLs by vendor
  - Handles authentication for protected CSV sources
  - Provides interface for adding new CSV sources

- **CSV Fetcher**
  - Retrieves CSV data from configured sources
  - Implements retry logic and error handling
  - Supports scheduled and on-demand fetching

- **CSV Parser**
  - Converts raw CSV data to structured objects
  - Applies vendor-specific field mappings
  - Validates data integrity and format

- **Data Normalizer**
  - Standardizes vendor-specific data formats
  - Normalizes color names, materials, and measurements
  - Applies business rules for data consistency

- **Cache Manager**
  - Stores processed data in browser storage
  - Implements cache invalidation strategies
  - Provides fallback data when sources are unavailable

### 2. Data Store

This module manages application state and persistence.

#### Components:

- **Data Models**
  - Product model (vendor, material, color, thickness, price)
  - Quote model (selected products, quantities, pricing)
  - User model (preferences, region, contact info)

- **State Management**
  - Centralized state store with reducers
  - Action creators for state modifications
  - Selectors for efficient data access

- **Persistence Layer**
  - Local storage adapter with encryption
  - Session management
  - Data migration for version updates

### 3. Business Logic

This module implements all business rules and calculations.

#### Components:

- **Price Calculator**
  - Base price determination
  - Regional price adjustments
  - Waste factor calculations
  - Quantity-based pricing
  - Special pricing rules

- **Quote Manager**
  - Quote creation and modification
  - Item addition and removal
  - Quote validation
  - Quote submission

- **Search Engine**
  - Text-based search with relevance scoring
  - Fuzzy matching for typo tolerance
  - Suggestion generation
  - Search result highlighting

- **Filter Engine**
  - Multi-criteria filtering
  - Dynamic filter options based on available data
  - Filter combination logic

### 4. UI Components

This module provides the user interface elements.

#### Components:

- **App Shell**
  - Navigation and layout
  - Theme management
  - Responsive design adaptation

- **Multi-step Workflow**
  - Step navigation and validation
  - Progress tracking
  - State persistence between steps

- **Search and Filter UI**
  - Search input with suggestions
  - Filter controls with dynamic options
  - Results display with virtual scrolling

- **Product Display**
  - Product cards with dynamic content
  - Color swatches and visualization
  - Interactive elements for selection

- **Quote Builder**
  - Selected items management
  - Quantity adjustments
  - Price breakdown
  - Quote summary

- **Form Components**
  - Input validation
  - Error messaging
  - Accessibility features

### 5. API Client

This module handles communication with external services.

#### Components:

- **HTTP Client**
  - Request/response handling
  - Error management
  - Authentication

- **Service Adapters**
  - Image service for product visualization
  - Quote submission service
  - User authentication service

## Data Flow

1. **CSV Data Acquisition**
   ```
   CSV Source → CSV Fetcher → CSV Parser → Data Normalizer → Cache Manager → Data Store
   ```

2. **Product Search and Filtering**
   ```
   User Input → Search/Filter Engine → Data Store Query → UI Update
   ```

3. **Quote Building**
   ```
   Product Selection → Quote Manager → Price Calculator → Data Store Update → UI Update
   ```

4. **Quote Submission**
   ```
   Form Submission → Validation → API Client → Backend Service → Confirmation
   ```

## Data Model

### Product

```typescript
interface Product {
  id: string;                     // Unique identifier
  vendorName: string;             // Source vendor
  material: string;               // Material type
  colorName: string;              // Color name
  normalizedColorName: string;    // Standardized color name
  thickness: string;              // Material thickness
  installedPricePerSqFt: number;  // Base price
  imageUrl?: string;              // Product image URL
  isNew?: boolean;                // Flag for new products
  metadata: {                     // Additional vendor-specific data
    [key: string]: any;
  };
}
```

### Quote Item

```typescript
interface QuoteItem extends Product {
  sqFt: number;                   // Square footage
  wasteFactor: number;            // Calculated waste factor
  adjustedPrice: number;          // Price with regional adjustment
  totalPrice: number;             // Final price with all factors
}
```

### Quote

```typescript
interface Quote {
  id: string;                     // Quote identifier
  items: QuoteItem[];             // Selected products
  customer: {                     // Customer information
    name: string;
    email: string;
    phone: string;
    zipCode: string;
  };
  region: {                       // Regional information
    name: string;
    multiplier: number;
  };
  totals: {                       // Quote totals
    subtotal: number;
    tax: number;
    total: number;
  };
  createdAt: string;              // Creation timestamp
  updatedAt: string;              // Last update timestamp
}
```

### CSV Configuration

```typescript
interface CSVSource {
  id: string;                     // Source identifier
  name: string;                   // Display name
  url: string;                    // CSV URL
  refreshInterval: number;        // Refresh frequency in ms
  fieldMapping: {                 // Field name mapping
    [appField: string]: string;   // App field name → CSV field name
  };
  transformations: {              // Data transformations
    [field: string]: (value: any) => any;
  };
}
```

## Scalability Considerations

1. **Adding New Vendors**
   - Register new CSV source in configuration
   - Define field mapping for standardization
   - Specify any vendor-specific transformations
   - No code changes required for basic integration

2. **Supporting New Product Types**
   - Extend product model with type-specific fields
   - Add type-specific UI components
   - Implement type-specific business logic
   - Update search and filter engines

3. **Performance Optimization**
   - Implement virtual scrolling for large result sets
   - Use web workers for CSV parsing and search
   - Apply incremental updates to avoid full reloads
   - Implement progressive loading of product images

## Integration Points

1. **CSV Data Sources**
   - Google Sheets published CSV URLs
   - Direct CSV file uploads
   - API-based CSV data providers

2. **Backend Services**
   - Quote submission API
   - Customer data management
   - Order processing

3. **External APIs**
   - Product image retrieval
   - Geolocation for regional pricing
   - Authentication services

## Implementation Strategy

The implementation will follow a phased approach:

1. **Phase 1: Core CSV Integration**
   - Implement CSV fetcher and parser
   - Build data normalization pipeline
   - Create caching mechanism
   - Develop basic UI for data display

2. **Phase 2: Enhanced User Experience**
   - Implement search and filter functionality
   - Build multi-step quote workflow
   - Add product visualization
   - Develop responsive UI components

3. **Phase 3: Advanced Features**
   - Implement regional pricing
   - Add user accounts and quote history
   - Develop offline functionality
   - Integrate with backend services

This architecture provides a solid foundation for a scalable, maintainable application that can grow with the business needs while maintaining robust CSV data integration.
