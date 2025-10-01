# URL-Based Image Display Implementation Guide

## Overview

This guide demonstrates how to implement URL-based image display for product details pages using the `ProductImageDisplay` component. The implementation follows the same patterns used in the product listings page for consistency and reliability.

## Component Features

### 🖼️ **ProductImageDisplay Component**

A versatile image display component that handles:
- **URL-based image loading** (no file uploads required)
- **Multiple display variants** (header, grid, single)
- **Error handling and fallbacks**
- **Primary image selection**
- **Image removal controls**
- **Responsive design**
- **Performance optimization**

## Implementation Examples

### 1. Header Image Display

```tsx
// Small header image with count badge
<ProductImageDisplay
  images={product.photos}
  variant="header"
  size={{ width: 56, height: 56 }}
  showCount={true}
  onImageClick={(image) => {
    // Navigate to photos section
    document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth' });
  }}
/>
```

**Features:**
- 56x56px thumbnail size
- Shows primary image or first available
- Badge showing additional image count (+3, etc.)
- Click to navigate to full photo section

### 2. Grid Image Display

```tsx
// Full photo management grid
<ProductImageDisplay
  images={product.photos}
  variant="grid"
  showPrimaryControl={true}
  showRemoveControl={true}
  showCount={true}
  onMakePrimary={(imageId) => handleMakePrimary(imageId)}
  onRemoveImage={(imageId) => handleRemovePhoto(imageId)}
  onImageClick={(image) => openLightbox(image)}
/>
```

**Features:**
- Responsive grid layout (2-5 columns based on screen size)
- Hover controls for primary selection and removal
- Primary badge on main image
- Image numbering (1, 2, 3, etc.)
- Click to view in lightbox/modal

### 3. Single Image Display

```tsx
// Large single image view
<ProductImageDisplay
  images={product.photos}
  variant="single"
  showRemoveControl={true}
  onRemoveImage={(imageId) => handleRemovePhoto(imageId)}
  onImageClick={(image) => openFullScreen(image)}
/>
```

**Features:**
- Large card-based display
- Hover zoom effect
- Remove control overlay
- Image metadata display

## Image Data Structure

```typescript
interface ProductImage {
  id: string;           // Unique identifier
  src: string;          // Image URL
  hint: string;         // Alt text / description
  isPrimary?: boolean;  // Primary image flag
}

// Example image data
const productImages: ProductImage[] = [
  {
    id: 'img-1',
    src: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400',
    hint: 'Product front view',
    isPrimary: true
  },
  {
    id: 'img-2', 
    src: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400',
    hint: 'Product detail shot'
  }
];
```

## URL-Based Image Sources

### Supported URL Patterns

✅ **Direct Image URLs**
```
https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400
https://cdn.shopify.com/s/files/1/0234/567/products/product-image.jpg
https://yourdomain.com/uploads/product-123.jpg
```

✅ **CDN URLs**
```
https://res.cloudinary.com/demo/image/upload/sample.jpg
https://imagedelivery.net/abc123/image-id/public
```

✅ **Placeholder Services**
```
https://via.placeholder.com/400x400/e2e8f0/64748b?text=Product+Image
https://placehold.co/400x400/png?text=Product
```

### Error Handling

The component automatically handles:
- **Failed image loads** → Fallback to placeholder
- **Invalid URLs** → Graceful error display
- **Network issues** → Loading states and retries
- **Missing images** → Empty state UI

## Integration with Product Details Page

### Complete Implementation

```tsx
import ProductImageDisplay from '@/components/ProductImageDisplay';

export default function ProductDetailsPage() {
  const [product, setProduct] = useState(initialProduct);

  const handleMakePrimary = (imageId: string) => {
    const photos = [...product.photos];
    const primaryIndex = photos.findIndex(p => p.id === imageId);
    
    if (primaryIndex > -1) {
      const primaryPhoto = photos.splice(primaryIndex, 1)[0];
      const reorderedPhotos = [primaryPhoto, ...photos].map((p, index) => ({
        ...p,
        isPrimary: index === 0,
      }));
      
      setProduct({
        ...product,
        photos: reorderedPhotos
      });
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const updatedPhotos = product.photos.filter(p => p.id !== photoId);
    setProduct({
      ...product,
      photos: updatedPhotos
    });
  };

  return (
    <div>
      {/* Header with small image */}
      <header className="flex items-center gap-4">
        <ProductImageDisplay
          images={product.photos}
          variant="header"
          showCount={true}
        />
        <h1>{product.title}</h1>
      </header>

      {/* Main photo section */}
      <section className="mt-8">
        <h2>Product Photos</h2>
        <ProductImageDisplay
          images={product.photos}
          variant="grid"
          showPrimaryControl={true}
          showRemoveControl={true}
          showCount={true}
          onMakePrimary={handleMakePrimary}
          onRemoveImage={handleRemovePhoto}
        />
      </section>
    </div>
  );
}
```

## Styling and Layout

### Responsive Grid Breakpoints

```css
/* Grid columns adapt to screen size */
grid-cols-2      /* Mobile: 2 columns */
sm:grid-cols-3   /* Small: 3 columns */
md:grid-cols-4   /* Medium: 4 columns */
lg:grid-cols-5   /* Large: 5 columns */
```

### Image Aspect Ratios

- **Header images**: Fixed size (56x56px)
- **Grid images**: Square aspect ratio (1:1)
- **Single images**: Square with responsive sizing

### Hover Effects

- **Scale transform**: Subtle zoom on hover
- **Overlay controls**: Primary/remove buttons
- **Opacity transitions**: Smooth hover states

## Performance Optimization

### Next.js Image Optimization

```tsx
// Automatic optimization
priority={image.isPrimary}           // LCP optimization
sizes="(max-width: 640px) 50vw..."   // Responsive sizes
unoptimized={isPlaceholder}          // Skip optimization for placeholders
```

### Error Handling

```tsx
onError={() => handleImageError(imageId)}
onLoad={() => handleImageLoad(imageId)}
```

### Loading States

- **Priority loading** for primary images
- **Lazy loading** for secondary images
- **Fallback placeholders** for failed loads

## Best Practices

### ✅ Do's

- **Use consistent aspect ratios** for grid display
- **Implement proper error handling** for all image sources
- **Provide meaningful alt text** in the `hint` field
- **Optimize image URLs** with appropriate sizes
- **Test with various image sources** (CDNs, direct URLs, etc.)

### ❌ Don'ts

- **Don't hardcode image sizes** - use responsive sizing
- **Don't skip error handling** - always provide fallbacks
- **Don't use oversized images** - optimize for web display
- **Don't ignore accessibility** - ensure proper alt text

## API Integration

### Fetching Image Data

```typescript
// Example API response structure
interface ProductResponse {
  id: string;
  title: string;
  media: {
    id: string;
    filePath: string;    // Image URL
    altText: string;     // Alt text
    isPrimary: boolean;  // Primary flag
    fileType: 'IMAGE' | 'VIDEO';
  }[];
}

// Transform API data to component format
const transformImages = (media: ProductResponse['media']) => {
  return media
    .filter(m => m.fileType === 'IMAGE')
    .map(m => ({
      id: m.id,
      src: m.filePath,
      hint: m.altText,
      isPrimary: m.isPrimary
    }));
};
```

### Saving Changes

```typescript
// Update primary image
const updatePrimaryImage = async (productId: string, imageId: string) => {
  await fetch(`/api/products/${productId}/images/${imageId}/primary`, {
    method: 'PATCH'
  });
};

// Remove image
const removeImage = async (productId: string, imageId: string) => {
  await fetch(`/api/products/${productId}/images/${imageId}`, {
    method: 'DELETE'
  });
};
```

## Testing

### Manual Testing Checklist

- [ ] Images load correctly from various URL sources
- [ ] Error states display properly for invalid URLs
- [ ] Primary image selection works
- [ ] Remove functionality works
- [ ] Responsive layout adapts to screen sizes
- [ ] Hover effects work on desktop
- [ ] Touch interactions work on mobile

### Test Image URLs

```typescript
// Good test URLs
const testImages = [
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400',
  'https://via.placeholder.com/400x400/0066cc/ffffff?text=Test+Image',
  'https://picsum.photos/400/400?random=1'
];

// Broken URLs for error testing
const brokenImages = [
  'https://invalid-url.com/missing.jpg',
  'https://httpstat.us/404.jpg',
  '/path/to/missing/image.jpg'
];
```

## Conclusion

This URL-based image display system provides:

- **Consistent styling** with the listings page
- **Robust error handling** for reliable display
- **Performance optimization** for fast loading
- **Flexible variants** for different use cases
- **Comprehensive controls** for image management

The implementation maintains consistency with existing patterns while providing enhanced functionality for product detail pages.
