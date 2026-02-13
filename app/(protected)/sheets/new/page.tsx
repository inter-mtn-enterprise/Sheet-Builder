"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { BannerSelector } from "@/components/BannerSelector"
import { Save, Plus, ArrowLeft, Edit } from "lucide-react"

interface Template {
  id: string
  name: string
  field_definitions: any[]
  categories_to_include?: string[]
  products_to_include?: string[]
  products_to_exclude?: string[]
  categories_to_exclude?: string[]
}

interface Banner {
  id: string
  sku: string
  name: string
  product_code: string
  category: string
  image_url?: string
}

export default function NewSheetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [jobNumber, setJobNumber] = useState("")
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannerSelectorOpen, setBannerSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTemplate = useCallback(async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()
      
      if (response.ok && data.template) {
        setSelectedTemplate(data.template)
      } else {
        toast({
          title: "Error",
          description: "Template not found",
          variant: "destructive",
        })
        router.push("/sheets/new/select-template")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      })
      router.push("/sheets/new/select-template")
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    const templateId = searchParams.get("templateId")
    
    if (!templateId) {
      // No template selected, redirect to step 1
      router.push("/sheets/new/select-template")
      return
    }

    setSelectedTemplateId(templateId)
    fetchTemplate(templateId)
  }, [searchParams, router, fetchTemplate])

  const handleChangeTemplate = () => {
    // Navigate back to step 1 to change template
    router.push("/sheets/new/select-template")
  }

  const handleBannerSelect = (selected: Banner[]) => {
    setBanners([...banners, ...selected])
  }

  const removeBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      })
      return
    }

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
      const items = banners.map((banner) => ({
        bannerSku: banner.sku,
        bannerName: banner.name,
        imageUrl: banner.image_url,
        quantity: 1,
        qtyInOrder: 0,
        stockQty: 0,
        customFields: {},
      }))

      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          jobNumber: jobNumber.trim() || null,
          items,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create sheet")
      }

      toast({
        title: "Success",
        description: "Sheet created successfully",
      })

      router.push(`/sheets/${data.sheet.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sheet",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!selectedTemplate) {
    return null // Will redirect
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Production Sheet</h1>
        <p className="text-muted-foreground mt-2">
          Step 2 of 2: Add banners to your production sheet
        </p>
      </div>

      {/* Template Display Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Selected Template</CardTitle>
              <CardDescription>
                The template that defines the fields and product filters for this sheet
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleChangeTemplate} size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Change Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-semibold text-lg">{selectedTemplate.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Template ID: {selectedTemplate.id.slice(0, 8)}...
              </div>
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
                Add banners to this production sheet
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
                  <div>
                    <div className="font-medium">{banner.sku}</div>
                    <div className="text-sm text-muted-foreground">
                      {banner.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBanner(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <Button variant="outline" onClick={() => router.push("/sheets")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Create Sheet"}
        </Button>
      </div>

      <BannerSelector
        open={bannerSelectorOpen}
        onOpenChange={setBannerSelectorOpen}
        onSelect={handleBannerSelect}
        categoriesToInclude={selectedTemplate?.categories_to_include}
        productsToInclude={selectedTemplate?.products_to_include}
        productsToExclude={selectedTemplate?.products_to_exclude}
        categoriesToExclude={selectedTemplate?.categories_to_exclude}
      />
    </div>
  )
}
