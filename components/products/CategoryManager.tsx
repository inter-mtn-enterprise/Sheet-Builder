"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Loader2, Tag } from "lucide-react"

interface Category {
  id: string
  name: string
  salesforce_id: string | null
  is_custom: boolean
  parent_category_id: string | null
  productCount?: number
}

interface CategoryManagerProps {
  onRefresh?: () => void
}

export function CategoryManager({ onRefresh }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [parentCategoryId, setParentCategoryId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/categories?includeCounts=true")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setCategoryName("")
    setParentCategoryId("__none__")
    setSelectedCategory(null)
    setCreateDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    if (!category.is_custom) {
      toast({
        title: "Cannot Edit",
        description: "Salesforce categories cannot be edited",
        variant: "destructive",
      })
      return
    }
    setSelectedCategory(category)
    setCategoryName(category.name)
    setParentCategoryId(category.parent_category_id || "__none__")
    setEditDialogOpen(true)
  }

  const handleDelete = (category: Category) => {
    if (!category.is_custom) {
      toast({
        title: "Cannot Delete",
        description: "Salesforce categories cannot be deleted",
        variant: "destructive",
      })
      return
    }
    setSelectedCategory(category)
    setDeleteDialogOpen(true)
  }

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const url = selectedCategory
        ? `/api/categories/${selectedCategory.id}`
        : "/api/categories"
      const method = selectedCategory ? "PUT" : "POST"
      const body = {
        name: categoryName.trim(),
        ...(parentCategoryId && parentCategoryId !== "__none__" ? { parent_category_id: parentCategoryId } : { parent_category_id: null }),
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedCategory
            ? "Category updated successfully"
            : "Category created successfully",
        })
        setCreateDialogOpen(false)
        setEditDialogOpen(false)
        fetchCategories()
        onRefresh?.()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save category",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async () => {
    if (!selectedCategory) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category deleted successfully",
        })
        setDeleteDialogOpen(false)
        fetchCategories()
        onRefresh?.()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete category",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const customCategories = categories.filter((c) => c.is_custom)
  const salesforceCategories = categories.filter((c) => !c.is_custom)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categories</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom categories. Salesforce categories are read-only.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Category
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Custom Categories */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Custom Categories ({customCategories.length})
            </h4>
            {customCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No custom categories yet. Create one to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customCategories.map((category) => (
                  <div
                    key={category.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.productCount || 0} products
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Salesforce Categories */}
          <div>
            <h4 className="font-semibold mb-3">Salesforce Categories ({salesforceCategories.length})</h4>
            {salesforceCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No Salesforce categories imported yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {salesforceCategories.map((category) => (
                  <div
                    key={category.id}
                    className="border rounded-lg p-4 flex items-center justify-between opacity-75"
                  >
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        {category.name}
                        <Badge variant="outline" className="text-xs">
                          Salesforce
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {category.productCount || 0} products
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditDialogOpen(false)
            setCategoryName("")
            setParentCategoryId("")
            setSelectedCategory(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? "Update the category name and parent category."
                : "Create a new custom category for organizing products."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div>
              <Label htmlFor="parent-category">Parent Category (Optional)</Label>
              <Select value={parentCategoryId || "__none__"} onValueChange={setParentCategoryId}>
                <SelectTrigger id="parent-category">
                  <SelectValue placeholder="No parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No parent category</SelectItem>
                  {customCategories
                    .filter((c) => !selectedCategory || c.id !== selectedCategory.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={saving || !categoryName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedCategory ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This will
              remove all product assignments to this category. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCategory}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

