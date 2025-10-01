# Integrated Media Upload System for Dynamic Pages

## 📋 Overview

The dynamic pages system is now fully integrated with your project's existing media upload infrastructure. This provides a seamless way to manage images and videos across your application with proper file storage, database tracking, and organized folder structure.

## 🚀 How It Works

### Upload Process
1. **File Selection**: Users can drag & drop or click to select images/videos
2. **Upload to Server**: Files are uploaded via `/api/media/upload` endpoint
3. **Database Storage**: Media metadata is stored in the `Media` table
4. **File Organization**: Files are organized in `public/uploads/dynamic-pages/[section]/` folders
5. **URL Generation**: File paths are automatically generated and stored in dynamic page fields

### File Organization Structure
```
public/uploads/
├── dynamic-pages/
│   ├── HOME_HERO_SLIDER/
│   │   ├── 1755123456789-hero-image.jpg
│   │   └── 1755123456790-hero-video.mp4
│   ├── ABOUT_PAGE_HEADER/
│   │   └── 1755123456791-about-banner.jpg
│   └── [other-sections]/
│       └── [uploaded-files]
```

## 🎯 Features

### ✅ Integrated Features
- **Drag & Drop Upload**: Modern file upload interface
- **File Type Detection**: Automatic image/video recognition
- **Database Integration**: All uploads tracked in Media table
- **Organized Storage**: Files organized by dynamic page section
- **Preview Functionality**: Real-time preview of uploaded media
- **URL Fallback**: Manual URL input for external media
- **Progress Indication**: Upload progress feedback
- **Error Handling**: Comprehensive error management

### 📁 File Types Supported
- **Images**: PNG, JPG, JPEG, GIF, WebP
- **Videos**: MP4, MOV, AVI, WebM

### 💾 Database Integration
All uploaded files are tracked in the `Media` table with:
- File metadata (size, type, dimensions)
- Relationship to dynamic page sections
- Organized folder structure
- Upload timestamps

## 🔧 Technical Implementation

### Core Components

#### 1. FileUpload Component
```typescript
<FileUpload
  ownerType="dynamic-pages"
  ownerId={section}
  onUploaded={(uploadedMedia) => {
    // Handle successful upload
    const media = uploadedMedia[0];
    const mediaUrl = media.filePath;
    // Update form with new file path
  }}
/>
```

#### 2. API Integration
- **Upload Endpoint**: `/api/media/upload`
- **Dynamic Pages API**: `/api/dynamic-pages`
- **CORS Support**: Full cross-origin support
- **File Validation**: Server-side file type validation

#### 3. Database Schema
```sql
-- Media table stores all uploaded files
Media {
  id: String (Primary Key)
  fileName: String
  filePath: String (Public URL)
  fileType: FileType (IMAGE/VIDEO)
  fileSize: Int
  mimeType: String
  metadata: Json (Contains section info)
  createdAt: DateTime
}

-- Dynamic pages reference media via filePath
DynamicPage {
  desktopImage: String (filePath)
  mobileImage: String (filePath)
  image: String (filePath)
  videoSource: String (filePath)
  // ... other fields
}
```

## 📱 User Interface

### Section-Based Forms
Each page section has its own dedicated form with relevant media fields:

#### Home Page Sections
- **Hero Slider**: Desktop image, mobile image, title, subtitle, button text
- **Video Showcase**: Video source, title, description
- **Meet Artist**: Artist image, paragraphs, quotes
- **Custom Painting**: Video source, title, subtitle

#### About Page Sections
- **Page Header**: Desktop/mobile banner images, title, subtitle
- **Content**: Designer image, quote, banner image, interior image, paragraphs

#### Shared Components
- **Reviews Header**: Header image, title
- **Blog Header**: Header image, title
- **FAQ Header**: Header image, title
- **Contact Header**: Header image, title

### Upload Interface Features
- **Drag & Drop Zone**: Visual feedback for file dropping
- **Progress Indicator**: Upload status and progress bar
- **Preview Panel**: Immediate preview of uploaded media
- **Manual URL Input**: Fallback for external media URLs
- **File Type Icons**: Visual indicators for image/video types

## 🔄 Data Flow

### Upload Flow
1. User selects/drops file in FileUpload component
2. File is sent to `/api/media/upload` with `ownerType="dynamic-pages"`
3. Server saves file to `public/uploads/dynamic-pages/[section]/`
4. Media record created in database with metadata
5. File path returned to frontend
6. Dynamic page form updated with new file path
7. Form submission saves file path to DynamicPage record

### Retrieval Flow
1. Dynamic pages API returns page data with file paths
2. Frontend displays media using stored file paths
3. SafeImage component handles image rendering with proper dimensions
4. Video elements use file paths for video sources

## 🛠️ Configuration

### Environment Setup
Ensure these are configured in your environment:
```env
DATABASE_URL="your-postgresql-connection-string"
```

### File Permissions
Ensure the `public/uploads/` directory has proper write permissions:
```bash
chmod 755 public/uploads/
```

### Storage Considerations
- Files are stored locally in `public/uploads/`
- Consider CDN integration for production deployments
- Implement file cleanup for deleted media records

## 🚨 Best Practices

### File Management
- **File Naming**: Automatic timestamp-based naming prevents conflicts
- **Organization**: Files organized by section for easy management
- **Cleanup**: Regular cleanup of orphaned files recommended
- **Backup**: Include uploads directory in backup strategies

### Performance
- **Image Optimization**: Consider implementing image compression
- **Lazy Loading**: Use NextJS Image component for optimized loading
- **CDN**: Consider CDN for production file serving
- **Caching**: Implement proper cache headers for static assets

### Security
- **File Validation**: Server-side file type and size validation
- **Upload Limits**: Implement file size and count limits
- **Access Control**: Ensure proper access controls on upload endpoints
- **Sanitization**: File names are automatically sanitized

## 📊 Monitoring & Maintenance

### Database Queries
Monitor media table growth and implement cleanup strategies:
```sql
-- Find orphaned media files
SELECT * FROM "Media" 
WHERE "productId" IS NULL 
AND "categoryId" IS NULL 
AND "collectionId" IS NULL 
AND "metadata"->>'ownerType' = 'dynamic-pages';

-- Clean up old unused media
DELETE FROM "Media" 
WHERE "createdAt" < NOW() - INTERVAL '30 days' 
AND /* additional conditions for unused files */;
```

### File System Maintenance
- Regular cleanup of unused files in uploads directory
- Monitor disk space usage
- Implement log rotation for upload logs

## 🎉 Success!

Your dynamic pages system now has:
- ✅ Full integration with existing media upload infrastructure
- ✅ Organized file storage by page sections
- ✅ Database tracking of all uploaded media
- ✅ Seamless user experience with drag & drop
- ✅ Real-time preview and URL fallback options
- ✅ Proper error handling and progress indication

The system is ready for production use with your existing media management workflows!
