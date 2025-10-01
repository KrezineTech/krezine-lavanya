# CSV Import/Export Functionality for Products

This document describes the comprehensive CSV import/export functionality implemented for the products management system.

## Overview

The system provides complete CSV import/export capabilities that support Shopify-compatible field structures, allowing users to:

1. **Export all products** to CSV format with complete field data
2. **Import products** in bulk from CSV files 
3. **Update existing products** via CSV import
4. **Validate CSV data** with comprehensive error reporting

## Features Implemented

### 📊 Export Functionality
- **Complete Product Export**: Exports all products with full field data
- **Shopify-Compatible Format**: Uses standard Shopify CSV field names and structure
- **Relation Inclusion**: Includes category, collection, and media information
- **Automatic File Download**: Generates timestamped CSV files

### 📥 Import Functionality  
- **Bulk Product Import**: Create multiple products from a single CSV file
- **Update Existing Products**: Updates products by SKU or name matching
- **Category/Collection Auto-Creation**: Automatically creates categories and collections if they don't exist
- **Comprehensive Validation**: Validates all fields with detailed error reporting
- **Progress Tracking**: Shows import results with created/updated/skipped counts

### 🔧 Field Mapping

The system supports all major Shopify CSV fields:

#### Core Product Fields
- **Handle**: Product slug/URL identifier
- **Title**: Product name (required)
- **Body (HTML)**: Product description
- **Vendor**: Product vendor/brand
- **Product Category**: Category assignment
- **Type**: Product type
- **Tags**: Comma-separated product tags
- **Published**: Publication status (TRUE/FALSE)

#### Variant Fields
- **Variant SKU**: Product SKU
- **Variant Price**: Product price in dollars
- **Variant Compare At Price**: Original/compare price
- **Variant Inventory Qty**: Stock quantity
- **Variant Inventory Tracker**: Inventory tracking method
- **Variant Inventory Policy**: Stock policy (deny/continue)
- **Variant Requires Shipping**: Shipping requirement
- **Variant Taxable**: Tax applicability
- **Variant Grams**: Product weight in grams

#### Media Fields
- **Image Src**: Primary product image URL
- **Image Position**: Image display order
- **Image Alt Text**: Image alt text for accessibility
- **Variant Image**: Variant-specific image

#### SEO Fields
- **SEO Title**: Meta title
- **SEO Description**: Meta description

#### Regional Pricing Fields
- **Price / United States**: US-specific pricing
- **Compare At Price / United States**: US compare price
- **Price / International**: International pricing
- **Compare At Price / International**: International compare price

#### Additional Fields
- **Status**: Product status (Active/Draft/Inactive)
- **Gift Card**: Gift card indicator
- **Google Shopping** fields for merchant integration

## File Structure

### Core Files Created/Modified

```
src/
├── lib/
│   └── product-csv-utils.ts          # CSV processing utilities
├── pages/api/products/
│   ├── export-csv.ts                 # CSV export endpoint
│   └── import-csv.ts                 # CSV import endpoint
└── app/(main)/
    └── listings/
        └── page.tsx                  # Listings page with integrated CSV functionality

public/
└── sample-listings-import.csv        # Sample CSV template
```

### API Endpoints

#### GET `/api/products/export-csv`
- **Purpose**: Export all products to CSV format
- **Response**: CSV file download with timestamped filename
- **Format**: `products-export-YYYY-MM-DD.csv`

#### POST `/api/products/import-csv`
- **Purpose**: Import products from uploaded CSV file
- **Request**: Multipart form data with CSV file
- **Response**: JSON with import results and error details

## Usage Instructions

### Exporting Products

1. Navigate to **Products Management** page
2. Click the **CSV Import/Export** tab
3. Click **Export CSV** button
4. CSV file will automatically download

### Importing Products

1. Prepare your CSV file using the exported format or sample template
2. Navigate to **Products Management** page  
3. Click the **CSV Import/Export** tab
4. Select your CSV file using the file picker
5. Click **Import CSV** button
6. Review import results and any error messages

### CSV Format Guidelines

#### Required Fields
- **Title**: Product name (cannot be empty)

#### Optional but Recommended Fields
- **Variant Price**: Product price in dollars (defaults to 0.00)
- **Variant Inventory Qty**: Stock quantity (defaults to 0)
- **Product Category**: Category name (auto-creates if not found)
- **Status**: Active, Draft, or Inactive (defaults to Draft)

#### Data Format Rules
- **Prices**: Use decimal format (e.g., 29.99, not 2999)
- **Boolean Fields**: Use TRUE/FALSE, true/false, or 1/0
- **Arrays**: Use comma-separated values (e.g., "tag1, tag2, tag3")
- **HTML Content**: Can include HTML tags in description fields
- **Text Limits**: Respect field length limits (see validation details)

## Validation Rules

### Field Validation
- **Title**: Required, max 255 characters
- **SKU**: Optional, max 100 characters, alphanumeric + hyphens/underscores
- **Price**: Must be 0 or greater, max $999,999.99
- **Stock**: Must be 0 or greater, max 999,999 (whole numbers only)
- **Status**: Must be Active, Draft, or Inactive
- **Description**: Max 1,000 characters
- **Tags**: Max 20 tags, 50 characters each
- **Category/Collection**: Max 100 characters each

### Error Handling
- **Parse Errors**: Invalid CSV format, missing quotes, etc.
- **Validation Errors**: Field format issues, out-of-range values
- **Database Errors**: Duplicate SKUs, constraint violations
- **Row-Level Reporting**: Errors reported with specific row numbers

## Database Integration

### Product Creation/Updates
- **New Products**: Created if no matching SKU or name found
- **Existing Products**: Updated based on SKU match (primary) or name match (fallback)
- **Category Resolution**: Finds existing categories by name or creates new ones
- **Collection Handling**: Manages product-collection associations

### Data Transformation
- **Price Conversion**: Dollars to cents for database storage
- **Array Fields**: Converts comma-separated strings to arrays
- **Boolean Conversion**: Normalizes various boolean formats
- **Null Handling**: Proper handling of empty/null values

## User Interface

### Products Management Page
- **Statistics Dashboard**: Shows total products, active/draft counts, total value
- **Product List View**: Displays current products with key information
- **CSV Tab**: Dedicated interface for import/export operations
- **Import Results**: Real-time feedback on import success/failures
- **Sample Download**: Provides template CSV for reference

### Visual Feedback
- **Progress Indicators**: Loading states during import/export
- **Success Messages**: Confirmation of successful operations
- **Error Display**: Clear error messages with actionable information
- **Statistics Updates**: Real-time updates after import operations

## Technical Implementation

### Backend Architecture
- **Prisma Integration**: Full integration with existing database schema
- **File Handling**: Secure multipart file upload processing
- **Transaction Safety**: Proper error handling and rollback mechanisms
- **Performance Optimization**: Efficient bulk operations

### Frontend Features
- **React Components**: Modern component-based architecture
- **File Upload**: Drag-and-drop file selection interface
- **Real-time Updates**: Automatic refresh after import operations
- **Responsive Design**: Mobile-friendly interface

### Security Considerations
- **File Validation**: CSV file type and content validation
- **Input Sanitization**: Prevents injection attacks
- **Error Handling**: Secure error messages without data leakage
- **CORS Configuration**: Proper cross-origin request handling

## Sample Data

The system includes a sample CSV file (`/sample-products.csv`) with example products demonstrating:
- Different product types (art, pottery, jewelry)
- Various field combinations
- Proper formatting examples
- Category and tag usage

## Error Reporting

### Import Error Types
1. **CSV Format Errors**: Malformed CSV, encoding issues
2. **Field Validation Errors**: Invalid data types, out-of-range values
3. **Business Logic Errors**: Duplicate SKUs, missing required data
4. **Database Errors**: Constraint violations, connection issues

### Error Message Format
```
Row 3: Price "invalid_price" is not a valid decimal number
Row 5: Title is required and cannot be empty
Row 8: SKU "INVALID SKU!" contains invalid characters
```

## Future Enhancements

### Potential Improvements
- **Image URL Import**: Support for importing product images via URLs
- **Bulk Media Upload**: Attach media files during CSV import
- **Advanced Mapping**: Custom field mapping configuration
- **Scheduled Imports**: Automated import scheduling
- **Export Filtering**: Selective export based on criteria
- **Template Generation**: Custom CSV template creation

### Integration Possibilities
- **Shopify Sync**: Direct Shopify store synchronization
- **Multi-format Support**: Excel, JSON export options
- **API Extensions**: RESTful API for programmatic access
- **Webhook Support**: Real-time notifications for import events

## Conclusion

This CSV import/export system provides a robust, user-friendly solution for bulk product management. It combines comprehensive field support, thorough validation, and excellent error reporting to ensure reliable data operations while maintaining compatibility with industry-standard formats like Shopify's CSV structure.

The implementation follows best practices for security, performance, and user experience, making it suitable for both small-scale operations and large bulk imports.
