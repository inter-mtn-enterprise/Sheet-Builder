"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { BannerSelector } from "@/components/BannerSelector"
import { Save, Plus, ArrowLeft, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Template {
  id: string
  name: string
  field_definitions: any[]
  categories_to_include?: string[]
  products_to_include?: string[]
  products_to_exclude?: string[]
  categories_to_exclude?: string[]
}

interface Sheet {
  id: string
  job_number: string | null
  status: string
  template_id: string
  sheet_templates: Template | null
}

interface SheetItem {
  id: string
  banner_sku: string
  banner_name: string
  image_url: string | null
  quantity: number
  qty_in_order: number
  stock_qty: number
  custom_fields: any
}

interface Banner {
  id: string
  sku: string
  name: string
  product_code: string
  category: string
  image_url?: string
}

interface EditableItem {
  id?: string
  banner_sku: string
  banner_name: string
  image_url?: string
  qty_in_order: number
  stock_qty: number
  custom_fields?: any
}

export default function EditSheetPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [jobNumber, setJobNumber] = useState("")
  const [bannerSelectorOpen, setBannerSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchSheet()
    }
  }, [params.id])

  const fetchSheet = async () => {
    try {
      const response = await fetch(`/api/sheets/${params.id}`)
      const data = await response.json()

      if (data.sheet) {
        setSheet(data.sheet)
        setJobNumber(data.sheet.job_number || "")

        // Convert existing items to editable format
        if (data.items) {
          const editableItems: EditableItem[] = data.items.map((item: SheetItem) => ({
            id: item.id,
            banner_sku: item.banner_sku,
            banner_name: item.banner_name || "",
            image_url: item.image_url || undefined,
            qty_in_order: item.qty_in_order || 0,
            stock_qty: item.stock_qty || 0,
            custom_fields: item.custom_fields || {},
          }))
          setItems(editableItems)
        }
      } else {
        toast({
          title: "Error",
          description: "Sheet not found",
          variant: "destructive",
        })
        router.push("/sheets")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sheet",
        variant: "destructive",
      })
      router.push("/sheets")
    } finally {
      setLoading(false)
    }
  }

  const handleBannerSelect = (selected: Banner[]) => {
    const newItems: EditableItem[] = selected.map((banner) => ({
      banner_sku: banner.sku,
      banner_name: banner.name || "",
      image_url: banner.image_url,
      qty_in_order: 0,
      stock_qty: 0,
      custom_fields: {},
    }))
    setItems([...items, ...newItems])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, field: "qty_in_order" | "stock_qty", value: number) => {
    const updatedItems = [...items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: Math.max(0, value),
    }
    setItems(updatedItems)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const updatedItems = items.map((item) => ({
        itemId: item.id,
        bannerSku: item.banner_sku,
        bannerName: item.banner_name,
        imageUrl: item.image_url,
        qtyInOrder: item.qty_in_order || 0,
        stockQty: item.stock_qty || 0,
        customFields: item.custom_fields || {},
      }))

      const response = await fetch(`/api/sheets/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobNumber: jobNumber.trim() || null,
          items: updatedItems,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update sheet")
      }

      toast({
        title: "Success",
        description: "Sheet updated successfully",
      })

      router.push(`/sheets/${params.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update sheet",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!sheet) {
    return null // Will redirect
  }

  const template = sheet.sheet_templates

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Production Sheet</h1>
        <p className="text-muted-foreground mt-2">
          Edit the details and quantities for products in this sheet
        </p>
      </div>

      {/* Template Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>
            This sheet uses the following template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-semibold text-lg">{template?.name || "N/A"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Number Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sheet Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="jobNumber">Job Number (Optional)</Label>
            <Input
              id="jobNumber"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Enter job number"
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage products and adjust quantities for this production sheet
              </CardDescription>
            </div>
            <Button onClick={() => setBannerSelectorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products added yet. Click &quot;Add Product&quot; to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {item.image_url && (
                        <div className="w-16 h-16 border rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={item.image_url}
                            alt={item.banner_sku}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">SKU</Label>
                          <div className="font-medium">{item.banner_sku}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.banner_name}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`qty-in-order-${index}`} className="text-xs text-muted-foreground">
                              Qty in Order
                            </Label>
                            <Input
                              id={`qty-in-order-${index}`}
                              type="number"
                              min="0"
                              value={item.qty_in_order}
                              onChange={(e) =>
                                updateItemQuantity(index, "qty_in_order", parseInt(e.target.value) || 0)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`stock-qty-${index}`} className="text-xs text-muted-foreground">
                              Qty in Stock
                            </Label>
                            <Input
                              id={`stock-qty-${index}`}
                              type="number"
                              min="0"
                              value={item.stock_qty}
                              onChange={(e) =>
                                updateItemQuantity(index, "stock_qty", parseInt(e.target.value) || 0)
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Button variant="outline" onClick={() => router.push(`/sheets/${params.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <BannerSelector
        open={bannerSelectorOpen}
        onOpenChange={setBannerSelectorOpen}
        onSelect={handleBannerSelect}
        categoriesToInclude={template?.categories_to_include}
        productsToInclude={template?.products_to_include}
        productsToExclude={template?.products_to_exclude}
        categoriesToExclude={template?.categories_to_exclude}
      />
    </div>
  )
}

