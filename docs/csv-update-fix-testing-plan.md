# CSV Import Update Fix - Testing Plan

## Problem Summary
CSV-imported products were losing their extended metadata when updated through individual product edit operations. This happened because the update endpoint (`/api/listings/[id]`) wasn't preserving the CSV-specific fields stored in the `metadata` JSON column.

## Solution Implemented
Enhanced both bulk import and individual update endpoints to properly handle CSV extended fields:

### 1. Bulk Import Endpoint (`/api/listings/bulk-import.ts`)
- Added `csvExtendedFields` parameter to contain all extended CSV/Shopify fields
- Structured the metadata to include these fields in a dedicated section
- Prevents property duplication by organizing extended fields separately

### 2. Individual Update Endpoint (`/api/listings/[id].ts`)
- Added support for `csvExtendedFields` parameter in request body
- Enhanced metadata preservation logic to merge incoming CSV extended fields
- Ensures all existing CSV metadata is preserved during updates

## Testing Steps

### Step 1: Import CSV Products
1. Use the CSV import functionality with a file containing Shopify-compatible fields
2. Verify products are created with extended metadata stored in the `metadata` column
3. Check that fields like `handle`, `vendor`, `productType`, pricing, etc. are preserved

### Step 2: Update Imported Products
1. Select a product that was imported via CSV
2. Update a basic field (name, description, price, etc.) through the individual product edit interface
3. Verify that:
   - The basic field update is applied correctly
   - All CSV extended fields remain intact in the metadata
   - No data is lost during the update process

### Step 3: Update CSV Extended Fields
1. Update a CSV-specific field (e.g., `handle`, `vendor`, `productType`)
2. Verify that:
   - The CSV field is updated correctly
   - Other CSV fields remain unchanged
   - Basic product fields are not affected

### Step 4: Mixed Updates
1. Update both basic fields and CSV extended fields in a single operation
2. Verify that all changes are applied correctly
3. Check that no existing data is lost

## Verification Queries

### Check Product Metadata
```sql
SELECT id, name, metadata FROM "Product" WHERE metadata IS NOT NULL;
```

### Check Specific CSV Fields in Metadata
```sql
SELECT 
  id, 
  name,
  metadata->'handle' as handle,
  metadata->'vendor' as vendor,
  metadata->'productType' as product_type,
  metadata->'csvExtendedFields' as csv_extended_fields
FROM "Product" 
WHERE metadata ? 'csvExtendedFields' OR metadata ? 'handle';
```

## Expected Results
- ✅ CSV imports create products with extended metadata
- ✅ Individual product updates preserve all existing CSV metadata
- ✅ CSV extended fields can be updated without affecting other data
- ✅ Mixed updates (basic + CSV fields) work correctly
- ✅ No data loss occurs during any update operation

## Files Modified
1. `/src/pages/api/listings/[id].ts` - Individual product update endpoint
2. `/src/pages/api/listings/bulk-import.ts` - Bulk CSV import endpoint

## Key Changes Made
- Added `csvExtendedFields` parameter support in both endpoints
- Enhanced metadata merging logic to preserve CSV data
- Structured metadata organization to prevent property conflicts
- Maintained backward compatibility with existing update operations
