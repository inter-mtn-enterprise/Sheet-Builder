"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, Cloud, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function BannersPage() {
  const [legacyFile, setLegacyFile] = useState<File | null>(null)
  const [productsFile, setProductsFile] = useState<File | null>(null)
  const [productMediaFile, setProductMediaFile] = useState<File | null>(null)
  const [managedContentFile, setManagedContentFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importStats, setImportStats] = useState<any>(null)
  
  // Salesforce state
  const [salesforceConnected, setSalesforceConnected] = useState(false)
  const [importingFromSF, setImportingFromSF] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [sfImportStats, setSfImportStats] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Import selection state
  const [importProducts, setImportProducts] = useState(true)
  const [importCategories, setImportCategories] = useState(false)
  const [importMappings, setImportMappings] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()

  // Check if user is manager and Salesforce connection status
  useEffect(() => {
    checkUserRole()
    checkSalesforceConnection()
    
    // Handle OAuth callback messages from URL
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const error = urlParams.get("error")
    
    if (success === "salesforce_connected") {
      toast({
        title: "Success",
        description: "Connected to Salesforce successfully",
      })
      checkSalesforceConnection()
      // Clean URL
      router.replace("/banners")
    } else if (error) {
      toast({
        title: "Error",
        description: error === "salesforce_auth_failed" 
          ? "Failed to connect to Salesforce" 
          : error === "token_exchange_failed"
          ? "Failed to complete Salesforce connection"
          : "An error occurred",
        variant: "destructive",
      })
      // Clean URL
      router.replace("/banners")
    }
  }, [toast, router])

  const checkUserRole = async () => {
    try {
      const response = await fetch("/api/user/role")
      if (response.ok) {
        const data = await response.json()
        setIsManager(data.role === "manager")
      }
    } catch (error) {
      console.error("Failed to check user role:", error)
      setIsManager(false)
    }
  }

  const checkSalesforceConnection = async () => {
    setCheckingConnection(true)
    try {
      const response = await fetch("/api/salesforce/auth", {
        method: "POST",
      })
      
      if (response.ok) {
        const data = await response.json()
        setSalesforceConnected(data.connected || false)
      } else {
        setSalesforceConnected(false)
      }
    } catch (error) {
      console.error("Failed to check Salesforce connection:", error)
      setSalesforceConnected(false)
    } finally {
      setCheckingConnection(false)
    }
  }

  const connectToSalesforce = async () => {
    try {
      // Redirect to OAuth initiation endpoint
      window.location.href = "/api/salesforce/auth"
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to connect to Salesforce",
        variant: "destructive",
      })
    }
  }

  const loadPreview = async () => {
    // Validation: require products if categories or mappings selected
    if ((importCategories || importMappings) && !importProducts) {
      toast({
        title: "Validation Error",
        description: "Products must be selected when importing Categories or Mappings",
        variant: "destructive",
      })
      return
    }

    setLoadingPreview(true)
    setPreviewData(null)
    try {
      const response = await fetch("/api/salesforce/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          importProducts,
          importCategories,
          importMappings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load preview")
      }

      setPreviewData(data)
      setShowPreview(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load preview",
        variant: "destructive",
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  const importFromSalesforce = async () => {
    // Validation: require products if categories or mappings selected
    if ((importCategories || importMappings) && !importProducts) {
      toast({
        title: "Validation Error",
        description: "Products must be selected when importing Categories or Mappings",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to import? This will update existing products with the same SKU and create new ones. Existing data will be preserved where possible.")) {
      return
    }

    setImportingFromSF(true)
    setSfImportStats(null)
    try {
      const response = await fetch("/api/salesforce/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          importProducts,
          importCategories,
          importMappings,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import from Salesforce")
      }

      setSfImportStats(data.statistics)
      setShowPreview(false)
      setPreviewData(null)

      toast({
        title: "Success",
        description: `Imported ${data.statistics.productsImported} products with ${data.statistics.productsWithImages} images`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import from Salesforce",
        variant: "destructive",
      })
    } finally {
      setImportingFromSF(false)
    }
  }

  const handleLegacyUpload = async () => {
    if (!legacyFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", legacyFile)

      const response = await fetch("/api/banners/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import CSV")
      }

      toast({
        title: "Success",
        description: `Imported ${data.count} banners successfully`,
      })

      setLegacyFile(null)
      const fileInput = document.getElementById("legacy-csv-file") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import CSV",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleProductImport = async () => {
    if (!productsFile || !productMediaFile || !managedContentFile) {
      toast({
        title: "Error",
        description: "Please select all three CSV files",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setImportStats(null)
    try {
      const formData = new FormData()
      formData.append("productsFile", productsFile)
      formData.append("productMediaFile", productMediaFile)
      formData.append("managedContentFile", managedContentFile)

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import products")
      }

      setImportStats(data.statistics)

      toast({
        title: "Success",
        description: `Imported ${data.statistics.productsImported} products with ${data.statistics.productsWithImages} images`,
      })

      // Reset file inputs
      setProductsFile(null)
      setProductMediaFile(null)
      setManagedContentFile(null)
      const inputs = ["products-csv", "product-media-csv", "managed-content-csv"]
      inputs.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement
        if (input) input.value = ""
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import products",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Catalog Management</h1>
        <p className="text-muted-foreground mt-2">
          Import products with automatic image URL generation
        </p>
      </div>

      {/* Salesforce Import - Manager Only */}
      {isManager && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Import from Salesforce
          </CardTitle>
          <CardDescription>
            Connect to Salesforce and import products directly. This method automatically fetches
            products, categories, media, and managed content from your Salesforce org.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkingConnection ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection status...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {salesforceConnected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Connected to Salesforce</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-muted-foreground">Not connected</span>
                  </>
                )}
              </div>

              {!salesforceConnected ? (
                <Button
                  onClick={connectToSalesforce}
                  className="w-full"
                  variant="outline"
                >
                  <Cloud className="mr-2 h-4 w-4" />
                  Connect to Salesforce
                </Button>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                      <Label className="text-base font-semibold">Select what to import:</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="import-products"
                            checked={importProducts}
                            onCheckedChange={(checked) => setImportProducts(checked === true)}
                          />
                          <Label
                            htmlFor="import-products"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Products
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="import-categories"
                            checked={importCategories}
                            onCheckedChange={(checked) => setImportCategories(checked === true)}
                            disabled={!importProducts}
                          />
                          <Label
                            htmlFor="import-categories"
                            className={`text-sm font-normal ${!importProducts ? 'text-muted-foreground' : 'cursor-pointer'}`}
                          >
                            Categories
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="import-mappings"
                            checked={importMappings}
                            onCheckedChange={(checked) => setImportMappings(checked === true)}
                            disabled={!importProducts || !importCategories}
                          />
                          <Label
                            htmlFor="import-mappings"
                            className={`text-sm font-normal ${!importProducts || !importCategories ? 'text-muted-foreground' : 'cursor-pointer'}`}
                          >
                            Category Mappings (requires Products and Categories)
                          </Label>
                        </div>
                      </div>
                      {(!importProducts && (importCategories || importMappings)) && (
                        <p className="text-xs text-orange-600 mt-2">
                          Products must be selected when importing Categories or Mappings
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={loadPreview}
                      disabled={loadingPreview}
                      className="w-full"
                      variant="outline"
                    >
                      {loadingPreview ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading Preview...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Preview Import Data
                        </>
                      )}
                    </Button>
                    
                    {previewData && (
                      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                        <strong>Note:</strong> Import will update existing products (matched by SKU) and create new ones. 
                        Existing product_code and category will be preserved if Salesforce data is missing.
                      </div>
                    )}
                  </div>

                  {previewData && (
                    <Card className="mt-4 border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Import Preview</CardTitle>
                        <CardDescription>
                          Showing first {previewData.statistics.previewLimit} of {previewData.statistics.totalPreviewable} products
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-semibold">Total Products</div>
                            <div className="text-2xl">{previewData.statistics.totalProducts}</div>
                          </div>
                          <div>
                            <div className="font-semibold">New Products</div>
                            <div className="text-2xl text-green-600">{previewData.statistics.newProducts}</div>
                          </div>
                          <div>
                            <div className="font-semibold">Will Update</div>
                            <div className="text-2xl text-blue-600">{previewData.statistics.existingProducts}</div>
                          </div>
                          <div>
                            <div className="font-semibold">With Images</div>
                            <div className="text-2xl text-purple-600">{previewData.statistics.productsWithImages}</div>
                          </div>
                        </div>

                        {(previewData.statistics.categoriesImported !== undefined || previewData.statistics.mappingsImported !== undefined) && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm border-t pt-4">
                            {previewData.statistics.categoriesImported !== undefined && (
                              <div>
                                <div className="font-semibold">Categories</div>
                                <div className="text-2xl text-cyan-600">{previewData.statistics.categoriesImported}</div>
                              </div>
                            )}
                            {previewData.statistics.mappingsImported !== undefined && (
                              <div>
                                <div className="font-semibold">Mappings</div>
                                <div className="text-2xl text-indigo-600">{previewData.statistics.mappingsImported}</div>
                              </div>
                            )}
                            {previewData.statistics.productsWithCategories !== undefined && (
                              <div>
                                <div className="font-semibold">Products with Categories</div>
                                <div className="text-2xl text-teal-600">{previewData.statistics.productsWithCategories}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {previewData.statistics.apiUsage && (
                          <div className="border-t pt-4">
                            <div className="font-semibold text-sm mb-2">Salesforce API Usage</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Daily Limit:</span>
                                <span className="font-mono">{previewData.statistics.apiUsage.limit.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Used Today:</span>
                                <span className="font-mono">{previewData.statistics.apiUsage.used.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Remaining:</span>
                                <span className={`font-mono ${previewData.statistics.apiUsage.remaining < 1000 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {previewData.statistics.apiUsage.remaining.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Used in Preview:</span>
                                <span className="font-mono">{previewData.statistics.apiUsage.usedInThisPreview || 0}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    (previewData.statistics.apiUsage.used / previewData.statistics.apiUsage.limit) > 0.9
                                      ? 'bg-red-500'
                                      : (previewData.statistics.apiUsage.used / previewData.statistics.apiUsage.limit) > 0.7
                                      ? 'bg-orange-500'
                                      : 'bg-blue-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((previewData.statistics.apiUsage.used / previewData.statistics.apiUsage.limit) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="max-h-64 overflow-y-auto border rounded p-2">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-background">
                              <tr className="border-b">
                                <th className="text-left p-2">SKU</th>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Category</th>
                                <th className="text-left p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.preview.map((product: any, idx: number) => (
                                <tr key={idx} className="border-b">
                                  <td className="p-2 font-mono text-xs">{product.sku}</td>
                                  <td className="p-2">{product.name || "-"}</td>
                                  <td className="p-2">{product.category}</td>
                                  <td className="p-2">
                                    {product.isNew ? (
                                      <span className="text-green-600 font-semibold">New</span>
                                    ) : (
                                      <span className="text-blue-600 font-semibold">Update</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <Button
                          onClick={importFromSalesforce}
                          disabled={importingFromSF}
                          className="w-full"
                        >
                          {importingFromSF ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Confirm Import ({previewData.statistics.totalProducts} products)
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {sfImportStats && !showPreview && (
                    <Card className="mt-4 bg-muted">
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-semibold">Total Products</div>
                            <div className="text-2xl">{sfImportStats.totalProducts}</div>
                          </div>
                          <div>
                            <div className="font-semibold">Imported</div>
                            <div className="text-2xl text-green-600">{sfImportStats.productsImported}</div>
                          </div>
                          <div>
                            <div className="font-semibold">With Images</div>
                            <div className="text-2xl text-blue-600">{sfImportStats.productsWithImages}</div>
                          </div>
                          <div>
                            <div className="font-semibold">Without Images</div>
                            <div className="text-2xl text-orange-600">{sfImportStats.productsWithoutImages}</div>
                          </div>
                        </div>

                        {(sfImportStats.categoriesImported !== undefined || sfImportStats.mappingsImported !== undefined) && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm border-t pt-4">
                            {sfImportStats.categoriesImported !== undefined && (
                              <div>
                                <div className="font-semibold">Categories Imported</div>
                                <div className="text-2xl text-cyan-600">{sfImportStats.categoriesImported}</div>
                              </div>
                            )}
                            {sfImportStats.mappingsImported !== undefined && (
                              <div>
                                <div className="font-semibold">Mappings Imported</div>
                                <div className="text-2xl text-indigo-600">{sfImportStats.mappingsImported}</div>
                              </div>
                            )}
                            {sfImportStats.productsWithCategories !== undefined && (
                              <div>
                                <div className="font-semibold">Products with Categories</div>
                                <div className="text-2xl text-teal-600">{sfImportStats.productsWithCategories}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {sfImportStats.apiUsage && (
                          <div className="border-t pt-4">
                            <div className="font-semibold text-sm mb-2">Salesforce API Usage</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Daily Limit:</span>
                                <span className="font-mono">{sfImportStats.apiUsage.limit.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Used Today:</span>
                                <span className="font-mono">{sfImportStats.apiUsage.used.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Remaining:</span>
                                <span className={`font-mono ${sfImportStats.apiUsage.remaining < 1000 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {sfImportStats.apiUsage.remaining.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Used in Import:</span>
                                <span className="font-mono">{sfImportStats.apiUsage.usedInThisImport || 0}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    (sfImportStats.apiUsage.used / sfImportStats.apiUsage.limit) > 0.9
                                      ? 'bg-red-500'
                                      : (sfImportStats.apiUsage.used / sfImportStats.apiUsage.limit) > 0.7
                                      ? 'bg-orange-500'
                                      : 'bg-blue-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((sfImportStats.apiUsage.used / sfImportStats.apiUsage.limit) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* New 3-File Import */}
      <Card>
        <CardHeader>
          <CardTitle>Full Product Import (Recommended)</CardTitle>
          <CardDescription>
            Import all products with automatic image URL generation. Upload three CSV files:
            Products, ProductMediaextract, and ManagedContentextract.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="products-csv">Products CSV (ID, Name, SKU, ProductCode)</Label>
            <Input
              id="products-csv"
              type="file"
              accept=".csv"
              onChange={(e) => setProductsFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {productsFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {productsFile.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-media-csv">ProductMediaextract.csv</Label>
            <Input
              id="product-media-csv"
              type="file"
              accept=".csv"
              onChange={(e) => setProductMediaFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {productMediaFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {productMediaFile.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="managed-content-csv">ManagedContentextract.csv</Label>
            <Input
              id="managed-content-csv"
              type="file"
              accept=".csv"
              onChange={(e) => setManagedContentFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {managedContentFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {managedContentFile.name}
              </div>
            )}
          </div>

          <Button
            onClick={handleProductImport}
            disabled={!productsFile || !productMediaFile || !managedContentFile || uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Importing..." : "Import Products with Images"}
          </Button>

          {importStats && (
            <Card className="mt-4 bg-muted">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">Total Products</div>
                    <div className="text-2xl">{importStats.totalProducts}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Imported</div>
                    <div className="text-2xl text-green-600">{importStats.productsImported}</div>
                  </div>
                  <div>
                    <div className="font-semibold">With Images</div>
                    <div className="text-2xl text-blue-600">{importStats.productsWithImages}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Without Images</div>
                    <div className="text-2xl text-orange-600">{importStats.productsWithoutImages}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Legacy Single File Import */}
      <Card>
        <CardHeader>
          <CardTitle>Legacy Banner Import</CardTitle>
          <CardDescription>
            Import banners from a single CSV file (legacy format). CSV format: ID, Name, SKU, Product Code.
            This method does not generate image URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              id="legacy-csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setLegacyFile(e.target.files?.[0] || null)}
              className="flex-1"
              disabled={uploading}
            />
            <Button onClick={handleLegacyUpload} disabled={!legacyFile || uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
          {legacyFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {legacyFile.name}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

