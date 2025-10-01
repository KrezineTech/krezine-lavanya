import { Listing } from '@/lib/types';
import { 
  COMPLETE_CSV_FIELD_MAPPING, 
  parseCSVBoolean, 
  parseCSVNumber, 
  parseCSVInteger, 
  parseCSVArray,
  CSV_FIELD_VALIDATORS,
  CSV_FIELD_TRANSFORMERS,
  CSV_EXPORT_TRANSFORMERS
} from '@/lib/csv-field-mappings';

// Use the complete field mapping
export const CSV_FIELD_MAPPING = COMPLETE_CSV_FIELD_MAPPING;

export type CSVHeaders = typeof CSV_FIELD_MAPPING;
export type CSVFieldKey = keyof CSVHeaders;

// Extended Listing type for Shopify compatibility
export interface ShopifyCompatibleListing extends Listing {
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

// Convert listing data to Shopify-compatible CSV format
export function listingToCSVRow(listing: ShopifyCompatibleListing): Record<string, string> {
  return {
    // Core Product Fields
    [CSV_FIELD_MAPPING.handle]: listing.handle || listing.sku || '',
    [CSV_FIELD_MAPPING.title]: listing.title || '',
    [CSV_FIELD_MAPPING.bodyHtml]: listing.bodyHtml || listing.description || '',
    [CSV_FIELD_MAPPING.vendor]: listing.vendor || '',
    [CSV_FIELD_MAPPING.productCategory]: listing.productCategory || listing.section || '',
    [CSV_FIELD_MAPPING.type]: listing.type || '',
    [CSV_FIELD_MAPPING.tags]: (listing.tags || []).join(', '),
    [CSV_FIELD_MAPPING.published]: listing.published !== undefined ? (listing.published ? 'TRUE' : 'FALSE') : (listing.status === 'Active' ? 'TRUE' : 'FALSE'),
    
    // Product Options
    [CSV_FIELD_MAPPING.option1Name]: listing.option1Name || '',
    [CSV_FIELD_MAPPING.option1Value]: listing.option1Value || '',
    [CSV_FIELD_MAPPING.option2Name]: listing.option2Name || '',
    [CSV_FIELD_MAPPING.option2Value]: listing.option2Value || '',
    [CSV_FIELD_MAPPING.option3Name]: listing.option3Name || '',
    [CSV_FIELD_MAPPING.option3Value]: listing.option3Value || '',
    
    // Variant Details
    [CSV_FIELD_MAPPING.variantSku]: listing.variantSku || listing.sku || '',
    [CSV_FIELD_MAPPING.variantGrams]: listing.variantGrams?.toString() || '',
    [CSV_FIELD_MAPPING.variantInventoryTracker]: listing.variantInventoryTracker || 'shopify',
    [CSV_FIELD_MAPPING.variantInventoryQty]: listing.variantInventoryQty?.toString() || listing.stock?.toString() || '0',
    [CSV_FIELD_MAPPING.variantInventoryPolicy]: listing.variantInventoryPolicy || 'deny',
    [CSV_FIELD_MAPPING.variantFulfillmentService]: listing.variantFulfillmentService || 'manual',
    [CSV_FIELD_MAPPING.variantPrice]: listing.variantPrice?.toFixed(2) || listing.priceMin?.toFixed(2) || '0.00',
    [CSV_FIELD_MAPPING.variantCompareAtPrice]: listing.variantCompareAtPrice?.toFixed(2) || listing.salePrice?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.variantRequiresShipping]: listing.variantRequiresShipping !== undefined ? (listing.variantRequiresShipping ? 'TRUE' : 'FALSE') : 'TRUE',
    [CSV_FIELD_MAPPING.variantTaxable]: listing.variantTaxable !== undefined ? (listing.variantTaxable ? 'TRUE' : 'FALSE') : 'TRUE',
    [CSV_FIELD_MAPPING.variantBarcode]: listing.variantBarcode || '',
    
    // Images
    [CSV_FIELD_MAPPING.imageSrc]: listing.imageSrc || listing.image || '',
    [CSV_FIELD_MAPPING.imagePosition]: listing.imagePosition?.toString() || '1',
    [CSV_FIELD_MAPPING.imageAltText]: listing.imageAltText || listing.hint || '',
    [CSV_FIELD_MAPPING.variantImage]: listing.variantImage || '',
    
    // Additional Product Info
    [CSV_FIELD_MAPPING.giftCard]: listing.giftCard ? 'TRUE' : 'FALSE',
    [CSV_FIELD_MAPPING.seoTitle]: listing.seoTitle || listing.title || '',
    [CSV_FIELD_MAPPING.seoDescription]: listing.seoDescription || listing.description || '',
    
    // Google Shopping
    [CSV_FIELD_MAPPING.googleProductCategory]: listing.googleProductCategory || '',
    [CSV_FIELD_MAPPING.googleGender]: listing.googleGender || '',
    [CSV_FIELD_MAPPING.googleAgeGroup]: listing.googleAgeGroup || '',
    [CSV_FIELD_MAPPING.googleMpn]: listing.googleMpn || '',
    [CSV_FIELD_MAPPING.googleCondition]: listing.googleCondition || 'new',
    [CSV_FIELD_MAPPING.googleCustomProduct]: listing.googleCustomProduct || '',
    
    // Variant Additional
    [CSV_FIELD_MAPPING.variantWeightUnit]: listing.variantWeightUnit || 'g',
    [CSV_FIELD_MAPPING.variantTaxCode]: listing.variantTaxCode || '',
    [CSV_FIELD_MAPPING.costPerItem]: listing.costPerItem?.toFixed(2) || '',
    
    // Regional Pricing
    [CSV_FIELD_MAPPING.includedUnitedStates]: listing.includedUnitedStates !== undefined ? (listing.includedUnitedStates ? 'TRUE' : 'FALSE') : 'TRUE',
    [CSV_FIELD_MAPPING.priceUnitedStates]: listing.priceUnitedStates?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.compareAtPriceUnitedStates]: listing.compareAtPriceUnitedStates?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.includedInternational]: listing.includedInternational !== undefined ? (listing.includedInternational ? 'TRUE' : 'FALSE') : 'TRUE',
    [CSV_FIELD_MAPPING.priceInternational]: listing.priceInternational?.toFixed(2) || '',
    [CSV_FIELD_MAPPING.compareAtPriceInternational]: listing.compareAtPriceInternational?.toFixed(2) || '',
    
    // Status
    [CSV_FIELD_MAPPING.status]: listing.status || 'draft'
  };
}

// Convert CSV row to Shopify-compatible listing data format
export function csvRowToListing(row: Record<string, string>, rowNumber?: number): Partial<ShopifyCompatibleListing> {
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';
  const parseErrors: string[] = [];
  
  const enhancedParseInt = (value: string | undefined, fieldName: string): number | undefined => {
    const result = parseCSVInteger(value);
    if (value && value.trim() !== '' && result === undefined) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not a valid number`);
    }
    return result;
  };

  const enhancedParseFloat = (value: string | undefined, fieldName: string): number | undefined => {
    const result = parseCSVNumber(value);
    if (value && value.trim() !== '' && result === undefined) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not a valid decimal number`);
    }
    return result;
  };

  const parseArrayField = (value: string | undefined, fieldName: string): string[] => {
    try {
      return parseCSVArray(value);
    } catch (error) {
      parseErrors.push(`${prefix}${fieldName} could not be parsed - use comma (,) to separate multiple values`);
      return [];
    }
  };

  const parseBooleanField = (value: string | undefined, fieldName: string): boolean => {
    const result = parseCSVBoolean(value);
    const validValues = ['yes', 'true', '1', 'no', 'false', '0', ''];
    if (value && value.trim() !== '' && !validValues.includes(value.trim().toLowerCase())) {
      parseErrors.push(`${prefix}${fieldName} "${value}" is not valid. Use: yes/no, true/false, or 1/0`);
    }
    return result;
  };

  const parseStatus = (value: string | undefined): Listing['status'] => {
    if (!value || value.trim() === '') return 'Draft';
    const validStatuses: Listing['status'][] = ['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'];
    const trimmed = value.trim() as Listing['status'];
    if (!validStatuses.includes(trimmed)) {
      parseErrors.push(`${prefix}Status "${value}" is invalid. Valid options: ${validStatuses.join(', ')}`);
      return 'Draft';
    }
    return trimmed;
  };

  try {
    const result: Partial<ShopifyCompatibleListing> = {
      // Map to existing Listing fields with enhanced parsing
      id: undefined, // Will be generated
      title: row[CSV_FIELD_MAPPING.title]?.trim() || '',
      sku: row[CSV_FIELD_MAPPING.variantSku]?.trim() || row[CSV_FIELD_MAPPING.sku]?.trim() || '',
      stock: enhancedParseInt(row[CSV_FIELD_MAPPING.variantInventoryQty], 'Variant Inventory Qty') || 
             enhancedParseInt(row[CSV_FIELD_MAPPING.stock], 'Stock') || 0,
      priceMin: enhancedParseFloat(row[CSV_FIELD_MAPPING.variantPrice], 'Variant Price') || 
                enhancedParseFloat(row[CSV_FIELD_MAPPING.priceMin], 'Price') || 0,
      priceMax: enhancedParseFloat(row[CSV_FIELD_MAPPING.variantCompareAtPrice], 'Variant Compare At Price') ||
                enhancedParseFloat(row[CSV_FIELD_MAPPING.priceMax], 'Price Max') ||
                enhancedParseFloat(row[CSV_FIELD_MAPPING.variantPrice], 'Variant Price') || 0,
      salePrice: enhancedParseFloat(row[CSV_FIELD_MAPPING.salePrice], 'Sale Price'),
      image: row[CSV_FIELD_MAPPING.imageSrc]?.trim() || row[CSV_FIELD_MAPPING.image]?.trim() || '',
      status: parseStatus(row[CSV_FIELD_MAPPING.status]),
      section: row[CSV_FIELD_MAPPING.productCategory]?.trim() || row[CSV_FIELD_MAPPING.section]?.trim() || '',
      description: row[CSV_FIELD_MAPPING.bodyHtml]?.trim() || row[CSV_FIELD_MAPPING.description]?.trim() || '',
      hasVideo: false, // Default
      hint: row[CSV_FIELD_MAPPING.imageAltText]?.trim() || row[CSV_FIELD_MAPPING.hint]?.trim() || '',
      shippingProfile: row[CSV_FIELD_MAPPING.shippingProfile]?.trim() || '',
      returnPolicy: row[CSV_FIELD_MAPPING.returnPolicy]?.trim() || '',
      tags: parseArrayField(row[CSV_FIELD_MAPPING.tags], 'Tags'),
      medium: parseArrayField(row[CSV_FIELD_MAPPING.medium], 'Medium'),
      style: parseArrayField(row[CSV_FIELD_MAPPING.style], 'Style'),
      materials: parseArrayField(row[CSV_FIELD_MAPPING.materials], 'Materials'),
      techniques: parseArrayField(row[CSV_FIELD_MAPPING.techniques], 'Techniques'),
      personalization: parseBooleanField(row[CSV_FIELD_MAPPING.personalization], 'Personalization'),
      collection: row[CSV_FIELD_MAPPING.collection]?.trim() || '',
      
      // Shopify-specific fields
      handle: row[CSV_FIELD_MAPPING.handle]?.trim() || '',
      bodyHtml: row[CSV_FIELD_MAPPING.bodyHtml]?.trim() || '',
      vendor: row[CSV_FIELD_MAPPING.vendor]?.trim() || '',
      productCategory: row[CSV_FIELD_MAPPING.productCategory]?.trim() || '',
      type: row[CSV_FIELD_MAPPING.type]?.trim() || '',
      published: parseBooleanField(row[CSV_FIELD_MAPPING.published], 'Published'),
      
      // Product Options
      option1Name: row[CSV_FIELD_MAPPING.option1Name]?.trim() || '',
      option1Value: row[CSV_FIELD_MAPPING.option1Value]?.trim() || '',
      option2Name: row[CSV_FIELD_MAPPING.option2Name]?.trim() || '',
      option2Value: row[CSV_FIELD_MAPPING.option2Value]?.trim() || '',
      option3Name: row[CSV_FIELD_MAPPING.option3Name]?.trim() || '',
      option3Value: row[CSV_FIELD_MAPPING.option3Value]?.trim() || '',
      
      // Variant Details
      variantSku: row[CSV_FIELD_MAPPING.variantSku]?.trim() || '',
      variantGrams: enhancedParseFloat(row[CSV_FIELD_MAPPING.variantGrams], 'Variant Grams'),
      variantInventoryTracker: row[CSV_FIELD_MAPPING.variantInventoryTracker]?.trim() || '',
      variantInventoryQty: enhancedParseInt(row[CSV_FIELD_MAPPING.variantInventoryQty], 'Variant Inventory Qty'),
      variantInventoryPolicy: row[CSV_FIELD_MAPPING.variantInventoryPolicy]?.trim() || '',
      variantFulfillmentService: row[CSV_FIELD_MAPPING.variantFulfillmentService]?.trim() || '',
      variantPrice: enhancedParseFloat(row[CSV_FIELD_MAPPING.variantPrice], 'Variant Price'),
      variantCompareAtPrice: enhancedParseFloat(row[CSV_FIELD_MAPPING.variantCompareAtPrice], 'Variant Compare At Price'),
      variantRequiresShipping: parseBooleanField(row[CSV_FIELD_MAPPING.variantRequiresShipping], 'Variant Requires Shipping'),
      variantTaxable: parseBooleanField(row[CSV_FIELD_MAPPING.variantTaxable], 'Variant Taxable'),
      variantBarcode: row[CSV_FIELD_MAPPING.variantBarcode]?.trim() || '',
      
      // Images
      imageSrc: row[CSV_FIELD_MAPPING.imageSrc]?.trim() || '',
      imagePosition: enhancedParseInt(row[CSV_FIELD_MAPPING.imagePosition], 'Image Position'),
      imageAltText: row[CSV_FIELD_MAPPING.imageAltText]?.trim() || '',
      variantImage: row[CSV_FIELD_MAPPING.variantImage]?.trim() || '',
      
      // Additional Product Info
      giftCard: parseBooleanField(row[CSV_FIELD_MAPPING.giftCard], 'Gift Card'),
      seoTitle: row[CSV_FIELD_MAPPING.seoTitle]?.trim() || '',
      seoDescription: row[CSV_FIELD_MAPPING.seoDescription]?.trim() || '',
      
      // Google Shopping
      googleProductCategory: row[CSV_FIELD_MAPPING.googleProductCategory]?.trim() || '',
      googleGender: row[CSV_FIELD_MAPPING.googleGender]?.trim() || '',
      googleAgeGroup: row[CSV_FIELD_MAPPING.googleAgeGroup]?.trim() || '',
      googleMpn: row[CSV_FIELD_MAPPING.googleMpn]?.trim() || '',
      googleCondition: row[CSV_FIELD_MAPPING.googleCondition]?.trim() || '',
      googleCustomProduct: row[CSV_FIELD_MAPPING.googleCustomProduct]?.trim() || '',
      
      // Variant Additional
      variantWeightUnit: row[CSV_FIELD_MAPPING.variantWeightUnit]?.trim() || '',
      variantTaxCode: row[CSV_FIELD_MAPPING.variantTaxCode]?.trim() || '',
      costPerItem: enhancedParseFloat(row[CSV_FIELD_MAPPING.costPerItem], 'Cost per item'),
      
      // Regional Pricing
      includedUnitedStates: parseBooleanField(row[CSV_FIELD_MAPPING.includedUnitedStates], 'Included / United States'),
      priceUnitedStates: enhancedParseFloat(row[CSV_FIELD_MAPPING.priceUnitedStates], 'Price / United States'),
      compareAtPriceUnitedStates: enhancedParseFloat(row[CSV_FIELD_MAPPING.compareAtPriceUnitedStates], 'Compare At Price / United States'),
      includedInternational: parseBooleanField(row[CSV_FIELD_MAPPING.includedInternational], 'Included / International'),
      priceInternational: enhancedParseFloat(row[CSV_FIELD_MAPPING.priceInternational], 'Price / International'),
      compareAtPriceInternational: enhancedParseFloat(row[CSV_FIELD_MAPPING.compareAtPriceInternational], 'Compare At Price / International'),
      
      // Initialize required fields for Listing compatibility
      last30Days: { visits: 0, favorites: 0 },
      allTime: { sales: 0, revenue: 0, renewals: 0 }
    };
    
    // Apply field validations
    Object.entries(CSV_FIELD_VALIDATORS).forEach(([fieldKey, validator]) => {
      const value = (result as any)[fieldKey];
      if (value !== undefined && validator) {
        try {
          const error = (validator as (val: any) => string | null)(value);
          if (error) {
            parseErrors.push(`${prefix}${error}`);
          }
        } catch (validationError) {
          parseErrors.push(`${prefix}Validation error for ${fieldKey}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
        }
      }
    });
    
    // Add any parsing errors to the result for later processing
    if (parseErrors.length > 0) {
      (result as any)._parseErrors = parseErrors;
    }
    
    return result;
  } catch (error) {
    throw new Error(`${prefix}Failed to parse row data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate CSV content from listings array
export function generateCSV(listings: ShopifyCompatibleListing[]): string {
  const headers = Object.values(CSV_FIELD_MAPPING);
  const csvRows = [headers.join(',')];

  listings.forEach(listing => {
    const row = listingToCSVRow(listing);
    const csvRow = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = value.replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
        ? `"${escaped}"` 
        : escaped;
    });
    csvRows.push(csvRow.join(','));
  });

  return csvRows.join('\n');
}

// Parse CSV content to array of listing objects
export function parseCSV(csvContent: string): { data: Partial<ShopifyCompatibleListing>[], errors: string[] } {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must contain at least a header row and one data row'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine);
  
  // Validate required headers
  const requiredHeaders = [CSV_FIELD_MAPPING.title];
  const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { data: [], errors };
  }

  // Parse data rows
  const data: Partial<ShopifyCompatibleListing>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const values = parseCSVRow(line);
      
      // Skip rows that are completely empty
      if (values.every(val => !val || val.trim() === '')) {
        continue;
      }
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
        continue;
      }

      // Create object from row
      const rowObject: Record<string, string> = {};
      headers.forEach((header, index) => {
        // Ensure we have a value, even if it's an empty string
        rowObject[header] = values[index] !== undefined ? values[index] : '';
      });

      // Convert to listing format with additional error handling
      let listing: Partial<ShopifyCompatibleListing>;
      try {
        listing = csvRowToListing(rowObject, i + 1);
        
        // Check for parsing errors embedded in the result
        const parseErrors = (listing as any)._parseErrors;
        if (parseErrors && parseErrors.length > 0) {
          errors.push(...parseErrors);
          // Clean up the temporary property
          delete (listing as any)._parseErrors;
        }
      } catch (conversionError) {
        errors.push(`Row ${i + 1}: Data conversion failed - ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        continue;
      }
      
      // Basic validation
      if (!listing.title?.trim()) {
        errors.push(`Row ${i + 1}: Title is required and cannot be empty`);
        continue;
      }

      data.push(listing);
    } catch (error) {
      errors.push(`Row ${i + 1}: Failed to parse - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { data, errors };
}

// Helper function to parse a single CSV row, handling quoted fields
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

// Helper function to trigger file download
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Validation functions
export function validateCSVListing(listing: Partial<ShopifyCompatibleListing>, rowNumber?: number): string[] {
  const errors: string[] = [];
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';
  
  // Title validation
  if (!listing.title?.trim()) {
    errors.push(`${prefix}Title is required and cannot be empty`);
  } else if (listing.title.length > 200) {
    errors.push(`${prefix}Title "${listing.title.substring(0, 50)}..." is too long (${listing.title.length} characters). Maximum allowed: 200 characters`);
  }
  
  // SKU validation
  if (listing.sku || listing.variantSku) {
    const sku = listing.sku || listing.variantSku;
    if (sku && sku.length > 50) {
      errors.push(`${prefix}SKU "${sku}" is too long (${sku.length} characters). Maximum allowed: 50 characters`);
    }
    if (sku && !/^[A-Za-z0-9\-_]+$/.test(sku)) {
      errors.push(`${prefix}SKU "${sku}" contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed`);
    }
  }
  
  // Price validation
  const price = listing.priceMin || listing.variantPrice;
  if (price !== undefined) {
    if (isNaN(price) || price < 0) {
      errors.push(`${prefix}Price "${price}" is invalid. Price must be a valid number 0 or greater`);
    } else if (price > 999999.99) {
      errors.push(`${prefix}Price $${price} is too high. Maximum allowed: $999,999.99`);
    }
  }
  
  // Compare at price validation
  const comparePrice = listing.salePrice || listing.variantCompareAtPrice;
  if (comparePrice !== undefined) {
    if (isNaN(comparePrice) || comparePrice < 0) {
      errors.push(`${prefix}Compare at price "${comparePrice}" is invalid. Price must be a valid number 0 or greater`);
    } else if (comparePrice > 999999.99) {
      errors.push(`${prefix}Compare at price $${comparePrice} is too high. Maximum allowed: $999,999.99`);
    }
  }
  
  // Stock validation
  const stock = listing.stock || listing.variantInventoryQty;
  if (stock !== undefined) {
    if (isNaN(stock) || stock < 0) {
      errors.push(`${prefix}Stock quantity "${stock}" is invalid. Stock must be a valid whole number 0 or greater`);
    } else if (!Number.isInteger(stock)) {
      errors.push(`${prefix}Stock quantity "${stock}" must be a whole number (no decimals)`);
    } else if (stock > 999999) {
      errors.push(`${prefix}Stock quantity ${stock} is too high. Maximum allowed: 999,999`);
    }
  }
  
  // Status validation
  const validStatuses = ['Active', 'Draft', 'Expired', 'Sold Out', 'Inactive'];
  if (listing.status && !validStatuses.includes(listing.status)) {
    errors.push(`${prefix}Status "${listing.status}" is invalid. Valid options: ${validStatuses.join(', ')}`);
  }
  
  // Description validation
  const description = listing.description || listing.bodyHtml;
  if (description && description.length > 10000) {
    errors.push(`${prefix}Description is too long (${description.length} characters). Maximum allowed: 10,000 characters`);
  }
  
  return errors;
}

// Helper function to safely parse numbers
export function safeParseFloat(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseFloat(value.trim());
  return isNaN(num) ? undefined : num;
}

// Helper function to safely parse integers
export function safeParseInt(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const num = parseInt(value.trim(), 10);
  return isNaN(num) ? undefined : num;
}