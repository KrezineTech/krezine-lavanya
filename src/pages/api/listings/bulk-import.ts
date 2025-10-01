import { NextApiRequest, NextApiResponse } from 'next';
import type { Listing } from '@/lib/types';
import { getBaseUrl } from '@/lib/api-utils';
import { generateSlug } from '@/lib/slug-utils';

interface ImportItem {
  // Core fields
  id?: string;
  title: string;
  sku: string;
  stock: number;
  priceMin: number;
  priceMax?: number;
  salePrice?: number;
  image?: string;
  status: string;
  section: string;
  description?: string;
  hasVideo?: boolean;
  hint?: string;
  shippingProfile?: string;
  returnPolicy?: string;
  tags: string[];
  medium?: string[];
  style?: string[];
  materials?: string[];
  techniques?: string[];
  collection?: string;
  personalization?: boolean;
  countrySpecificPrices?: any[];
  isUpdate?: boolean;
  existingId?: string;
  
  // Extended Shopify fields
  handle?: string;
  bodyHtml?: string;
  vendor?: string;
  productCategory?: string;
  type?: string;
  published?: boolean;
  
  // Product Options
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  option3Name?: string;
  option3Value?: string;
  
  // Variant Details
  variantSku?: string;
  variantGrams?: number;
  variantInventoryTracker?: string;
  variantInventoryQty?: number;
  variantInventoryPolicy?: string;
  variantFulfillmentService?: string;
  variantPrice?: number;
  variantCompareAtPrice?: number;
  variantRequiresShipping?: boolean;
  variantTaxable?: boolean;
  variantBarcode?: string;
  
  // Images
  imageSrc?: string;
  imagePosition?: number;
  imageAltText?: string;
  variantImage?: string;
  
  // Additional Product Info
  giftCard?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  
  // Google Shopping
  googleProductCategory?: string;
  googleGender?: string;
  googleAgeGroup?: string;
  googleMpn?: string;
  googleCondition?: string;
  googleCustomProduct?: string;
  
  // Variant Additional
  variantWeightUnit?: string;
  variantTaxCode?: string;
  costPerItem?: number;
  
  // Regional Pricing
  includedUnitedStates?: boolean;
  priceUnitedStates?: number;
  compareAtPriceUnitedStates?: number;
  includedInternational?: boolean;
  priceInternational?: number;
  compareAtPriceInternational?: number;
}

/**
 * Generates a unique slug for a product by checking existing products
 * @param baseText - The text to generate slug from (title or handle)
 * @param rowIndex - The row index to ensure uniqueness within batch
 * @returns string - Unique slug
 */
function generateUniqueProductSlug(baseText: string, rowIndex: number): string {
  const baseSlug = generateSlug(baseText);
  
  if (!baseSlug) {
    // Fallback for edge cases where text produces empty slug
    const timestamp = Date.now().toString();
    return `product-${timestamp}-${rowIndex}`;
  }
  
  // For CSV imports, add row index to ensure uniqueness within the batch
  // This handles the case where multiple rows have the same handle/title
  return `${baseSlug}-${rowIndex}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { items }: { items: ImportItem[] } = req.body;

    // Enhanced validation
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    if (items.length > 1000) {
      return res.status(400).json({ 
        error: 'Too many items for bulk import', 
        message: 'Maximum 1000 items allowed per bulk import. Please split into smaller batches.' 
      });
    }

    // Validate required fields for each item
    const validationErrors: string[] = [];
    items.forEach((item, index) => {
      if (!item.title?.trim()) {
        validationErrors.push(`Item ${index + 1}: Title is required`);
      }
      if (!item.sku?.trim()) {
        validationErrors.push(`Item ${index + 1}: SKU is required`);
      }
      if (item.priceMin === undefined || item.priceMin < 0) {
        validationErrors.push(`Item ${index + 1}: Valid price is required`);
      }
      if (item.stock === undefined || item.stock < 0) {
        validationErrors.push(`Item ${index + 1}: Valid stock quantity is required`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
      warnings: [] as string[],
      summary: {
        totalItems: items.length,
        duplicateSkus: [] as string[],
        processingTime: 0,
      }
    };

    const startTime = Date.now();

    // Check for duplicate SKUs within the batch
    const skuCounts: Record<string, number> = {};
    items.forEach(item => {
      if (item.sku) {
        skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1;
      }
    });
    
    const duplicateSkus = Object.keys(skuCounts).filter(sku => skuCounts[sku] > 1);
    if (duplicateSkus.length > 0) {
      results.summary.duplicateSkus = duplicateSkus;
      results.warnings.push(`Duplicate SKUs found in batch: ${duplicateSkus.join(', ')}`);
    }

    // Process items in batches to avoid overwhelming the database
    const batchSize = 5; // Smaller batch size for better error handling
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item, batchIndex) => {
        const itemIndex = i + batchIndex + 1;
        
        try {
          // Skip duplicate SKUs (only process first occurrence)
          if (duplicateSkus.includes(item.sku)) {
            const firstOccurrence = items.findIndex(i => i.sku === item.sku);
            if (items.indexOf(item) !== firstOccurrence) {
              results.warnings.push(`Skipped duplicate SKU ${item.sku} in item ${itemIndex}`);
              return { status: 'skipped', itemIndex };
            }
          }

          const baseUrl = getBaseUrl(req);
          const listingData = {
            name: item.title,
            sku: item.sku,
            stockQuantity: item.stock,
            priceCents: Math.round(Number(item.priceMin || 0) * 100), // Convert to cents
            compareAtCents: item.priceMax ? Math.round(Number(item.priceMax) * 100) : undefined,
            salePriceCents: item.salePrice ? Math.round(Number(item.salePrice) * 100) : undefined,
            status: item.status || 'Draft',
            categoryId: item.section, // This will be resolved by the API
            shortDescription: item.description || item.hint || item.title,
            description: item.bodyHtml || item.description,
            shippingProfile: item.shippingProfile || '',
            returnPolicy: item.returnPolicy || '',
            tags: item.tags || [],
            medium: item.medium || [],
            style: item.style || [],
            materials: item.materials || [],
            techniques: item.techniques || [],
            collectionIds: item.collection ? [item.collection] : [],
            personalization: item.personalization || false,
            countrySpecificPrices: item.countrySpecificPrices || [],
            
            // SEO fields
            metaTitle: item.seoTitle || item.title,
            metaDescription: item.seoDescription || item.description,
            
            // Product options and variants
            productType: item.type || '',
            vendor: item.vendor || '',
            handle: item.handle || item.sku,
            slug: generateUniqueProductSlug(item.handle || item.title || item.sku, itemIndex),
            
            // Variant details 
            variantWeight: item.variantGrams,
            variantBarcode: item.variantBarcode,
            variantInventoryPolicy: item.variantInventoryPolicy || 'deny',
            variantFulfillmentService: item.variantFulfillmentService || 'manual',
            variantRequiresShipping: item.variantRequiresShipping !== false,
            variantTaxable: item.variantTaxable !== false,
            
            // Google Shopping fields
            googleProductCategory: item.googleProductCategory,
            googleGender: item.googleGender,
            googleAgeGroup: item.googleAgeGroup,
            googleMpn: item.googleMpn,
            googleCondition: item.googleCondition || 'new',
            googleCustomProduct: item.googleCustomProduct,
            
            // Gift card and cost
            giftCard: item.giftCard || false,
            costPerItem: item.costPerItem,
            
            // Regional pricing
            priceUnitedStates: item.priceUnitedStates,
            compareAtPriceUnitedStates: item.compareAtPriceUnitedStates,
            priceInternational: item.priceInternational,
            compareAtPriceInternational: item.compareAtPriceInternational,
            includedUnitedStates: item.includedUnitedStates,
            includedInternational: item.includedInternational,
            
            // Media handling - if image URL is provided
            imageUrl: item.imageSrc || item.image || item.variantImage,
            imageAltText: item.imageAltText,
            
            // Product options
            option1Name: item.option1Name,
            option1Value: item.option1Value,
            option2Name: item.option2Name,
            option2Value: item.option2Value,
            option3Name: item.option3Name,
            option3Value: item.option3Value,
            
            // Additional fields
            weightUnit: item.variantWeightUnit || 'g',
            taxCode: item.variantTaxCode,
            published: item.published !== false,
            
            // Store all Shopify-specific data in metadata for future use
            shopifyData: {
              handle: item.handle,
              vendor: item.vendor,
              productCategory: item.productCategory,
              type: item.type,
              published: item.published,
              giftCard: item.giftCard,
              variantInventoryTracker: item.variantInventoryTracker,
              variantWeightUnit: item.variantWeightUnit,
              variantTaxCode: item.variantTaxCode,
              costPerItem: item.costPerItem,
              googleProductCategory: item.googleProductCategory,
              googleGender: item.googleGender,
              googleAgeGroup: item.googleAgeGroup,
              googleMpn: item.googleMpn,
              googleCondition: item.googleCondition,
              googleCustomProduct: item.googleCustomProduct,
              regionalPricing: {
                includedUnitedStates: item.includedUnitedStates,
                priceUnitedStates: item.priceUnitedStates,
                compareAtPriceUnitedStates: item.compareAtPriceUnitedStates,
                includedInternational: item.includedInternational,
                priceInternational: item.priceInternational,
                compareAtPriceInternational: item.compareAtPriceInternational,
              }
            },

            // Extended fields for CSV compatibility
            csvExtendedFields: {
              handle: item.handle,
              vendor: item.vendor,
              productType: item.type,
              published: item.published,
              giftCard: item.giftCard,
              option1Name: item.option1Name,
              option1Value: item.option1Value,
              option2Name: item.option2Name,
              option2Value: item.option2Value,
              option3Name: item.option3Name,
              option3Value: item.option3Value,
              variantSku: item.variantSku,
              variantGrams: item.variantGrams,
              variantInventoryTracker: item.variantInventoryTracker,
              variantInventoryPolicy: item.variantInventoryPolicy,
              variantFulfillmentService: item.variantFulfillmentService,
              variantRequiresShipping: item.variantRequiresShipping,
              variantTaxable: item.variantTaxable,
              variantBarcode: item.variantBarcode,
              variantWeightUnit: item.variantWeightUnit,
              variantTaxCode: item.variantTaxCode,
              imageUrl: item.imageSrc || item.image || item.variantImage,
              imageAltText: item.imageAltText,
              costPerItem: item.costPerItem,
              seoTitle: item.seoTitle,
              seoDescription: item.seoDescription,
              googleProductCategory: item.googleProductCategory,
              googleGender: item.googleGender,
              googleAgeGroup: item.googleAgeGroup,
              googleMpn: item.googleMpn,
              googleCondition: item.googleCondition,
              googleCustomProduct: item.googleCustomProduct,
              priceUnitedStates: item.priceUnitedStates,
              compareAtPriceUnitedStates: item.compareAtPriceUnitedStates,
              includedUnitedStates: item.includedUnitedStates,
              priceInternational: item.priceInternational,
              compareAtPriceInternational: item.compareAtPriceInternational,
              includedInternational: item.includedInternational
            }
          };

          let response: Response;
          let operation: string;

          if (item.isUpdate && item.existingId) {
            // Update existing listing
            operation = 'update';
            response = await fetch(`${baseUrl}/api/listings/${item.existingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.cookie || '',
              },
              body: JSON.stringify(listingData),
            });
          } else {
            // Create new listing
            operation = 'create';
            response = await fetch(`${baseUrl}/api/listings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.cookie || '',
              },
              body: JSON.stringify(listingData),
            });
          }

          if (response.ok) {
            return { 
              status: operation === 'update' ? 'updated' : 'imported', 
              itemIndex, 
              sku: item.sku 
            };
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            const errorDetail = `${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
            
            return {
              status: 'failed',
              itemIndex,
              sku: item.sku,
              error: `Failed to ${operation} listing: ${errorDetail}`
            };
          }
        } catch (error) {
          return {
            status: 'failed',
            itemIndex,
            sku: item.sku,
            error: `Error processing item: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process results
      batchResults.forEach(result => {
        switch (result.status) {
          case 'imported':
            results.imported++;
            break;
          case 'updated':
            results.updated++;
            break;
          case 'failed':
            results.failed++;
            if (result.error) {
              results.errors.push(`Item ${result.itemIndex} (SKU: ${result.sku}): ${result.error}`);
            }
            break;
          case 'skipped':
            // Already handled in warnings
            break;
        }
      });

      // Add small delay between batches to prevent overwhelming the server
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    results.summary.processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      results,
      message: `Import completed: ${results.imported} created, ${results.updated} updated, ${results.failed} failed`,
      performance: {
        processingTimeMs: results.summary.processingTime,
        itemsPerSecond: Math.round(items.length / (results.summary.processingTime / 1000))
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during import',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
