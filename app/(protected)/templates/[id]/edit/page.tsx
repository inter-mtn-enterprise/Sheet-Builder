"use client"

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { BannerSelector } from "@/components/BannerSelector"
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react"

type FieldType = "text" | "number" | "checkbox" | "checkbox-group" | "select"

interface FieldDefinition {
  id: string
  type: FieldType
  label: string
  required?: boolean
  options?: string[]
  defaultValue?: string | number | boolean
}

interface Banner {
  id: string
  sku: string
  name: string
  product_code: string
  category: string
  image_url?: string
}

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [isShared, setIsShared] = useState(false)
  const [fields, setFields] = useState<FieldDefinition[]>([])

  // Product filtering state
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [categoriesToInclude, setCategoriesToInclude] = useState<string[]>([])
  const [categoriesToExclude, setCategoriesToExclude] = useState<string[]>([])
  const [productsToInclude, setProductsToInclude] = useState<Banner[]>([])
  const [productsToExclude, setProductsToExclude] = useState<Banner[]>([])
  const [includeProductSkus, setIncludeProductSkus] = useState<string[]>([])
  const [excludeProductSkus, setExcludeProductSkus] = useState<string[]>([])
  const [includeProductSelectorOpen, setIncludeProductSelectorOpen] = useState(false)
  const [excludeProductSelectorOpen, setExcludeProductSelectorOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchTemplate()
  }, [])

  // Once we have product SKUs from the template, resolve them to full Banner objects
  useEffect(() => {
    if (includeProductSkus.length > 0 && productsToInclude.length === 0) {
      resolveProducts(includeProductSkus, setProductsToInclude)
    }
  }, [includeProductSkus])

  useEffect(() => {
    if (excludeProductSkus.length > 0 && productsToExclude.length === 0) {
      resolveProducts(excludeProductSkus, setProductsToExclude)
    }
  }, [excludeProductSkus])

  const resolveProducts = async (skus: string[], setter: (banners: Banner[]) => void) => {
    try {
      // Fetch all products and filter by SKUs - for small lists this is fine
      // For larger lists we could add a dedicated API endpoint
      const params = new URLSearchParams({ limit: "1000" })
      const response = await fetch(`/api/banners?${params}`)
      const data = await response.json()
      if (data.banners) {
        const skuSet = new Set(skus)
        const matched = data.banners.filter((b: Banner) => skuSet.has(b.sku))
        setter(matched)
      }
    } catch (error) {
      console.error("Failed to resolve product SKUs:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/banners?categoriesOnly=true")
      const data = await response.json()
      if (data.categories) {
        setAllCategories(data.categories)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load template")
      }

      const template = data.template
      setName(template.name || "")
      setIsShared(template.is_shared || false)
      setFields(template.field_definitions || [])
      setCategoriesToInclude(template.categories_to_include || [])
      setCategoriesToExclude(template.categories_to_exclude || [])
      setIncludeProductSkus(template.products_to_include || [])
      setExcludeProductSkus(template.products_to_exclude || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load template",
        variant: "destructive",
      })
      router.push("/templates")
    } finally {
      setLoading(false)
    }
  }

  const addField = (type: FieldType) => {
    const newField: FieldDefinition = {
      id: Date.now().toString(),
      type,
      label: "",
      required: false,
    }

    if (type === "select" || type === "checkbox-group") {
      newField.options = []
    }

    setFields([...fields, newField])
  }

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const addOption = (fieldId: string) => {
    setFields(
      fields.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...(f.options || []), ""] }
          : f
      )
    )
  }

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    setFields(
      fields.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              options: f.options?.map((opt, idx) =>
                idx === optionIndex ? value : opt
              ),
            }
          : f
      )
    )
  }

  const removeOption = (fieldId: string, optionIndex: number) => {
    setFields(
      fields.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              options: f.options?.filter((_, idx) => idx !== optionIndex),
            }
          : f
      )
    )
  }

  const toggleCategoryInclude = (cat: string) => {
    setCategoriesToInclude((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const toggleCategoryExclude = (cat: string) => {
    setCategoriesToExclude((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleIncludeProductSelect = (selected: Banner[]) => {
    const existingSkus = new Set(productsToInclude.map((p) => p.sku))
    const newProducts = selected.filter((p) => !existingSkus.has(p.sku))
    setProductsToInclude([...productsToInclude, ...newProducts])
  }

  const handleExcludeProductSelect = (selected: Banner[]) => {
    const existingSkus = new Set(productsToExclude.map((p) => p.sku))
    const newProducts = selected.filter((p) => !existingSkus.has(p.sku))
    setProductsToExclude([...productsToExclude, ...newProducts])
  }

  const removeIncludeProduct = (sku: string) => {
    setProductsToInclude(productsToInclude.filter((p) => p.sku !== sku))
  }

  const removeExcludeProduct = (sku: string) => {
    setProductsToExclude(productsToExclude.filter((p) => p.sku !== sku))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      })
      return
    }

    if (fields.length === 0) {
      toast({
        title: "Error",
        description: "At least one field is required",
        variant: "destructive",
      })
      return
    }

    for (const field of fields) {
      if (!field.label.trim()) {
        toast({
          title: "Error",
          description: "All fields must have a label",
          variant: "destructive",
        })
        return
      }

      if (
        (field.type === "select" || field.type === "checkbox-group") &&
        (!field.options || field.options.length === 0)
      ) {
        toast({
          title: "Error",
          description: `${field.label} must have at least one option`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          isShared,
          fieldDefinitions: fields,
          categoriesToInclude,
          productsToInclude: productsToInclude.map((p) => p.sku),
          productsToExclude: productsToExclude.map((p) => p.sku),
          categoriesToExclude,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update template")
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      })

      router.push("/templates")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Template</h1>
        <p className="text-muted-foreground mt-2">
          Update your production sheet template
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Banner Production Sheet"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="shared"
              checked={isShared}
              onCheckedChange={(checked) => setIsShared(checked === true)}
            />
            <Label htmlFor="shared">Share this template with other users</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Filtering</CardTitle>
          <CardDescription>
            Control which products are available when this template is used. Leave all filters empty to show all products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Categories to Include */}
          <div>
            <Label className="text-base font-semibold">Categories to Include</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Only products from these categories will be shown. Leave empty to include all categories.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {categoriesToInclude.map((cat) => (
                <Badge key={cat} variant="default" className="cursor-pointer" onClick={() => toggleCategoryInclude(cat)}>
                  {cat}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(val) => {
                if (val && !categoriesToInclude.includes(val)) {
                  toggleCategoryInclude(val)
                }
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Add a category to include..." />
              </SelectTrigger>
              <SelectContent>
                {allCategories
                  .filter((cat) => !categoriesToInclude.includes(cat))
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products to Include */}
          <div>
            <Label className="text-base font-semibold">Products to Include</Label>
            <p className="text-sm text-muted-foreground mb-2">
              These specific products will always be shown, regardless of category filters.
            </p>
            {productsToInclude.length > 0 && (
              <div className="space-y-1 mb-2">
                {productsToInclude.map((product) => (
                  <div
                    key={product.sku}
                    className="flex items-center justify-between p-2 border rounded-md text-sm"
                  >
                    <div>
                      <span className="font-medium">{product.sku}</span>
                      <span className="text-muted-foreground ml-2">{product.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIncludeProduct(product.sku)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncludeProductSelectorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Products to Include
            </Button>
          </div>

          {/* Categories to Exclude */}
          <div>
            <Label className="text-base font-semibold">Categories to Exclude</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Products in these categories will be hidden.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {categoriesToExclude.map((cat) => (
                <Badge key={cat} variant="destructive" className="cursor-pointer" onClick={() => toggleCategoryExclude(cat)}>
                  {cat}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(val) => {
                if (val && !categoriesToExclude.includes(val)) {
                  toggleCategoryExclude(val)
                }
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Add a category to exclude..." />
              </SelectTrigger>
              <SelectContent>
                {allCategories
                  .filter((cat) => !categoriesToExclude.includes(cat))
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products to Exclude */}
          <div>
            <Label className="text-base font-semibold">Products to Exclude</Label>
            <p className="text-sm text-muted-foreground mb-2">
              These specific products will always be hidden, even if their category is included.
            </p>
            {productsToExclude.length > 0 && (
              <div className="space-y-1 mb-2">
                {productsToExclude.map((product) => (
                  <div
                    key={product.sku}
                    className="flex items-center justify-between p-2 border rounded-md text-sm"
                  >
                    <div>
                      <span className="font-medium">{product.sku}</span>
                      <span className="text-muted-foreground ml-2">{product.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExcludeProduct(product.sku)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExcludeProductSelectorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Products to Exclude
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>
            Add fields to your template. These will appear on production sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField("text")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Text Field
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField("number")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Number Field
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField("checkbox")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Checkbox
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField("checkbox-group")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Checkbox Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField("select")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Dropdown
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field) => (
              <Card key={field.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label>Field Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                            placeholder="Field label"
                          />
                        </div>
                        <div>
                          <Label>Field Type</Label>
                          <div className="text-sm text-muted-foreground mt-2">
                            {field.type}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateField(field.id, { required: checked === true })
                        }
                      />
                      <Label htmlFor={`required-${field.id}`}>Required</Label>
                    </div>

                    {(field.type === "select" ||
                      field.type === "checkbox-group") && (
                      <div>
                        <Label>Options</Label>
                        <div className="space-y-2 mt-2">
                          {field.options?.map((option, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) =>
                                  updateOption(field.id, idx, e.target.value)
                                }
                                placeholder={`Option ${idx + 1}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(field.id, idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(field.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No fields added yet. Click the buttons above to add fields.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Update Template
        </Button>
        <Button variant="outline" onClick={() => router.push("/templates")}>
          Cancel
        </Button>
      </div>

      <BannerSelector
        open={includeProductSelectorOpen}
        onOpenChange={setIncludeProductSelectorOpen}
        onSelect={handleIncludeProductSelect}
        selectedBannerIds={productsToInclude.map((p) => p.id)}
      />

      <BannerSelector
        open={excludeProductSelectorOpen}
        onOpenChange={setExcludeProductSelectorOpen}
        onSelect={handleExcludeProductSelect}
        selectedBannerIds={productsToExclude.map((p) => p.id)}
      />
    </div>
  )
}

