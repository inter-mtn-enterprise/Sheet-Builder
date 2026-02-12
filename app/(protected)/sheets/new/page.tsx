"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { BannerSelector } from "@/components/BannerSelector"
import { Save, Plus } from "lucide-react"

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
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [jobNumber, setJobNumber] = useState("")
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannerSelectorOpen, setBannerSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [selectedTemplateId, templates])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates")
      const data = await response.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    }
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

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Production Sheet</h1>
        <p className="text-muted-foreground mt-2">
          Create a new production sheet from a template
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sheet Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="jobNumber">Job Number (Optional)</Label>
            <Input
              id="jobNumber"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Enter job number"
            />
          </div>
        </CardContent>
      </Card>

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
              No banners added yet. Click "Add Banner" to get started.
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

      <div className="flex gap-4 mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Create Sheet"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/sheets")}>
          Cancel
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

