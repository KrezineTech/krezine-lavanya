# Dynamic Pages System Documentation

## Overview

The Dynamic Pages system provides a comprehensive CRUD interface for managing dynamic content across your website. This system allows administrators to update text, images, and videos for various sections of the frontend through an intuitive admin panel.

## Features

- **Full CRUD Operations**: Create, Read, Update, Delete dynamic content
- **Media Management**: Upload and manage images and videos
- **Section-based Organization**: Content organized by page sections
- **Live Frontend Updates**: Changes reflect immediately on the frontend
- **Responsive Design**: Content adapts to desktop and mobile displays
- **Flexible Content Fields**: Support for various content types per section

## Architecture

### Database Schema

The system uses a `DynamicPage` model with the following key fields:

```prisma
model DynamicPage {
  id              String             @id @default(cuid())
  section         DynamicPageSection
  title           String?
  subtitle        String?
  description     String?
  buttonText      String?
  desktopImage    String?
  mobileImage     String?
  image           String?
  videoSource     String?
  paragraph1      String?
  paragraph2      String?
  designerImage   String?
  designerQuote   String?
  bannerImage     String?
  interiorImage   String?
  paragraphTexts  Json?
  metaData        Json?
  isActive        Boolean            @default(true)
  sortOrder       Int                @default(0)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}
```

### API Endpoints

#### Base URL: `/api/dynamic-pages`

- **GET /api/dynamic-pages** - List all dynamic pages
- **GET /api/dynamic-pages?section={SECTION}** - Get pages by section
- **POST /api/dynamic-pages** - Create new dynamic page
- **GET /api/dynamic-pages/{id}** - Get specific dynamic page
- **PUT /api/dynamic-pages/{id}** - Update dynamic page
- **DELETE /api/dynamic-pages/{id}** - Delete dynamic page

#### Request/Response Examples

**Create Dynamic Page:**
```json
POST /api/dynamic-pages
{
  "section": "HOME_HERO_SLIDER",
  "title": "Welcome to Our Gallery",
  "subtitle": "Discover amazing artwork",
  "buttonText": "Explore Now",
  "desktopImage": "https://example.com/hero-desktop.jpg",
  "mobileImage": "https://example.com/hero-mobile.jpg",
  "isActive": true,
  "sortOrder": 0
}
```

**Update Dynamic Page:**
```json
PUT /api/dynamic-pages/{id}
{
  "title": "Updated Title",
  "isActive": false
}
```

## Available Sections

### Home Page Sections

1. **HOME_HERO_SLIDER**
   - Fields: `desktopImage`, `mobileImage`, `title`, `subtitle`, `buttonText`
   - Component: `HeroSlider.tsx`

2. **HOME_VIDEO_SHOWCASE**
   - Fields: `videoSource`, `title`, `description`
   - Component: `VideoShowcase.tsx`

3. **HOME_MEET_ARTIST**
   - Fields: `image`, `title`, `paragraph1`, `paragraph2`
   - Component: `MeetTheArtist.tsx`

4. **HOME_CUSTOM_PAINTING_SECTION**
   - Fields: `videoSource`, `title`, `subtitle`
   - Component: `CustomPaintingSection.tsx`

### About Page Sections

5. **ABOUT_PAGE_HEADER**
   - Fields: `desktopImage`, `mobileImage`, `title`
   - Component: `PageHeader.tsx`

6. **ABOUT_CONTENT**
   - Fields: `designerImage`, `designerQuote`, `bannerImage`, `interiorImage`, `paragraphTexts`
   - Component: `AboutContent.tsx`

### Shared Page Headers

7. **SHARED_REVIEWS_HEADER**
   - Fields: `image`, `title`
   - Component: `PageHeader.tsx`

8. **SHARED_BLOG_HEADER**
   - Fields: `image`, `title`
   - Component: `PageHeader.tsx`

9. **SHARED_FAQ_HEADER**
   - Fields: `image`, `title`
   - Component: `PageHeader.tsx`

10. **SHARED_CONTACT_HEADER**
    - Fields: `image`, `title`
    - Component: `PageHeader.tsx`

## Usage Guide

### Admin Panel Access

1. Navigate to the **Dynamic Pages** section in the admin sidebar
2. Select the section you want to manage using the tabs
3. Create, edit, or delete content as needed
4. Changes are immediately available via the API

### Frontend Integration

To use dynamic content in your frontend components:

```tsx
import { DynamicPagesService } from '@/services/dynamicPagesService';

// In your component
const [content, setContent] = useState<DynamicPageData | null>(null);

useEffect(() => {
  const fetchContent = async () => {
    try {
      const data = await DynamicPagesService.getBySection('HOME_HERO_SLIDER');
      setContent(data);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  fetchContent();
}, []);
```

### Using Provided Components

The system includes pre-built components for each section:

```tsx
import HeroSlider from '@/components/frontend/HeroSlider';
import VideoShowcase from '@/components/frontend/VideoShowcase';
import MeetTheArtist from '@/components/frontend/MeetTheArtist';
import PageHeader from '@/components/frontend/PageHeader';

// Use in your pages
<HeroSlider />
<VideoShowcase />
<MeetTheArtist />
<PageHeader section="ABOUT_PAGE_HEADER" defaultTitle="About Us" />
```

## Field Types and Validation

### Text Fields
- **title**: Short descriptive text (recommended: 2-10 words)
- **subtitle**: Supporting text (recommended: 5-20 words)
- **description**: Longer descriptive text (recommended: 20-100 words)
- **buttonText**: Call-to-action text (recommended: 1-3 words)

### Paragraph Fields
- **paragraph1**, **paragraph2**: Long-form content (recommended: 50-200 words each)
- **paragraphTexts**: Array of paragraph strings for multiple paragraphs
- **designerQuote**: Quotation text (recommended: 20-50 words)

### Image Fields
- **desktopImage**: Optimized for desktop viewing (recommended: 1600x900px)
- **mobileImage**: Optimized for mobile viewing (recommended: 600x800px)
- **image**: General purpose image (recommended: 800x600px)
- **designerImage**: Portrait image (recommended: 400x300px)
- **bannerImage**: Wide banner image (recommended: 1920x800px)
- **interiorImage**: Interior scene image (recommended: 500x400px)

### Media Fields
- **videoSource**: Video URL or file path (supported formats: MP4, WebM)

### Control Fields
- **isActive**: Boolean to enable/disable content display
- **sortOrder**: Integer for ordering multiple items in the same section

## Error Handling

The system includes comprehensive error handling:

- **404 Errors**: When content is not found
- **Validation Errors**: For invalid data formats
- **Database Errors**: For connection or constraint issues
- **File Upload Errors**: For media upload failures

Example error response:
```json
{
  "error": "Dynamic page not found",
  "code": "NOT_FOUND"
}
```

## Best Practices

### Content Management
1. **Use descriptive titles** that clearly indicate the content purpose
2. **Optimize images** for web delivery (compress and resize appropriately)
3. **Test content** on both desktop and mobile devices
4. **Keep content updated** and relevant to your audience

### Performance
1. **Use appropriate image sizes** for each field type
2. **Compress videos** for faster loading
3. **Enable content caching** where possible
4. **Monitor API response times**

### SEO
1. **Include relevant keywords** in titles and descriptions
2. **Use descriptive alt text** for images
3. **Keep content fresh** and regularly updated
4. **Structure content** for readability

## Troubleshooting

### Common Issues

**Content not appearing on frontend:**
- Check if content is marked as `isActive: true`
- Verify the correct section is being queried
- Check browser console for JavaScript errors

**Images not loading:**
- Verify image URLs are accessible
- Check image file formats are supported
- Ensure proper CORS headers if using external images

**API errors:**
- Check database connection
- Verify Prisma schema is up to date
- Check server logs for detailed error messages

## Development

### Adding New Sections

1. **Update the enum** in the Prisma schema:
```prisma
enum DynamicPageSection {
  // ... existing sections
  NEW_SECTION_NAME
}
```

2. **Add to the field mapping** in the admin component:
```tsx
const SECTION_FIELDS: Record<DynamicPageSection, string[]> = {
  // ... existing mappings
  NEW_SECTION_NAME: ['title', 'image', 'description']
};
```

3. **Create a frontend component** for the new section
4. **Run Prisma migration** to update the database
5. **Update TypeScript types** if needed

### Extending Field Types

To add new field types:
1. Update the database schema
2. Modify the form component to handle new field types
3. Update TypeScript interfaces
4. Add validation rules
5. Update the seed script if needed

## Migration

If migrating from an existing content system:

1. **Export existing content** to JSON format
2. **Map fields** to the new schema structure
3. **Create migration script** using the provided seed script as a template
4. **Test thoroughly** before going live
5. **Update frontend components** to use the new system

## Conclusion

The Dynamic Pages system provides a robust, scalable solution for managing website content. It separates content management from code deployment, allowing for real-time updates without requiring technical knowledge. The system is designed to grow with your needs and can be extended to support additional content types and sections as required.
