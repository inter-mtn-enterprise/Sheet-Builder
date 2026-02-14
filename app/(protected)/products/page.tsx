"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Package, Tag, Link2, Loader2 } from "lucide-react"
import { ProductList } from "@/components/products/ProductList"
import { CategoryManager } from "@/components/products/CategoryManager"
import { CategoryAssignmentManager } from "@/components/products/CategoryAssignmentManager"

type Tab = "products" | "categories" | "assignments"

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("products")
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    customCategories: 0,
    productsWithImages: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    checkUserRole()
    fetchStats()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Get product stats
      const productsRes = await fetch("/api/products?limit=1")
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setStats(prev => ({
          ...prev,
          totalProducts: productsData.total || 0,
        }))
      }

      // Get category stats
      const categoriesRes = await fetch("/api/categories?includeCounts=true")
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        const allCategories = categoriesData.categories || []
        setStats(prev => ({
          ...prev,
          totalCategories: allCategories.length,
          customCategories: allCategories.filter((c: any) => c.is_custom).length,
        }))
      }

      // Get products with images
      const productsWithImagesRes = await fetch("/api/products?limit=1000")
      if (productsWithImagesRes.ok) {
        const productsWithImagesData = await productsWithImagesRes.json()
        const withImages = (productsWithImagesData.products || []).filter(
          (p: any) => p.image_url
        ).length
        setStats(prev => ({
          ...prev,
          productsWithImages: withImages,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only managers can access the product management area.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage products, categories, and their relationships
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-2xl">{stats.totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Categories</CardDescription>
            <CardTitle className="text-2xl">{stats.totalCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custom Categories</CardDescription>
            <CardTitle className="text-2xl">{stats.customCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products with Images</CardDescription>
            <CardTitle className="text-2xl">{stats.productsWithImages}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 border-b">
            <Button
              variant={activeTab === "products" ? "default" : "ghost"}
              onClick={() => setActiveTab("products")}
              className="rounded-b-none"
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </Button>
            <Button
              variant={activeTab === "categories" ? "default" : "ghost"}
              onClick={() => setActiveTab("categories")}
              className="rounded-b-none"
            >
              <Tag className="h-4 w-4 mr-2" />
              Categories
            </Button>
            <Button
              variant={activeTab === "assignments" ? "default" : "ghost"}
              onClick={() => setActiveTab("assignments")}
              className="rounded-b-none"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Assignments
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeTab === "products" && <ProductList onRefresh={fetchStats} />}
          {activeTab === "categories" && (
            <CategoryManager onRefresh={fetchStats} />
          )}
          {activeTab === "assignments" && <CategoryAssignmentManager />}
        </CardContent>
      </Card>
    </div>
  )
}

