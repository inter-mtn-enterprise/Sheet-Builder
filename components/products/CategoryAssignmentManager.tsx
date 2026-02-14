"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Loader2, Link2 } from "lucide-react"

interface Assignment {
  id: string
  product_id: string
  category_id: string
  is_primary: boolean
  product_catalog: {
    id: string
    sku: string
    name: string | null
  }
  product_categories: {
    id: string
    name: string
    is_custom: boolean
  }
}

interface Product {
  id: string
  sku: string
  name: string | null
}

interface Category {
  id: string
  name: string
  is_custom: boolean
}

export function CategoryAssignmentManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchAssignments()
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/category-assignments")
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load assignments",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=1000")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const handleCreate = () => {
    setSelectedProductId("")
    setSelectedCategoryId("")
    setIsPrimary(false)
    setCreateDialogOpen(true)
  }

  const handleDelete = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setDeleteDialogOpen(true)
  }

  const saveAssignment = async () => {
    if (!selectedProductId || !selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select both a product and a category",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/category-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          category_id: selectedCategoryId,
          is_primary: isPrimary,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment created successfully",
        })
        setCreateDialogOpen(false)
        fetchAssignments()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteAssignment = async () => {
    if (!selectedAssignment) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/category-assignments/${selectedAssignment.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Assignment deleted successfully",
        })
        setDeleteDialogOpen(false)
        fetchAssignments()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    productSearch
      ? p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase()))
      : true
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Category Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Manage which categories are assigned to products.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No assignments yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-mono">{assignment.product_catalog.sku}</span>
                  {assignment.is_primary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
                {assignment.product_catalog.name && (
                  <div className="text-sm text-muted-foreground">
                    {assignment.product_catalog.name}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary">{assignment.product_categories.name}</Badge>
                  {assignment.product_categories.is_custom && (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(assignment)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Assign a category to a product. You can mark it as primary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.slice(0, 100).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} {product.name && `- ${product.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                      {category.is_custom && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Custom
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is-primary" className="text-sm font-medium">
                Set as primary category
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveAssignment}
              disabled={saving || !selectedProductId || !selectedCategoryId}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
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
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the category assignment? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAssignment}
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

