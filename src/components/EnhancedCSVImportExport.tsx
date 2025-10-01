'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  X, 
  FileText, 
  RefreshCw,
  Settings,
  Filter,
  Eye,
  AlertTriangle,
  Info,
  TrendingUp,
  BarChart,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Listing } from '@/lib/types';
import { 
  generateCSV, 
  parseCSV, 
  downloadCSV, 
  validateCSVListing,
  CSV_FIELD_MAPPING,
  ShopifyCompatibleListing
} from '@/lib/csv-utils-shopify';

interface EnhancedCSVImportExportProps {
  listings: ShopifyCompatibleListing[];
  onImportComplete: (importedCount: number, updatedCount: number) => void;
  onRefreshListings: () => void;
}

interface ImportPreviewItem {
  listing: Partial<ShopifyCompatibleListing>;
  isNew: boolean;
  errors: string[];
  warnings: string[];
  index: number;
  suggestions: string[];
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateSkus: string[];
  missingRequiredFields: string[];
  formatIssues: string[];
}

interface ExportOptions {
  includeImages: boolean;
  includeVariants: boolean;
  includeMetadata: boolean;
  format: 'shopify' | 'basic' | 'custom';
  selectedFields: string[];
}

export function EnhancedCSVImportExport({ listings, onImportComplete, onRefreshListings }: EnhancedCSVImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'errors' | 'warnings' | 'preview' | 'suggestions'>('summary');
  
  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeImages: true,
    includeVariants: true,
    includeMetadata: false,
    format: 'shopify',
    selectedFields: []
  });

  // Validation helpers
  const generateValidationSummary = (items: ImportPreviewItem[]): ValidationSummary => {
    const totalRows = items.length;
    const errorRows = items.filter(item => item.errors.length > 0).length;
    const warningRows = items.filter(item => item.warnings.length > 0).length;
    const validRows = totalRows - errorRows;

    // Find duplicate SKUs
    const skuCounts: Record<string, number> = {};
    items.forEach(item => {
      if (item.listing.sku) {
        skuCounts[item.listing.sku] = (skuCounts[item.listing.sku] || 0) + 1;
      }
    });
    const duplicateSkus = Object.keys(skuCounts).filter(sku => skuCounts[sku] > 1);

    // Find missing required fields
    const requiredFields = ['title', 'sku', 'priceMin'];
    const missingRequiredFields = requiredFields.filter(field =>
      items.some(item => !item.listing[field as keyof typeof item.listing])
    );

    // Identify format issues
    const formatIssues: string[] = [];
    items.forEach(item => {
      if (item.listing.priceMin && typeof item.listing.priceMin === 'string') {
        formatIssues.push('Price values should be numbers');
      }
      if (item.listing.stock && typeof item.listing.stock === 'string') {
        formatIssues.push('Stock values should be numbers');
      }
    });

    return {
      totalRows,
      validRows,
      errorRows,
      warningRows,
      duplicateSkus: [...new Set(duplicateSkus)],
      missingRequiredFields: [...new Set(missingRequiredFields)],
      formatIssues: [...new Set(formatIssues)]
    };
  };

  // Enhanced validation with warnings and suggestions
  const enhancedValidateCSVListing = (listing: Partial<ShopifyCompatibleListing>, rowNumber: number) => {
    const errors = validateCSVListing(listing, rowNumber);
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Add warnings for best practices
    if (!listing.description || listing.description.length < 50) {
      warnings.push('Description is too short - consider adding more detail for better SEO');
    }
    
    if (!listing.image && !listing.imageSrc) {
      warnings.push('No image provided - products with images perform better');
    }
    
    if (!listing.tags || listing.tags.length === 0) {
      warnings.push('No tags specified - tags help with discoverability');
    }
    
    if (listing.priceMin && listing.priceMin < 1) {
      warnings.push('Very low price - ensure this is correct');
    }
    
    if (!listing.collection) {
      warnings.push('No collection assigned - consider organizing products into collections');
    }

    // Add suggestions
    if (listing.title && listing.title.length > 70) {
      suggestions.push('Consider shortening the title for better display');
    }
    
    if (listing.sku && !/^[A-Z0-9-_]+$/i.test(listing.sku)) {
      suggestions.push('SKU should only contain letters, numbers, hyphens, and underscores');
    }
    
    if (!listing.seoTitle && listing.title) {
      suggestions.push('Add an SEO title for better search optimization');
    }

    return { errors, warnings, suggestions };
  };

  // Export with advanced options
  const handleExportWithOptions = () => {
    try {
      if (listings.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data to Export',
          description: 'There are no listings to export.',
        });
        return;
      }

      // Filter listings based on export options
      let exportData = [...listings];
      
      // Apply field selection if custom format
      if (exportOptions.format === 'custom' && exportOptions.selectedFields.length > 0) {
        exportData = exportData.map(listing => {
          const filtered: Partial<ShopifyCompatibleListing> = {};
          exportOptions.selectedFields.forEach(field => {
            if (field in listing) {
              (filtered as any)[field] = (listing as any)[field];
            }
          });
          return filtered as ShopifyCompatibleListing;
        });
      }

      const csvContent = generateCSV(exportData);
      const timestamp = new Date().toISOString().split('T')[0];
      const formatSuffix = exportOptions.format !== 'shopify' ? `-${exportOptions.format}` : '';
      const filename = `listings-export${formatSuffix}-${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export Successful',
        description: `${listings.length} listings exported to ${filename}`,
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to export listings. Please try again.',
      });
    }
  };

  // Handle file selection with enhanced validation
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select a CSV file.',
      });
      return;
    }

    // Check file size (limit to 10MB for performance)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'CSV file must be smaller than 10MB. Please split large files into smaller batches.',
      });
      return;
    }

    setImportFile(file);
    processImportFile(file);
  };

  // Enhanced file processing with better validation
  const processImportFile = async (file: File) => {
    try {
      const content = await file.text();
      console.log('CSV content preview:', content.substring(0, 500) + '...');
      
      const { data, errors } = parseCSV(content);
      
      console.log('Parse result - data count:', data.length, 'errors:', errors);
      
      setImportErrors(errors);
      
      // Generate enhanced preview with validation
      const preview: ImportPreviewItem[] = data.map((listing, index) => {
        const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
        const { errors, warnings, suggestions } = enhancedValidateCSVListing(listing, rowNumber);
        const existingListing = listing.id ? listings.find(l => l.id === listing.id) : 
                                listing.sku ? listings.find(l => l.sku === listing.sku) : null;
        
        return {
          listing,
          isNew: !existingListing,
          errors,
          warnings,
          suggestions,
          index: rowNumber
        };
      });
      
      setImportPreview(preview);
      setValidationSummary(generateValidationSummary(preview));
      setShowImportDialog(true);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        variant: 'destructive',
        title: 'File Processing Failed',
        description: 'Failed to read or parse the CSV file. Please check the file format.',
      });
    }
  };

  // Execute the import (same as before)
  const handleImport = async () => {
    const validItems = importPreview.filter(item => item.errors.length === 0);
    
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Valid Items',
        description: 'There are no valid items to import.',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Use bulk import endpoint (same logic as original)
      const importItems = validItems.map(item => {
        const existingListing = item.listing.id ? listings.find(l => l.id === item.listing.id) : 
                               item.listing.sku ? listings.find(l => l.sku === item.listing.sku) : null;

        return {
          // Basic Listing fields
          id: item.listing.id,
          title: item.listing.title || '',
          sku: item.listing.sku || '',
          stock: item.listing.stock || 0,
          priceMin: item.listing.priceMin || 0,
          priceMax: item.listing.priceMax || item.listing.priceMin || 0,
          salePrice: item.listing.salePrice,
          image: item.listing.image || '',
          status: item.listing.status || 'Draft',
          section: item.listing.section || '',
          description: item.listing.description,
          hasVideo: item.listing.hasVideo || false,
          hint: item.listing.hint || '',
          shippingProfile: item.listing.shippingProfile,
          returnPolicy: item.listing.returnPolicy,
          tags: item.listing.tags || [],
          medium: item.listing.medium || [],
          style: item.listing.style || [],
          materials: item.listing.materials || [],
          techniques: item.listing.techniques || [],
          collection: item.listing.collection,
          personalization: item.listing.personalization || false,
          countrySpecificPrices: item.listing.countrySpecificPrices || [],
          
          // Shopify-specific fields
          handle: item.listing.handle || '',
          bodyHtml: item.listing.bodyHtml || item.listing.description || '',
          vendor: item.listing.vendor || '',
          productCategory: item.listing.productCategory || item.listing.section || '',
          type: item.listing.type || '',
          published: item.listing.published,
          
          // Product Options
          option1Name: item.listing.option1Name || '',
          option1Value: item.listing.option1Value || '',
          option2Name: item.listing.option2Name || '',
          option2Value: item.listing.option2Value || '',
          option3Name: item.listing.option3Name || '',
          option3Value: item.listing.option3Value || '',
          
          // Variant Details
          variantSku: item.listing.variantSku || item.listing.sku || '',
          variantGrams: item.listing.variantGrams,
          variantInventoryTracker: item.listing.variantInventoryTracker || 'shopify',
          variantInventoryQty: item.listing.variantInventoryQty || item.listing.stock || 0,
          variantInventoryPolicy: item.listing.variantInventoryPolicy || 'deny',
          variantFulfillmentService: item.listing.variantFulfillmentService || 'manual',
          variantPrice: item.listing.variantPrice || item.listing.priceMin || 0,
          variantCompareAtPrice: item.listing.variantCompareAtPrice || item.listing.salePrice,
          variantRequiresShipping: item.listing.variantRequiresShipping,
          variantTaxable: item.listing.variantTaxable,
          variantBarcode: item.listing.variantBarcode || '',
          
          // Images
          imageSrc: item.listing.imageSrc || item.listing.image || '',
          imagePosition: item.listing.imagePosition || 1,
          imageAltText: item.listing.imageAltText || item.listing.hint || '',
          variantImage: item.listing.variantImage || '',
          
          // Additional Product Info
          giftCard: item.listing.giftCard || false,
          seoTitle: item.listing.seoTitle || item.listing.title || '',
          seoDescription: item.listing.seoDescription || item.listing.description || '',
          
          // Google Shopping
          googleProductCategory: item.listing.googleProductCategory || '',
          googleGender: item.listing.googleGender || '',
          googleAgeGroup: item.listing.googleAgeGroup || '',
          googleMpn: item.listing.googleMpn || '',
          googleCondition: item.listing.googleCondition || 'new',
          googleCustomProduct: item.listing.googleCustomProduct || '',
          
          // Variant Additional
          variantWeightUnit: item.listing.variantWeightUnit || 'g',
          variantTaxCode: item.listing.variantTaxCode || '',
          costPerItem: item.listing.costPerItem,
          
          // Regional Pricing
          includedUnitedStates: item.listing.includedUnitedStates,
          priceUnitedStates: item.listing.priceUnitedStates,
          compareAtPriceUnitedStates: item.listing.compareAtPriceUnitedStates,
          includedInternational: item.listing.includedInternational,
          priceInternational: item.listing.priceInternational,
          compareAtPriceInternational: item.listing.compareAtPriceInternational,
          
          // Import metadata
          isUpdate: !item.isNew,
          existingId: existingListing?.id,
        };
      });

      // Use bulk import endpoint
      const response = await fetch('/api/listings/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: importItems }),
      });

      setImportProgress(100);

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: 'Import Successful',
          description: result.message || `Import completed: ${result.results?.imported || 0} created, ${result.results?.updated || 0} updated.`,
        });

        onImportComplete(result.results?.imported || 0, result.results?.updated || 0);
        onRefreshListings();
        handleCloseImport();
      } else {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}: Import failed`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Import failed. Please try again.',
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Close import dialog and reset state
  const handleCloseImport = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setValidationSummary(null);
    setImportProgress(0);
    setActiveTab('summary');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download validation report
  const downloadValidationReport = () => {
    if (!validationSummary || importPreview.length === 0) return;

    const allIssues: Array<{
      row: number;
      field?: string;
      severity: 'error' | 'warning' | 'suggestion';
      message: string;
      value?: string;
    }> = [];

    importPreview.forEach(item => {
      item.errors.forEach(error => {
        allIssues.push({
          row: item.index,
          severity: 'error',
          message: error.replace(`Row ${item.index}: `, ''),
        });
      });
      item.warnings.forEach(warning => {
        allIssues.push({
          row: item.index,
          severity: 'warning',
          message: warning,
        });
      });
      item.suggestions.forEach(suggestion => {
        allIssues.push({
          row: item.index,
          severity: 'suggestion',
          message: suggestion,
        });
      });
    });

    const csvContent = [
      ['Row', 'Severity', 'Message'],
      ...allIssues.map(issue => [
        issue.row.toString(),
        issue.severity,
        issue.message
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csv-validation-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Validation Report Downloaded",
      description: "The validation report has been downloaded as CSV.",
    });
  };

  const validItemsCount = importPreview.filter(item => item.errors.length === 0).length;
  const errorItemsCount = importPreview.filter(item => item.errors.length > 0).length;
  const warningItemsCount = importPreview.filter(item => item.warnings.length > 0).length;

  return (
    <>
      {/* Export/Import Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportDialog(true)}
          disabled={listings.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Export Options Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Options</DialogTitle>
            <DialogDescription>
              Configure your CSV export settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Export Format</Label>
              <Select 
                value={exportOptions.format} 
                onValueChange={(value: 'shopify' | 'basic' | 'custom') => 
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopify">Shopify Compatible</SelectItem>
                  <SelectItem value="basic">Basic Fields</SelectItem>
                  <SelectItem value="custom">Custom Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Include Additional Data</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-images"
                    checked={exportOptions.includeImages}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeImages: !!checked }))
                    }
                  />
                  <Label htmlFor="include-images" className="text-sm">Include image URLs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-variants"
                    checked={exportOptions.includeVariants}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeVariants: !!checked }))
                    }
                  />
                  <Label htmlFor="include-variants" className="text-sm">Include variant data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                    }
                  />
                  <Label htmlFor="include-metadata" className="text-sm">Include SEO and metadata</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportWithOptions}>
              Export {listings.length} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && handleCloseImport()}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSV Import Validation Report
            </DialogTitle>
            <DialogDescription>
              Review your data quality and resolve any issues before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="summary" className="flex items-center gap-1">
                  <BarChart className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="errors" className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({errorItemsCount})
                </TabsTrigger>
                <TabsTrigger value="warnings" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({warningItemsCount})
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  Smart Tips
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 mt-4 overflow-hidden">
                <TabsContent value="summary" className="h-full space-y-4">
                  {validationSummary && (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {validationSummary.validRows}
                              </div>
                              <div className="text-sm text-muted-foreground">Valid Rows</div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-destructive">
                                {validationSummary.errorRows}
                              </div>
                              <div className="text-sm text-muted-foreground">Errors</div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">
                                {validationSummary.warningRows}
                              </div>
                              <div className="text-sm text-muted-foreground">Warnings</div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {importPreview.filter(i => i.isNew).length}
                              </div>
                              <div className="text-sm text-muted-foreground">New Products</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Success Rate Progress */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Data Quality Score</span>
                              <span className="font-medium">
                                {((validationSummary.validRows / validationSummary.totalRows) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress 
                              value={(validationSummary.validRows / validationSummary.totalRows) * 100} 
                              className="h-2" 
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Data Quality Issues */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {validationSummary.duplicateSkus.length > 0 && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Duplicate SKUs found:</strong> {validationSummary.duplicateSkus.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {validationSummary.missingRequiredFields.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Missing required fields:</strong> {validationSummary.missingRequiredFields.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="errors" className="h-full">
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {importPreview
                        .filter(item => item.errors.length > 0)
                        .map((item, index) => (
                          <Card key={index} className="border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-red-700">
                                    Row {item.index}: {item.listing.title || 'Untitled'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.listing.sku || 'N/A'}
                                  </div>
                                </div>
                                <Badge variant="destructive">
                                  {item.errors.length} Error{item.errors.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {item.errors.map((error, errorIndex) => (
                                  <div key={errorIndex} className="text-sm text-red-600 flex items-start gap-2">
                                    <X className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{error.replace(`Row ${item.index}: `, '')}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="warnings" className="h-full">
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {importPreview
                        .filter(item => item.warnings.length > 0)
                        .map((item, index) => (
                          <Card key={index} className="border-yellow-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-yellow-700">
                                    Row {item.index}: {item.listing.title || 'Untitled'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.listing.sku || 'N/A'}
                                  </div>
                                </div>
                                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                  {item.warnings.length} Warning{item.warnings.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {item.warnings.map((warning, warningIndex) => (
                                  <div key={warningIndex} className="text-sm text-yellow-600 flex items-start gap-2">
                                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{warning}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="preview" className="h-full">
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {importPreview.slice(0, 10).map((item, index) => (
                        <Card 
                          key={index} 
                          className={`${
                            item.errors.length > 0 
                              ? 'border-red-200 bg-red-50' 
                              : 'border-green-200 bg-green-50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {item.listing.title || 'Untitled'}
                                  </span>
                                  <Badge variant={item.isNew ? 'default' : 'secondary'}>
                                    {item.isNew ? 'New' : 'Update'}
                                  </Badge>
                                  {item.errors.length === 0 && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="grid grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="font-medium">SKU:</span> {item.listing.sku || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Price:</span> ${item.listing.priceMin?.toFixed(2) || '0.00'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock:</span> {item.listing.stock || 0}
                                  </div>
                                  <div>
                                    <span className="font-medium">Status:</span> {item.listing.status || 'Draft'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {importPreview.length > 10 && (
                        <Card>
                          <CardContent className="p-4 text-center text-muted-foreground">
                            ... and {importPreview.length - 10} more items
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="suggestions" className="h-full">
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Smart Suggestions
                          </CardTitle>
                          <CardDescription>
                            Recommendations to improve your data quality
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {validationSummary?.duplicateSkus.length ? (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Duplicate SKUs detected:</strong> Consider making SKUs unique to avoid inventory conflicts.
                              </AlertDescription>
                            </Alert>
                          ) : null}
                          
                          {validationSummary?.formatIssues.length ? (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Format improvements available:</strong> Ensure numeric fields contain only numbers for better data consistency.
                              </AlertDescription>
                            </Alert>
                          ) : null}
                          
                          <Alert>
                            <TrendingUp className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Performance tip:</strong> Products with images and detailed descriptions typically perform 40% better in search results.
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                      </Card>

                      {/* Individual suggestions */}
                      <div className="space-y-2">
                        {importPreview
                          .filter(item => item.suggestions.length > 0)
                          .slice(0, 5)
                          .map((item, index) => (
                            <Card key={index} className="border-blue-200">
                              <CardContent className="p-3">
                                <div className="text-sm font-medium mb-1">
                                  {item.listing.title || 'Untitled'} (Row {item.index})
                                </div>
                                {item.suggestions.map((suggestion, suggestionIndex) => (
                                  <div key={suggestionIndex} className="text-xs text-blue-600 flex items-start gap-1">
                                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{suggestion}</span>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Import progress */}
          {isImporting && (
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Importing data...</span>
                <span className="font-mono">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadValidationReport}
                  disabled={!validationSummary}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Report
                </Button>
                <div className="text-sm text-muted-foreground">
                  {validItemsCount > 0 && (
                    <span>{validItemsCount} items ready to import</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseImport}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validItemsCount === 0 || isImporting}
                  className="min-w-32"
                >
                  {isImporting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importing...
                    </div>
                  ) : (
                    `Import ${validItemsCount} Items`
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
