"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, ArrowLeft, Edit, Info, Filter, FileText } from "lucide-react"

interface Template {
  id: string
  name: string
  is_shared: boolean
  field_definitions: any[]
  categories_to_include?: string[]
  products_to_include?: string[]
  products_to_exclude?: string[]
  categories_to_exclude?: string[]
  user_id?: string
}

interface FieldDefinition {
  id: string
  type: string
  label: string
  required?: boolean
  options?: string[]
}

export default function SelectTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  useEffect(() => {
    fetchTemplates()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error)
    }
  }

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateDetails(selectedTemplateId)
    } else {
      setSelectedTemplate(null)
    }
  }, [selectedTemplateId])

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
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplateDetails = async (templateId: string) => {
    setLoadingTemplate(true)
    try {
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()
      
      if (response.ok && data.template) {
        setSelectedTemplate(data.template)
      } else {
        toast({
          title: "Error",
          description: "Failed to load template details",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      })
    } finally {
      setLoadingTemplate(false)
    }
  }

  const handleContinue = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template to continue",
        variant: "destructive",
      })
      return
    }

    // Navigate to step 2 with the selected template ID
    router.push(`/sheets/new?templateId=${selectedTemplateId}`)
  }

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: "Text Field",
      number: "Number Field",
      checkbox: "Checkbox",
      "checkbox-group": "Checkbox Group",
      select: "Dropdown",
    }
    return labels[type] || type
  }

  const renderFieldPreview = (field: FieldDefinition) => {
    switch (field.type) {
      case "text":
        return (
          <div className="space-y-1">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="h-8 border rounded px-2 bg-muted text-sm text-muted-foreground flex items-center">
              Example text value
            </div>
          </div>
        )
      case "number":
        return (
          <div className="space-y-1">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="h-8 border rounded px-2 bg-muted text-sm text-muted-foreground flex items-center">
              123
            </div>
          </div>
        )
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 border rounded bg-muted"></div>
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
          </div>
        )
      case "checkbox-group":
        return (
          <div className="space-y-2">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="space-y-1">
              {(field.options || []).slice(0, 2).map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="h-4 w-4 border rounded bg-muted"></div>
                  <span className="text-xs text-muted-foreground">{opt}</span>
                </div>
              ))}
              {(field.options || []).length > 2 && (
                <span className="text-xs text-muted-foreground">+{(field.options || []).length - 2} more</span>
              )}
            </div>
          </div>
        )
      case "select":
        return (
          <div className="space-y-1">
            <Label className="text-xs">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="h-8 border rounded px-2 bg-muted text-sm text-muted-foreground flex items-center">
              {field.options && field.options.length > 0 ? field.options[0] : "Select option..."}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Production Sheet</h1>
        <p className="text-muted-foreground mt-2">
          Step 1 of 2: Select a template to get started
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Template</CardTitle>
            <CardDescription>
              Choose a template that defines the fields and product filters for your production sheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={loading}
              >
                <SelectTrigger id="template" className="w-full mt-2">
                  <SelectValue placeholder={loading ? "Loading templates..." : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        {template.is_shared && (
                          <span className="ml-2 text-xs text-muted-foreground">(Shared)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">Selected Template</p>
                    {currentUserId && selectedTemplate.user_id === currentUserId && (
                      <Link href={`/templates/${selectedTemplate.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                  <p className="text-sm">{selectedTemplate.name}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/sheets")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedTemplateId || loading}
                className="flex items-center gap-2 ml-auto"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Template Preview Card */}
        {selectedTemplate && !loadingTemplate && (
          <div className="space-y-6">
            {/* Example Sheet Item Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <CardTitle className="text-lg">Example Sheet Item</CardTitle>
                </div>
                <CardDescription>
                  This is what each item in your production sheet will look like
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-card space-y-4">
                  {/* Standard Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">SKU</Label>
                      <div className="font-medium text-sm mt-1">EXAMPLE-SKU-001</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <div className="text-sm mt-1">Example Banner Name</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <div className="text-sm mt-1">1</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Qty in Order</Label>
                      <div className="text-sm mt-1">0</div>
                    </div>
                  </div>

                  {/* Custom Fields Preview */}
                  {selectedTemplate.field_definitions && selectedTemplate.field_definitions.length > 0 && (
                    <>
                      <div className="border-t my-3" />
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground">Custom Fields</Label>
                        {selectedTemplate.field_definitions.map((field: FieldDefinition) => (
                          <div key={field.id}>
                            {renderFieldPreview(field)}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fields List */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <CardTitle className="text-lg">Template Fields</CardTitle>
                </div>
                <CardDescription>
                  Fields that will be available for each item in the sheet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplate.field_definitions && selectedTemplate.field_definitions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTemplate.field_definitions.map((field: FieldDefinition) => (
                      <div key={field.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getFieldTypeLabel(field.type)}
                          </Badge>
                          <span className="text-sm font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom fields defined</p>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="text-lg">Product Filters</CardTitle>
                </div>
                <CardDescription>
                  Filters that control which products appear in the banner selector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedTemplate.categories_to_include && selectedTemplate.categories_to_include.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        Categories to Include
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.categories_to_include.map((cat, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate.categories_to_exclude && selectedTemplate.categories_to_exclude.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        Categories to Exclude
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.categories_to_exclude.map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate.products_to_include && selectedTemplate.products_to_include.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        Products to Include
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {selectedTemplate.products_to_include.length} product(s) specified
                      </div>
                    </div>
                  )}

                  {selectedTemplate.products_to_exclude && selectedTemplate.products_to_exclude.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        Products to Exclude
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {selectedTemplate.products_to_exclude.length} product(s) specified
                      </div>
                    </div>
                  )}

                  {(!selectedTemplate.categories_to_include || selectedTemplate.categories_to_include.length === 0) &&
                    (!selectedTemplate.categories_to_exclude || selectedTemplate.categories_to_exclude.length === 0) &&
                    (!selectedTemplate.products_to_include || selectedTemplate.products_to_include.length === 0) &&
                    (!selectedTemplate.products_to_exclude || selectedTemplate.products_to_exclude.length === 0) && (
                      <p className="text-sm text-muted-foreground">No filters applied - all products will be available</p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {loadingTemplate && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading template details...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
