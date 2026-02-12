"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText } from "lucide-react"

export default function BannersPage() {
  const [legacyFile, setLegacyFile] = useState<File | null>(null)
  const [productsFile, setProductsFile] = useState<File | null>(null)
  const [productMediaFile, setProductMediaFile] = useState<File | null>(null)
  const [managedContentFile, setManagedContentFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importStats, setImportStats] = useState<any>(null)
  const { toast } = useToast()

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

