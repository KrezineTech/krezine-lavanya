# CSV Import/Export Feature Documentation

## Overview

The CSV Import/Export feature allows you to bulk manage product listings by importing from and exporting to CSV files. This feature is integrated into the main listings page and provides a seamless way to handle large datasets.

## Features

### Export Functionality
- **Export All Listings**: Export all currently displayed listings to a CSV file
- **Filtered Export**: Only listings that match current filters are exported
- **Automatic Filename**: Files are named with timestamp (e.g., `listings-export-2024-08-29.csv`)
- **Complete Data**: All product fields are included in the export

### Import Functionality
- **CSV File Upload**: Select and upload CSV files from your computer
- **Real-time Validation**: Immediate validation of CSV data with error reporting
- **Preview Before Import**: Review all items before committing the import
- **Bulk Processing**: Efficient batch processing for large files
- **Update Existing**: Automatically updates products with matching SKUs or IDs
- **Progress Tracking**: Visual progress indicator during import

### Template and Help
- **Download Template**: Get a pre-formatted CSV template with sample data
- **Format Guide**: Comprehensive help documentation with examples
- **Field Reference**: Complete description of all available fields

## CSV Format

### Required Fields
- **Title**: Product name (required)

### Optional Fields
- **ID**: Unique identifier (leave empty for new products)
- **SKU**: Stock Keeping Unit
- **Stock Quantity**: Available inventory
- **Price (USD)**: Product price in decimal format
- **Sale Price (USD)**: Optional sale price
- **Status**: Active, Draft, Sold Out, or Inactive
- **Category**: Product category
- **Collection**: Product collection
- **Description**: Product description
- **Tags**: Multiple tags separated by semicolons (;)
- **Medium**: Art medium (multiple values with semicolons)
- **Style**: Art style (multiple values with semicolons)
- **Materials**: Materials used (multiple values with semicolons)
- **Techniques**: Techniques used (multiple values with semicolons)
- **Personalization Enabled**: Yes/No or True/False
- **Shipping Profile**: Shipping profile name
- **Return Policy**: Return policy details

### Data Format Rules

1. **Headers**: First row must contain column headers
2. **Multiple Values**: Use semicolons (;) to separate multiple values
3. **Prices**: Use decimal format (29.99, not $29.99)
4. **Boolean Fields**: Accept Yes/No or True/False
5. **Empty Fields**: Treated as no change for updates or default values for new products
6. **Encoding**: Use UTF-8 encoding to preserve special characters

### Example CSV Content

```csv
ID,Title,SKU,Stock Quantity,Price (USD),Sale Price (USD),Status,Category,Collection,Description,Tags,Medium,Style,Materials,Techniques,Personalization Enabled,Shipping Profile,Return Policy
,Beautiful Mountain Landscape,ART-MOUNTAIN-001,5,149.99,129.99,Active,Landscape Art,Nature Collection,A stunning mountain landscape painting,nature; landscape; mountains,Canvas; Digital Print,Realistic; Contemporary,Acrylic Paint; Canvas,Brush; Palette Knife,Yes,Standard Shipping,30 Day Return Policy
,Abstract Color Symphony,ART-ABSTRACT-002,3,89.99,,Active,Abstract Art,Modern Collection,A vibrant abstract piece,abstract; modern; colorful,Canvas,Abstract; Modern,Oil Paint; Canvas,Brush; Spray,No,Standard Shipping,30 Day Return Policy
```

## Usage Instructions

### Exporting Data

1. Navigate to the Listings page
2. Apply any filters if you want to export a subset of listings
3. Click the "Export CSV" button in the toolbar
4. The CSV file will automatically download to your default download folder

### Importing Data

1. Prepare your CSV file using the template or format guide
2. Click the "Import CSV" button in the toolbar
3. Select your CSV file from the file picker
4. Review the import preview:
   - Green items are valid and will be imported
   - Red items have errors and will be skipped
   - Check the summary for new vs. update counts
5. Click "Import X Items" to proceed
6. Monitor the progress bar during import
7. Review the completion message for results

### Getting Started

1. Click "Download Template" to get a sample CSV file
2. Open the template in your preferred spreadsheet application
3. Replace the sample data with your product information
4. Save as CSV format with UTF-8 encoding
5. Use the import feature to upload your data

## Error Handling

### Common Import Errors
- **Missing Title**: Product title is required for all items
- **Invalid Price**: Price must be a valid number ≥ 0
- **Invalid Stock**: Stock quantity must be a valid number ≥ 0
- **Invalid Status**: Status must be one of: Active, Draft, Expired, Sold Out, Inactive
- **Field Too Long**: Some fields have character limits (Title: 200 chars, SKU: 50 chars)

### Troubleshooting
- **File Not Recognized**: Ensure file has .csv extension
- **Parsing Errors**: Check for unescaped quotes or commas in data
- **Encoding Issues**: Save file with UTF-8 encoding
- **Large Files**: For very large files, consider breaking into smaller batches

## Technical Implementation

### Components
- `CSVImportExport.tsx`: Main component with export/import functionality
- `CSVHelp.tsx`: Help dialog with format documentation
- `csv-utils.ts`: Utility functions for CSV parsing and generation

### API Endpoints
- `GET /api/listings`: Fetch listings for export
- `POST /api/listings/bulk-import`: Bulk import endpoint for CSV data

### Performance Considerations
- Files are processed in batches to prevent overwhelming the server
- Progress tracking provides user feedback during long operations
- Error handling ensures partial imports don't corrupt data

## Best Practices

1. **Test with Small Files**: Start with a small CSV to test the format
2. **Backup Data**: Export current data before large imports
3. **Use Templates**: Start with the provided template to ensure correct format
4. **Validate Data**: Review the preview carefully before importing
5. **Monitor Progress**: Don't close the browser during import operations
6. **Check Results**: Review the completion message and refresh the listings to verify results

## Limitations

- Maximum file size depends on browser and server limitations
- Very large imports may take several minutes to complete
- Network interruptions during import may require retrying
- Some complex product configurations may require manual setup after import

## Future Enhancements

- Support for image imports via URLs
- Advanced field mapping options
- Scheduled imports
- Import history and rollback capabilities
- Excel file support (.xlsx)
- Custom field validation rules
