import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import { promises as fs } from 'fs';
import { prisma } from '../../../lib/prisma';
import { parseProductCSV, validateProductCSV, ProductForCSVParsing } from '../../../lib/product-csv-utils';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log('Starting CSV import...');
    
    // Parse multipart form data
    const form = new IncomingForm();
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Get the uploaded file
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read and parse CSV content
    const fileContent = await fs.readFile(uploadedFile.filepath, 'utf-8');
    console.log('CSV file read successfully, parsing...');
    
    const { data: parsedProducts, errors: parseErrors } = parseProductCSV(fileContent);
    
    if (parseErrors.length > 0) {
      console.log('Parse errors found:', parseErrors);
      return res.status(400).json({
        error: 'CSV parsing failed',
        details: parseErrors
      });
    }

    console.log(`Parsed ${parsedProducts.length} products from CSV`);

    // Validate each product
    const validationErrors: string[] = [];
    parsedProducts.forEach((product, index) => {
      const errors = validateProductCSV(product, index + 1);
      validationErrors.push(...errors);
    });

    if (validationErrors.length > 0) {
      console.log('Validation errors found:', validationErrors);
      return res.status(400).json({
        error: 'CSV validation failed',
        details: validationErrors
      });
    }

    // Process products and handle category/collection resolution
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
      skipped: 0
    };

    for (let i = 0; i < parsedProducts.length; i++) {
      const productData = parsedProducts[i];
      const rowNumber = i + 1;
      
      try {
        // Resolve or create category
        let categoryId: string | null = null;
        if (productData._categoryName) {
          let category = await prisma.category.findFirst({
            where: { name: productData._categoryName }
          });
          
          if (!category) {
            category = await prisma.category.create({
              data: { name: productData._categoryName }
            });
            console.log(`Created new category: ${productData._categoryName}`);
          }
          categoryId = category.id;
        }

        // Prepare product data for database
        const productForDB: any = {
          name: productData.name!,
          slug: productData.slug,
          description: productData.description || null,
          shortDescription: productData.shortDescription || null,
          sku: productData.sku,
          weightGrams: productData.weightGrams,
          stockQuantity: productData.stockQuantity || 0,
          inventoryManaged: productData.inventoryManaged || true,
          priceCents: productData.priceCents || 0,
          compareAtCents: productData.compareAtCents,
          tags: productData.tags || [],
          medium: productData.medium || [],
          style: productData.style || [],
          materials: productData.materials || [],
          techniques: productData.techniques || [],
          metaTitle: productData.metaTitle,
          metaDescription: productData.metaDescription,
          status: productData.status || 'Draft',
          categoryId: categoryId
        };

        // Mark this product as originating from a CSV import so the admin UI
        // can relax photo requirements for updates when appropriate
        productForDB.metadata = {
          ...(productForDB.metadata || {}),
          importSource: 'csv',
          csvRow: rowNumber,
        };

        // Check if product exists (by SKU or name)
        let existingProduct = null;
        if (productData.sku) {
          existingProduct = await prisma.product.findUnique({
            where: { sku: productData.sku }
          });
        }
        
        if (!existingProduct) {
          existingProduct = await prisma.product.findFirst({
            where: { name: productData.name }
          });
        }

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: productForDB
          });
          
          // Handle collections for existing product
          if (productData._collectionNames && productData._collectionNames.length > 0) {
            // Remove existing collection associations
            await prisma.productCollection.deleteMany({
              where: { productId: existingProduct.id }
            });
            
            // Add new collection associations
            for (const collectionName of productData._collectionNames) {
              let collection = await prisma.collection.findFirst({
                where: { name: collectionName }
              });
              
              if (!collection) {
                collection = await prisma.collection.create({
                  data: { 
                    name: collectionName,
                    categoryId: categoryId
                  }
                });
              }
              
              await prisma.productCollection.create({
                data: {
                  productId: existingProduct.id,
                  collectionId: collection.id
                }
              });
            }
          }
          
          results.updated++;
          console.log(`Updated product: ${productData.name}`);
        } else {
          // Create new product
          const newProduct = await prisma.product.create({
            data: productForDB
          });
          
          // Handle collections for new product
          if (productData._collectionNames && productData._collectionNames.length > 0) {
            for (const collectionName of productData._collectionNames) {
              let collection = await prisma.collection.findFirst({
                where: { name: collectionName }
              });
              
              if (!collection) {
                collection = await prisma.collection.create({
                  data: { 
                    name: collectionName,
                    categoryId: categoryId
                  }
                });
              }
              
              await prisma.productCollection.create({
                data: {
                  productId: newProduct.id,
                  collectionId: collection.id
                }
              });
            }
          }
          
          results.created++;
          console.log(`Created product: ${productData.name}`);
        }
        
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    console.log('CSV import completed:', results);
    
    return res.status(200).json({
      success: true,
      message: 'CSV import completed',
      results: {
        totalProcessed: parsedProducts.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors
      }
    });
    
  } catch (error) {
    console.error('Error importing CSV:', error);
    return res.status(500).json({
      error: 'Failed to import CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
