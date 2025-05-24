# Multi-Vendor Data Model and Service Architecture

## Overview

This document details the data model and service architecture for the multi-vendor, multi-product support in the construction estimating platform. The design focuses on scalability, extensibility, and modularity to accommodate growth in vendors, products, and service categories.

## Data Model Design

### 1. Vendor Management

#### 1.1 Vendor Entity
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "logo": "string (URL)",
  "contactInfo": {
    "primaryContact": "string",
    "email": "string",
    "phone": "string",
    "website": "string"
  },
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "categories": ["string"],
  "dataSources": [
    {
      "id": "string",
      "type": "enum(csv, api, manual)",
      "location": "string (URL or path)",
      "credentials": "object (encrypted)",
      "mappingConfig": "object",
      "refreshSchedule": "string (cron)",
      "lastSyncStatus": "enum(success, failed, pending)",
      "lastSyncTime": "datetime"
    }
  ],
  "status": "enum(active, inactive, pending)",
  "tier": "enum(preferred, standard, basic)",
  "commissionRate": "number",
  "paymentTerms": "string",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 1.2 Vendor Category
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "parentCategoryId": "string (nullable)",
  "displayOrder": "number",
  "icon": "string (URL)",
  "status": "enum(active, inactive)",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 2. Product Catalog

#### 2.1 Product Entity
```json
{
  "id": "string (UUID)",
  "vendorId": "string (reference)",
  "name": "string",
  "description": "string",
  "sku": "string",
  "categoryId": "string (reference)",
  "subcategoryId": "string (reference)",
  "basePrice": "number",
  "currency": "string (ISO code)",
  "unit": "string",
  "dimensions": {
    "length": "number",
    "width": "number",
    "height": "number",
    "unit": "string"
  },
  "weight": {
    "value": "number",
    "unit": "string"
  },
  "attributes": {
    "color": "string",
    "material": "string",
    "finish": "string",
    "grade": "string",
    "brand": "string",
    "customAttributes": "object"
  },
  "images": [
    {
      "id": "string",
      "url": "string",
      "alt": "string",
      "isPrimary": "boolean",
      "sortOrder": "number"
    }
  ],
  "variants": [
    {
      "id": "string",
      "name": "string",
      "attributeValues": "object",
      "sku": "string",
      "price": "number",
      "inventory": "number"
    }
  ],
  "pricing": {
    "basePrice": "number",
    "discountType": "enum(percentage, fixed)",
    "discountValue": "number",
    "effectivePrice": "number",
    "bulkPricing": [
      {
        "minQuantity": "number",
        "price": "number"
      }
    ],
    "customPricingFormula": "string"
  },
  "inventory": {
    "available": "number",
    "reserved": "number",
    "backorder": "boolean",
    "leadTime": "number (days)"
  },
  "externalIds": {
    "shopifyId": "string",
    "vendorProductId": "string",
    "upc": "string",
    "isbn": "string"
  },
  "status": "enum(active, inactive, discontinued)",
  "metadata": "object",
  "searchKeywords": ["string"],
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "publishedAt": "datetime"
}
```

#### 2.2 Product Category
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "parentCategoryId": "string (nullable)",
  "displayOrder": "number",
  "icon": "string (URL)",
  "image": "string (URL)",
  "attributeDefinitions": [
    {
      "name": "string",
      "label": "string",
      "type": "enum(text, number, boolean, select, multiselect)",
      "required": "boolean",
      "options": ["string"],
      "defaultValue": "any",
      "unit": "string",
      "displayOrder": "number"
    }
  ],
  "status": "enum(active, inactive)",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 3. Service Catalog

#### 3.1 Service Entity
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "categoryId": "string (reference)",
  "subcategoryId": "string (reference)",
  "baseRate": "number",
  "currency": "string (ISO code)",
  "unit": "string",
  "estimationParameters": [
    {
      "id": "string",
      "name": "string",
      "label": "string",
      "type": "enum(text, number, boolean, select, multiselect)",
      "required": "boolean",
      "options": ["string"],
      "defaultValue": "any",
      "unit": "string",
      "affectsPricing": "boolean",
      "pricingFactor": "object",
      "displayOrder": "number"
    }
  ],
  "pricingFormula": {
    "formula": "string",
    "variables": "object",
    "description": "string"
  },
  "laborRequirements": {
    "estimatedHours": "number",
    "skillLevel": "enum(basic, intermediate, expert)",
    "crewSize": "number"
  },
  "relatedProductCategories": ["string"],
  "status": "enum(active, inactive)",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 3.2 Service Category
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "parentCategoryId": "string (nullable)",
  "displayOrder": "number",
  "icon": "string (URL)",
  "image": "string (URL)",
  "status": "enum(active, inactive)",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 4. CSV Data Source Management

#### 4.1 CSV Data Source
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "vendorId": "string (reference)",
  "type": "enum(product, service, labor, material)",
  "sourceType": "enum(url, upload, api)",
  "location": "string",
  "credentials": "object (encrypted)",
  "headerRow": "boolean",
  "delimiter": "string",
  "encoding": "string",
  "columnMapping": [
    {
      "sourceColumn": "string",
      "targetField": "string",
      "transformations": ["string"],
      "required": "boolean",
      "defaultValue": "any"
    }
  ],
  "validationRules": [
    {
      "field": "string",
      "rule": "string",
      "errorMessage": "string"
    }
  ],
  "processingOptions": {
    "skipInvalidRows": "boolean",
    "updateExisting": "boolean",
    "createMissing": "boolean",
    "deleteNotInSource": "boolean"
  },
  "schedule": {
    "frequency": "enum(manual, hourly, daily, weekly, monthly)",
    "cronExpression": "string",
    "lastRun": "datetime",
    "nextRun": "datetime"
  },
  "status": "enum(active, inactive, error)",
  "lastRunStats": {
    "startTime": "datetime",
    "endTime": "datetime",
    "rowsProcessed": "number",
    "rowsCreated": "number",
    "rowsUpdated": "number",
    "rowsSkipped": "number",
    "errors": ["string"]
  },
  "versionHistory": [
    {
      "version": "number",
      "filename": "string",
      "processedAt": "datetime",
      "changes": {
        "added": "number",
        "updated": "number",
        "removed": "number"
      }
    }
  ],
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 4.2 CSV Import Job
```json
{
  "id": "string (UUID)",
  "dataSourceId": "string (reference)",
  "status": "enum(pending, processing, completed, failed)",
  "filename": "string",
  "fileSize": "number",
  "fileHash": "string",
  "startTime": "datetime",
  "endTime": "datetime",
  "totalRows": "number",
  "processedRows": "number",
  "successRows": "number",
  "errorRows": "number",
  "errors": [
    {
      "row": "number",
      "column": "string",
      "message": "string",
      "data": "object"
    }
  ],
  "importVersion": "number",
  "createdBy": "string (user reference)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 5. Project and Estimation

#### 5.1 Project Entity
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "customerId": "string (reference)",
  "status": "enum(draft, quoted, approved, in_progress, completed, cancelled)",
  "projectType": "enum(new_construction, remodel, repair)",
  "location": {
    "address": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zip": "string",
      "country": "string"
    },
    "coordinates": {
      "latitude": "number",
      "longitude": "number"
    }
  },
  "timeline": {
    "estimatedStartDate": "date",
    "estimatedCompletionDate": "date",
    "actualStartDate": "date",
    "actualCompletionDate": "date"
  },
  "rooms": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "dimensions": {
        "length": "number",
        "width": "number",
        "height": "number",
        "unit": "string"
      },
      "components": ["string (reference)"]
    }
  ],
  "components": [
    {
      "id": "string",
      "type": "enum(product, service, labor, material)",
      "referenceId": "string",
      "name": "string",
      "description": "string",
      "quantity": "number",
      "unit": "string",
      "unitPrice": "number",
      "totalPrice": "number",
      "attributes": "object",
      "customizations": "object",
      "notes": "string"
    }
  ],
  "pricing": {
    "subtotal": "number",
    "discounts": [
      {
        "description": "string",
        "amount": "number",
        "type": "enum(percentage, fixed)"
      }
    ],
    "taxes": [
      {
        "description": "string",
        "rate": "number",
        "amount": "number"
      }
    ],
    "fees": [
      {
        "description": "string",
        "amount": "number"
      }
    ],
    "total": "number",
    "currency": "string (ISO code)"
  },
  "paymentSchedule": [
    {
      "id": "string",
      "description": "string",
      "amount": "number",
      "dueDate": "date",
      "status": "enum(pending, paid, overdue, cancelled)"
    }
  ],
  "documents": [
    {
      "id": "string",
      "type": "enum(quote, contract, invoice, permit, design, other)",
      "name": "string",
      "url": "string",
      "createdAt": "datetime"
    }
  ],
  "notes": [
    {
      "id": "string",
      "text": "string",
      "createdBy": "string (reference)",
      "createdAt": "datetime",
      "isPrivate": "boolean"
    }
  ],
  "assignedTo": "string (user reference)",
  "metadata": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 5.2 Estimation Template
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "category": "string",
  "components": [
    {
      "id": "string",
      "type": "enum(product, service, labor, material)",
      "categoryId": "string",
      "name": "string",
      "description": "string",
      "isRequired": "boolean",
      "defaultQuantity": "number",
      "unit": "string",
      "pricingFormula": "string",
      "dependencies": ["string"],
      "incompatibilities": ["string"]
    }
  ],
  "formFields": [
    {
      "id": "string",
      "label": "string",
      "type": "enum(text, number, select, checkbox, radio, date)",
      "required": "boolean",
      "options": ["string"],
      "defaultValue": "any",
      "validations": "object",
      "affectsComponents": ["string"],
      "displayOrder": "number"
    }
  ],
  "status": "enum(active, inactive, draft)",
  "createdBy": "string (user reference)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Service Architecture

### 1. Vendor Management Service

#### 1.1 Responsibilities
- Vendor onboarding and profile management
- Vendor data source configuration
- Vendor category management
- Vendor performance tracking

#### 1.2 Key APIs
```
GET    /api/vendors
POST   /api/vendors
GET    /api/vendors/:id
PUT    /api/vendors/:id
DELETE /api/vendors/:id
GET    /api/vendors/:id/data-sources
POST   /api/vendors/:id/data-sources
GET    /api/vendor-categories
POST   /api/vendor-categories
```

#### 1.3 Service Dependencies
- Authentication Service
- File Storage Service
- Notification Service

### 2. Product Catalog Service

#### 2.1 Responsibilities
- Product creation and management
- Product categorization
- Product search and filtering
- Product pricing management
- Shopify product synchronization

#### 2.2 Key APIs
```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/product-categories
POST   /api/product-categories
GET    /api/products/search
GET    /api/products/by-vendor/:vendorId
POST   /api/products/sync-shopify
```

#### 2.3 Service Dependencies
- Vendor Management Service
- File Storage Service
- Shopify Integration Service
- Search Indexing Service

### 3. Service Catalog Service

#### 3.1 Responsibilities
- Service definition and management
- Service categorization
- Service pricing formula management
- Labor requirements tracking

#### 3.2 Key APIs
```
GET    /api/services
POST   /api/services
GET    /api/services/:id
PUT    /api/services/:id
DELETE /api/services/:id
GET    /api/service-categories
POST   /api/service-categories
GET    /api/services/by-category/:categoryId
```

#### 3.3 Service Dependencies
- Vendor Management Service
- Product Catalog Service
- Pricing Engine Service

### 4. CSV Data Processing Service

#### 4.1 Responsibilities
- CSV file validation and parsing
- Data mapping and transformation
- Incremental data updates
- Version tracking and rollback
- Scheduled data synchronization

#### 4.2 Key APIs
```
POST   /api/csv/upload
POST   /api/csv/validate
POST   /api/csv/import
GET    /api/csv/import-jobs
GET    /api/csv/import-jobs/:id
GET    /api/csv/data-sources
POST   /api/csv/data-sources
GET    /api/csv/data-sources/:id
PUT    /api/csv/data-sources/:id
POST   /api/csv/data-sources/:id/sync
GET    /api/csv/data-sources/:id/versions
POST   /api/csv/data-sources/:id/rollback/:version
```

#### 4.3 Service Dependencies
- Vendor Management Service
- Product Catalog Service
- Service Catalog Service
- File Storage Service
- Job Queue Service

### 5. Estimation Engine Service

#### 5.1 Responsibilities
- Project creation and management
- Component selection and configuration
- Dynamic pricing calculation
- Quote generation
- Template management

#### 5.2 Key APIs
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/calculate
POST   /api/projects/:id/generate-quote
GET    /api/estimation-templates
POST   /api/estimation-templates
GET    /api/estimation-templates/:id
PUT    /api/estimation-templates/:id
```

#### 5.3 Service Dependencies
- Product Catalog Service
- Service Catalog Service
- Pricing Engine Service
- Customer Management Service
- Document Generation Service

### 6. Pricing Engine Service

#### 6.1 Responsibilities
- Dynamic price calculation
- Formula evaluation
- Discount management
- Tax calculation
- Bulk pricing

#### 6.2 Key APIs
```
POST   /api/pricing/calculate
POST   /api/pricing/calculate-component
GET    /api/pricing/tax-rates
POST   /api/pricing/discount-rules
GET    /api/pricing/discount-rules
```

#### 6.3 Service Dependencies
- Product Catalog Service
- Service Catalog Service
- Tax Service

## Data Flow Architecture

### 1. CSV Data Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CSV Upload │────▶│  Validation │────▶│ Transformation │────▶│  Storage   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           ▼                                       ▼
                    ┌─────────────┐                        ┌─────────────┐
                    │  Error      │                        │ Versioning  │
                    │  Handling   │                        │             │
                    └─────────────┘                        └─────────────┘
                                                                 │
                                                                 ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Product    │◀────│  Data       │◀────│ Indexing    │◀────│ Notification │
│  Catalog    │     │  Integration │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 2. Multi-Vendor Product Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Vendor 1   │     │  Vendor 2   │     │  Vendor 3   │
│  CSV        │     │  API        │     │  Manual     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                Data Source Adapters                 │
└─────────────────────────────────────────────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                Data Normalization                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                Unified Product Catalog              │
└─────────────────────────────────────────────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Estimation │     │  Shopify    │     │  Customer   │
│  Engine     │     │  Sync       │     │  Portal     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3. Project Estimation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────▶│  Project    │────▶│ Component   │────▶│  Pricing    │
│  Input      │     │  Creation   │     │ Selection   │     │  Calculation │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │                   │
                                               ▼                   ▼
                                        ┌─────────────┐     ┌─────────────┐
                                        │  Product    │     │  Service    │
                                        │  Catalog    │     │  Catalog    │
                                        └─────────────┘     └─────────────┘
                                               │                   │
                                               ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Payment    │◀────│  Quote      │◀────│ Final       │◀────│ Customization│
│  Processing │     │  Generation │     │ Review      │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Scalability Design

### 1. Horizontal Scaling

#### 1.1 Service Isolation
Each service is designed to be independently deployable and scalable, allowing for horizontal scaling based on demand.

#### 1.2 Stateless Design
Services are designed to be stateless, storing all state in the database or cache, enabling load balancing across multiple instances.

#### 1.3 Database Sharding Strategy
```
- Product data sharded by vendor
- Project data sharded by customer
- Historical data archived to separate storage
```

### 2. Caching Strategy

#### 2.1 Multi-Level Caching
```
- L1: In-memory service cache (fast, short-lived)
- L2: Distributed Redis cache (shared, medium-lived)
- L3: CDN for static assets (long-lived)
```

#### 2.2 Cache Invalidation
```
- Time-based expiration for product data
- Event-based invalidation for pricing changes
- Versioned cache keys for configuration data
```

### 3. Asynchronous Processing

#### 3.1 Job Queue Architecture
```
- High-priority queues for user-facing operations
- Background queues for data processing
- Scheduled queues for periodic tasks
```

#### 3.2 Event-Driven Communication
```
- Service events published to message bus
- Subscribers process events asynchronously
- Retry mechanisms for failed processing
```

## Extensibility Design

### 1. Plugin Architecture

#### 1.1 Extension Points
```
- Product data processors
- Pricing calculators
- Estimation templates
- Report generators
- Payment processors
```

#### 1.2 Plugin Registry
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "version": "string",
  "type": "enum(processor, calculator, template, generator, processor)",
  "entryPoint": "string",
  "configSchema": "object",
  "config": "object",
  "status": "enum(active, inactive)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 2. Custom Field Support

#### 2.1 Dynamic Schema Extension
```json
{
  "entityType": "enum(product, service, vendor, project, customer)",
  "fieldDefinitions": [
    {
      "id": "string",
      "name": "string",
      "label": "string",
      "type": "enum(text, number, boolean, select, date)",
      "required": "boolean",
      "options": ["string"],
      "defaultValue": "any",
      "validations": "object",
      "displayOrder": "number"
    }
  ]
}
```

#### 2.2 Custom Field Values
```json
{
  "entityId": "string",
  "entityType": "string",
  "fields": {
    "fieldName1": "value1",
    "fieldName2": "value2"
  }
}
```

### 3. API Versioning

#### 3.1 Version Strategy
```
- URI versioning (/api/v1/products)
- Header-based versioning (API-Version: 1)
- Backward compatibility guarantees
```

#### 3.2 Deprecation Policy
```
- Minimum 6-month deprecation period
- Warning headers for deprecated endpoints
- Documentation of migration paths
```

## Implementation Considerations

### 1. Technology Selection

#### 1.1 Backend Framework
- Node.js with NestJS for type-safe, modular API development
- GraphQL for flexible data querying
- MongoDB for document storage with flexible schema

#### 1.2 Frontend Framework
- React with Next.js for server-side rendering
- Redux Toolkit for state management
- Material-UI for component library

#### 1.3 Infrastructure
- Docker containers for service isolation
- Kubernetes for orchestration
- AWS or Google Cloud for hosting

### 2. Development Workflow

#### 2.1 Modular Development
- Independent service repositories
- Shared core libraries
- Consistent API contracts

#### 2.2 Testing Strategy
- Unit tests for business logic
- Integration tests for service interactions
- End-to-end tests for critical flows

#### 2.3 Deployment Pipeline
- Continuous integration with automated testing
- Staged deployments (dev, staging, production)
- Feature flags for controlled rollouts

## Conclusion

This multi-vendor, multi-product data model and service architecture provides a robust foundation for the construction estimating platform. The design emphasizes scalability, extensibility, and modularity, allowing the platform to grow with new vendors, products, and service categories while maintaining performance and reliability.

The architecture supports the key requirements:
- Flexible CSV ingestion from multiple vendors
- Unified product and service catalog
- Dynamic pricing and estimation
- Integration with Shopify, MongoDB, and Stripe
- User authentication and dashboard functionality

By implementing this architecture, the platform will be well-positioned to scale from countertop estimation to comprehensive construction and remodeling services.
