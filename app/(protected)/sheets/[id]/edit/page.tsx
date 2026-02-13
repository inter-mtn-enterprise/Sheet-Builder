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

export default function EditSheetPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [items, setItems] = useState<SheetItem[]>([])
  const [jobNumber, setJobNumber] = useState("")
  const [banners, setBanners] = useState<Banner[]>([])
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
        // Only allow editing draft sheets
        if (data.sheet.status !== "draft") {
          toast({
            title: "Cannot Edit",
            description: "Only draft sheets can be edited.",
            variant: "destructive",
          })
          router.push(`/sheets/${params.id}`)
          return
        }

        setSheet(data.sheet)
        setJobNumber(data.sheet.job_number || "")

        // Convert existing items to banner format for display
        if (data.items) {
          setItems(data.items)
          const existingBanners: Banner[] = data.items.map((item: SheetItem) => ({
            id: item.id,
            sku: item.banner_sku,
            name: item.banner_name || "",
            product_code: "",
            category: "",
            image_url: item.image_url || undefined,
          }))
          setBanners(existingBanners)
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
    setBanners([...banners, ...selected])
  }

  const removeBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (banners.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one banner",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const updatedItems = banners.map((banner) => {
        // Try to find existing item data for this banner
        const existingItem = items.find((item) => item.banner_sku === banner.sku)
        return {
          bannerSku: banner.sku,
          bannerName: banner.name,
          imageUrl: banner.image_url,
          quantity: existingItem?.quantity || 1,
          qtyInOrder: existingItem?.qty_in_order || 0,
          stockQty: existingItem?.stock_qty || 0,
          customFields: existingItem?.custom_fields || {},
        }
      })

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
          Edit the details and items of this draft sheet
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

      {/* Banners Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Banners</CardTitle>
              <CardDescription>
                Manage the banners in this production sheet
              </CardDescription>
            </div>
            <Button onClick={() => setBannerSelectorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Banner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No banners added yet. Click &quot;Add Banner&quot; to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {banners.map((banner, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {banner.image_url && (
                      <div className="w-10 h-10 border rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={banner.image_url}
                          alt={banner.sku}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{banner.sku}</div>
                      <div className="text-sm text-muted-foreground">
                        {banner.name}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBanner(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

