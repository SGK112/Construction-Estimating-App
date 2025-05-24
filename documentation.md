# Construction Estimator Platform Documentation

## Overview

The Construction Estimator Platform is a comprehensive solution for construction and remodeling businesses, with a specific focus on countertop and remodeling estimation. This platform integrates with multiple data sources, provides robust user management, and offers a complete estimation-to-payment workflow.

## System Architecture

The platform is built with a modular architecture that allows for easy extension and customization:

1. **Core Modules**
   - CSV Ingestion Module: Handles pricing data from Google Sheets
   - Authentication Module: Manages user accounts and permissions
   - Dashboard Module: Provides analytics and reporting
   - Shopify Integration Module: Synchronizes product catalog
   - MongoDB Image Module: Manages product images
   - Stripe Payment Module: Processes payments and manages checkout

2. **Data Flow**
   - Pricing data flows from Google Sheets to the estimation engine
   - Product data synchronizes between Shopify and the platform
   - Images are retrieved from MongoDB based on product attributes
   - User data and estimates are stored in the platform database
   - Payments are processed through Stripe

3. **User Interfaces**
   - Customer-facing estimation interface
   - Admin dashboard for business management
   - Vendor portal for product management

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MongoDB database
- Shopify store (for product catalog)
- Stripe account (for payment processing)
- Google Sheets with pricing data

### Environment Variables

Create a `.env` file with the following variables:

```
# Server Configuration
PORT=3000
BASE_URL=https://your-domain.com

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Google Sheets URLs
PUBLISHED_CSV_LABOR=https://docs.google.com/spreadsheets/d/e/your-labor-sheet-id/pub?output=csv
PUBLISHED_CSV_MATERIALS=https://docs.google.com/spreadsheets/d/e/your-materials-sheet-id/pub?output=csv

# Shopify Configuration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token

# Stripe Configuration
STRIPE_SECERET_KEY=your-stripe-secret-key

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_SUBJECT=Your Estimate

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/construction-estimator.git
   cd construction-estimator
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the application:
   ```
   npm run build
   ```

4. Start the server:
   ```
   npm start
   ```

## Module Configuration

### CSV Ingestion Module

The CSV Ingestion Module is responsible for importing pricing data from Google Sheets. It supports multiple data formats and can be configured to handle different vendor-specific pricing structures.

#### Configuration Options

- `csvUrls`: Array of URLs to CSV files
- `refreshInterval`: How often to refresh data (in milliseconds)
- `mappings`: Field mappings for different CSV formats

#### Example Configuration

```javascript
const csvIngestionModule = new CSVIngestionModule({
  csvUrls: [
    process.env.PUBLISHED_CSV_LABOR,
    process.env.PUBLISHED_CSV_MATERIALS
  ],
  refreshInterval: 3600000, // 1 hour
  mappings: {
    labor: {
      name: 'Service',
      price: 'Price',
      unit: 'Unit'
    },
    materials: {
      name: 'Material',
      price: 'Price',
      category: 'Category'
    }
  }
});
```

### Authentication Module

The Authentication Module handles user registration, login, and permission management. It supports multiple user roles and secure password management.

#### Configuration Options

- `jwtSecret`: Secret key for JWT token generation
- `tokenExpiration`: Token expiration time
- `roles`: Available user roles and permissions

#### Example Configuration

```javascript
const authenticationModule = new AuthenticationModule({
  jwtSecret: process.env.JWT_SECRET,
  tokenExpiration: '7d',
  roles: {
    customer: ['view_estimates', 'create_estimates'],
    admin: ['view_estimates', 'create_estimates', 'manage_users', 'view_reports'],
    vendor: ['manage_products']
  }
});
```

### Dashboard Module

The Dashboard Module provides analytics and reporting functionality. It includes customizable widgets and data visualization tools.

#### Configuration Options

- `defaultDateRange`: Default time range for reports
- `refreshInterval`: How often to refresh dashboard data
- `widgets`: Available dashboard widgets

#### Example Configuration

```javascript
const dashboardModule = new DashboardModule({
  defaultDateRange: 30, // days
  refreshInterval: 300000, // 5 minutes
  widgets: {
    sales: true,
    leads: true,
    projects: true,
    revenue: true
  }
});
```

### Shopify Integration Module

The Shopify Integration Module synchronizes product data between Shopify and the platform. It handles product creation, updates, and inventory management.

#### Configuration Options

- `shopifyStoreUrl`: Shopify store URL
- `shopifyAccessToken`: Shopify API access token
- `syncInterval`: How often to sync products

#### Example Configuration

```javascript
const shopifyIntegrationModule = new ShopifyIntegrationModule({
  shopifyStoreUrl: process.env.SHOPIFY_STORE_URL,
  shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  syncInterval: 3600000 // 1 hour
});
```

### MongoDB Image Module

The MongoDB Image Module manages product images stored in MongoDB. It provides image retrieval by color name and other attributes.

#### Configuration Options

- `mongodbUri`: MongoDB connection string
- `collectionName`: Collection name for images
- `cloudinaryConfig`: Cloudinary configuration for image optimization

#### Example Configuration

```javascript
const mongoDBImageModule = new MongoDBImageModule({
  mongodbUri: process.env.MONGODB_URI,
  collectionName: 'images',
  cloudinaryConfig: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
});
```

### Stripe Payment Module

The Stripe Payment Module handles payment processing and checkout flows. It supports multiple payment methods and payment schedules.

#### Configuration Options

- `stripeSecretKey`: Stripe API secret key
- `currency`: Default currency
- `paymentMethods`: Available payment methods
- `paymentScheduleOptions`: Available payment schedule options

#### Example Configuration

```javascript
const stripePaymentModule = new StripePaymentModule({
  stripeSecretKey: process.env.STRIPE_SECERET_KEY,
  currency: 'usd',
  paymentMethods: ['card'],
  paymentScheduleOptions: [
    { name: 'Full Payment', value: 100 },
    { name: 'Deposit (50%)', value: 50 },
    { name: 'Deposit (25%)', value: 25 }
  ]
});
```

## API Documentation

### Authentication API

#### Register User

```
POST /api/auth/register
```

Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "555-123-4567"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  },
  "token": "jwt_token_here"
}
```

#### Login

```
POST /api/auth/login
```

Request body:
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  },
  "token": "jwt_token_here"
}
```

### Estimation API

#### Create Estimate

```
POST /api/estimates
```

Request body:
```json
{
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567"
  },
  "project": {
    "name": "Kitchen Remodel",
    "description": "Complete kitchen remodel with new countertops"
  },
  "countertops": [
    {
      "type": "L-Shape",
      "material": "Granite",
      "color": "Black Galaxy",
      "dimensions": {
        "length1": 96,
        "length2": 72,
        "width": 25.5,
        "edgeDetail": 1.5
      },
      "edges": {
        "type": "Bullnose",
        "waterfall": true,
        "waterfallSide": "right"
      }
    }
  ],
  "options": {
    "backsplash": true,
    "backsplashHeight": 4,
    "demolition": true,
    "sink": true
  }
}
```

Response:
```json
{
  "success": true,
  "estimateId": "est_123",
  "totalPrice": 3250.75,
  "breakdown": {
    "materials": 2100.50,
    "labor": 950.25,
    "options": 200.00
  },
  "paymentOptions": [
    {
      "name": "Full Payment",
      "amount": 3250.75
    },
    {
      "name": "50% Deposit",
      "initialAmount": 1625.38,
      "remainingAmount": 1625.37
    }
  ]
}
```

#### Get Estimate

```
GET /api/estimates/:id
```

Response:
```json
{
  "success": true,
  "estimate": {
    "id": "est_123",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-123-4567"
    },
    "project": {
      "name": "Kitchen Remodel",
      "description": "Complete kitchen remodel with new countertops"
    },
    "countertops": [
      {
        "type": "L-Shape",
        "material": "Granite",
        "color": "Black Galaxy",
        "dimensions": {
          "length1": 96,
          "length2": 72,
          "width": 25.5,
          "edgeDetail": 1.5
        },
        "edges": {
          "type": "Bullnose",
          "waterfall": true,
          "waterfallSide": "right"
        }
      }
    ],
    "options": {
      "backsplash": true,
      "backsplashHeight": 4,
      "demolition": true,
      "sink": true
    },
    "totalPrice": 3250.75,
    "breakdown": {
      "materials": 2100.50,
      "labor": 950.25,
      "options": 200.00
    },
    "status": "pending",
    "createdAt": "2025-05-23T15:30:00Z"
  }
}
```

### Payment API

#### Create Checkout Session

```
POST /api/payments/checkout
```

Request body:
```json
{
  "estimateId": "est_123",
  "paymentOption": "full",
  "customerEmail": "john@example.com"
}
```

Response:
```json
{
  "success": true,
  "sessionId": "cs_test_123",
  "url": "https://checkout.stripe.com/pay/cs_test_123"
}
```

#### Create Payment Intent

```
POST /api/payments/intent
```

Request body:
```json
{
  "estimateId": "est_123",
  "amount": 1625.38,
  "description": "50% Deposit for Kitchen Remodel",
  "customerEmail": "john@example.com"
}
```

Response:
```json
{
  "success": true,
  "clientSecret": "pi_123_secret_456",
  "amount": 1625.38
}
```

### Product API

#### Get Products

```
GET /api/products
```

Query parameters:
- `category`: Filter by category
- `color`: Filter by color
- `priceMin`: Minimum price
- `priceMax`: Maximum price

Response:
```json
{
  "success": true,
  "products": [
    {
      "id": "prod_123",
      "name": "Black Galaxy Granite",
      "category": "Granite",
      "price": 65.99,
      "unit": "sqft",
      "imageUrl": "https://example.com/black-galaxy.jpg"
    },
    {
      "id": "prod_124",
      "name": "White Carrara Marble",
      "category": "Marble",
      "price": 75.99,
      "unit": "sqft",
      "imageUrl": "https://example.com/white-carrara.jpg"
    }
  ],
  "total": 2
}
```

#### Get Product by ID

```
GET /api/products/:id
```

Response:
```json
{
  "success": true,
  "product": {
    "id": "prod_123",
    "name": "Black Galaxy Granite",
    "category": "Granite",
    "description": "Beautiful black granite with gold flecks",
    "price": 65.99,
    "unit": "sqft",
    "imageUrl": "https://example.com/black-galaxy.jpg",
    "variants": [
      {
        "id": "var_1",
        "name": "2cm Thickness",
        "price": 65.99
      },
      {
        "id": "var_2",
        "name": "3cm Thickness",
        "price": 75.99
      }
    ],
    "metadata": {
      "origin": "India",
      "hardness": 7
    }
  }
}
```

### Dashboard API

#### Get Dashboard Data

```
GET /api/dashboard
```

Query parameters:
- `dateRange`: Number of days to include (default: 30)
- `widgets`: Comma-separated list of widgets to include

Response:
```json
{
  "success": true,
  "data": {
    "salesOverview": {
      "total": 45250.75,
      "count": 15,
      "average": 3016.72
    },
    "leadFunnel": {
      "total": 45,
      "qualified": 30,
      "quoted": 20,
      "converted": 15
    },
    "projectStatus": {
      "pending": 5,
      "inProgress": 8,
      "completed": 12
    },
    "topProducts": [
      {
        "name": "Black Galaxy Granite",
        "revenue": 15250.50,
        "percentage": 33.7
      },
      {
        "name": "White Carrara Marble",
        "revenue": 12500.25,
        "percentage": 27.6
      }
    ]
  }
}
```

## Extending the Platform

### Adding New Product Types

1. Update the CSV mapping in the CSV Ingestion Module
2. Add new product type to the product schema
3. Update the estimation engine to handle the new product type
4. Add UI components for the new product type

### Adding New Vendors

1. Create a new vendor configuration in the CSV Ingestion Module
2. Set up vendor-specific pricing rules
3. Configure vendor dashboard access

### Creating Custom Dashboard Widgets

1. Define the widget in the Dashboard Module:
```javascript
registerCustomWidget({
  id: 'custom-widget',
  title: 'Custom Widget',
  type: 'chart',
  dataSource: 'getCustomWidgetData',
  refreshInterval: 300000
});
```

2. Implement the data source method:
```javascript
function getCustomWidgetData(userId, filters) {
  // Fetch and process data
  return {
    // Widget data
  };
}
```

3. Add the widget to the dashboard configuration

## Troubleshooting

### Common Issues

#### CSV Import Failures

- Verify that Google Sheets URLs are correct and publicly accessible
- Check CSV format matches expected mapping
- Ensure proper permissions are set on Google Sheets

#### Payment Processing Issues

- Verify Stripe API keys are correct
- Check webhook configuration
- Ensure proper error handling in checkout flow

#### Image Retrieval Problems

- Verify MongoDB connection string
- Check image collection structure
- Ensure color names match between products and images

### Logging

The platform uses a structured logging system. Logs are stored in:

- `logs/app.log`: General application logs
- `logs/error.log`: Error logs
- `logs/access.log`: API access logs

### Support

For additional support, contact:

- Technical Support: support@example.com
- API Documentation: https://api-docs.example.com
- GitHub Repository: https://github.com/your-username/construction-estimator

## License

This platform is licensed under the MIT License. See LICENSE file for details.
