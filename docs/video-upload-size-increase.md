# Video Upload Size Limit Increase

## Summary
Updated the file upload system to support video files up to 200MB (increased from 10MB) to accommodate larger video content needs.

## Changes Made

### 1. FileUpload Component (`src/components/FileUpload.tsx`)
- **Line 45**: Changed default `maxFileSize` from `10` to `200` MB
- This affects all FileUpload components that don't explicitly override the maxFileSize parameter

### 2. Media Upload API (`src/pages/api/media/upload.ts`)
- **Line 22**: Added `maxFileSize: 200 * 1024 * 1024` (200MB) to formidable v3 configuration
- **Line 23**: Added `maxFieldsSize: 20 * 1024 * 1024` (20MB) for form fields
- **Line 28**: Added `maxFileSize = 200 * 1024 * 1024` for formidable v2 fallback
- **Line 29**: Added `maxFieldsSize = 20 * 1024 * 1024` for formidable v2 fallback
- **API Config**: Added `sizeLimit: '200mb'` and `responseLimit: false` to handle large uploads

### 3. Next.js Configuration (`next.config.js`)
- Removed invalid global API configuration (Next.js doesn't support this at root level)
- Configuration is now properly handled in individual API routes

## Technical Details

### File Size Limits
- **Images**: Still efficiently handled with 200MB limit (typically much smaller)
- **Videos**: Now supports up to 200MB files
- **Form fields**: 20MB limit for metadata and other form data

### Formidable Configuration
The upload handler now supports both formidable v2 and v3 with proper size limits:
```typescript
// v3 style
form = formidable({ 
  keepExtensions: true, 
  multiples: false,
  maxFileSize: 200 * 1024 * 1024, // 200MB
  maxFieldsSize: 20 * 1024 * 1024  // 20MB
})

// v2 fallback
form.maxFileSize = 200 * 1024 * 1024
form.maxFieldsSize = 20 * 1024 * 1024
```

### API Route Configuration
Each API route that handles file uploads now includes:
```typescript
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '200mb',
    responseLimit: false,
  },
}
```

## Impact

### Positive
- Users can now upload high-quality videos up to 200MB
- Maintains backward compatibility for existing uploads
- No changes needed for components already using FileUpload

### Considerations
- Larger files will take longer to upload depending on internet speed
- Server storage requirements will increase with larger video files
- Consider implementing progress indicators for long uploads (already included in FileUpload component)

## Components Affected

All components using `FileUpload` will automatically support the new limit:
- `src/app/(main)/listings/[id]/page.tsx` - Product media uploads
- `src/app/(main)/dynamic-pages/page.tsx` - Dynamic page content
- `src/components/CategoryCollectionManager.tsx` - Category images
- `src/components/CreateReviewDialog.tsx` - Review media
- `src/app/(main)/categories/page.tsx` - Category management

The `DynamicFileUpload` component also benefits from these changes as it uses the same API endpoint.

## Testing
- Build process completed successfully with no configuration errors
- All existing file upload functionality remains intact
- Ready for testing with actual large video files

## Deployment Notes
- No database schema changes required
- No additional npm package installations needed
- Changes are backward compatible
