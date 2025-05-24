# CSV-Connected App Deployment Guide

## Overview

This guide provides instructions for deploying the redesigned CSV-connected app. The application features robust multi-vendor CSV integration, real-time data synchronization, and a responsive user interface for construction estimating.

## Deployment Options

### Option 1: Static Web Hosting (Recommended)

The app can be deployed as a static website on any web hosting service that supports static files.

#### Requirements:
- Web server with static file hosting
- HTTPS support recommended for security
- CORS configuration for CSV data sources

#### Deployment Steps:

1. **Prepare the build**
   ```bash
   # Install dependencies
   npm install
   
   # Build the production version
   npm run build
   ```

2. **Configure environment variables**
   Create a `.env` file in the root directory with your CSV URLs:
   ```
   REACT_APP_VENDOR_CSV_URL_1=https://docs.google.com/spreadsheets/d/e/your-csv-id-1/pub?output=csv
   REACT_APP_VENDOR_CSV_URL_2=https://docs.google.com/spreadsheets/d/e/your-csv-id-2/pub?output=csv
   ```

3. **Upload to web hosting**
   Upload the contents of the `build` directory to your web hosting service.

4. **Configure CORS headers (if needed)**
   Ensure your CSV sources allow CORS access from your app's domain.
   
   For Google Sheets, publish to the web with CSV format to avoid CORS issues.

### Option 2: GitHub Pages

Deploy directly from your GitHub repository for free hosting.

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings > Pages
   - Select the branch to deploy (usually `main`)
   - Set the directory to `/docs` or `/build`
   - Save the settings

3. **Update homepage in package.json**
   ```json
   {
     "homepage": "https://yourusername.github.io/repository-name"
   }
   ```

4. **Build and deploy**
   ```bash
   npm run build
   # If using gh-pages package:
   npm run deploy
   ```

### Option 3: Netlify/Vercel Deployment

For automatic deployment with CI/CD:

1. **Connect your repository** to Netlify or Vercel
2. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `build`
3. **Set environment variables** in the platform dashboard
4. **Deploy** by pushing to your connected repository

## Configuration

### CSV Source Configuration

The app is designed to work with multiple CSV data sources. Configure your sources in the `src/config/csv-sources.js` file:

```javascript
export const csvSources = [
  {
    id: 'vendor1',
    name: 'Vendor One',
    url: process.env.REACT_APP_VENDOR_CSV_URL_1,
    refreshInterval: 3600000, // 1 hour
    fieldMapping: {
      colorName: 'Color',
      material: 'Material Type',
      thickness: 'Thickness',
      installedPricePerSqFt: 'Price Per SqFt'
    },
    transformations: {
      installedPricePerSqFt: (value) => parseFloat(value.replace('$', ''))
    }
  },
  {
    id: 'vendor2',
    name: 'Vendor Two',
    url: process.env.REACT_APP_VENDOR_CSV_URL_2,
    refreshInterval: 3600000,
    fieldMapping: {
      colorName: 'ColorName',
      material: 'MaterialType',
      thickness: 'ThicknessInCM',
      installedPricePerSqFt: 'InstalledPrice'
    }
  }
];
```

### Regional Pricing Configuration

Configure regional pricing multipliers in `src/config/regional-pricing.js`:

```javascript
export const regionConfig = {
  default: {
    name: 'National Average',
    multiplier: 1.0
  },
  regions: [
    {
      zipPrefix: '1',
      name: 'Northeast',
      multiplier: 1.25
    },
    {
      zipPrefix: '9',
      name: 'West Coast',
      multiplier: 1.2
    },
    // Add more regions as needed
  ]
};
```

## Maintenance

### Updating CSV Sources

To add or update CSV sources:

1. Ensure your CSV has consistent column headers
2. Update the `csvSources` configuration with appropriate field mappings
3. Deploy the updated configuration

No code changes are required for basic CSV source updates.

### Troubleshooting

Common issues and solutions:

1. **CORS Errors**
   - Ensure CSV sources allow cross-origin requests
   - Use published Google Sheets with CSV output
   - Consider using a CORS proxy for testing

2. **CSV Format Issues**
   - Verify CSV has consistent headers
   - Check for special characters in column names
   - Ensure data types are consistent

3. **Performance Issues**
   - Reduce CSV file size if possible
   - Increase cache duration for stable data
   - Consider implementing pagination for very large datasets

## Scaling Considerations

### Adding New Product Types

To extend the app for new product types:

1. Update the data model in `src/models/product.js`
2. Add type-specific UI components in `src/components/products/`
3. Update CSV field mappings for the new product type
4. Add type-specific business logic as needed

### Supporting More Vendors

The app is designed to scale with additional vendors:

1. Add new vendor configuration to `csvSources`
2. Define appropriate field mappings
3. Implement any vendor-specific transformations
4. Update the UI to display vendor-specific information

## Security Considerations

1. **Data Protection**
   - Use HTTPS for all deployments
   - Consider encrypting sensitive cached data
   - Implement proper input sanitization

2. **API Security**
   - Use read-only access for CSV sources
   - Consider authentication for sensitive pricing data
   - Implement rate limiting for API requests

3. **User Data**
   - Minimize collection of personal information
   - Implement proper data retention policies
   - Consider compliance with relevant regulations

## Backup and Recovery

1. **Data Backup**
   - Regularly backup CSV source files
   - Document CSV structure and field mappings
   - Maintain version history of configuration files

2. **Disaster Recovery**
   - Implement fallback CSV sources
   - Document recovery procedures
   - Test recovery scenarios periodically

## Conclusion

The CSV-connected app provides a robust, scalable solution for construction estimating with real-time pricing data. By following this deployment guide, you can successfully deploy and maintain the application for your business needs.

For additional support or custom development, please contact the development team.
