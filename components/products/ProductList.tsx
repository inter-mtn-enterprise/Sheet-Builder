"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Search, Loader2, Image as ImageIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Product {
  id: string
  sku: string
  name: string | null
  product_code: string | null
  category: string | null
  image_url: string | null
  product_categories?: {
    id: string
    name: string
    is_custom: boolean
  }
}

interface ProductListProps {
  onRefresh?: () => void
}

export function ProductList({ onRefresh }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [categories, setCategories] = useState<Array<{ id: string; name: string; is_custom: boolean }>>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [search, categoryId, page])

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

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        includeCategoryDetails: "true",
      })
      if (search) params.append("search", search)
      if (categoryId) params.append("categoryId", categoryId)

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (page === 1) {
          setProducts(data.products || [])
        } else {
          setProducts(prev => [...prev, ...(data.products || [])])
        }
        setHasMore(data.hasMore || false)
        setTotal(data.total || 0)
      } else {
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleCategoryChange = (value: string) => {
    // Convert special value back to empty string for "all categories"
    setCategoryId(value === "__all__" ? "" : value)
    setPage(1)
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={categoryId || "__all__"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
                {cat.is_custom && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Custom
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {products.length} of {total} products
      </div>

      {/* Product Grid */}
      {loading && products.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No products found
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                {product.image_url ? (
                  <div className="w-full h-32 mb-3 rounded border bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.sku}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 mb-3 rounded border bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-sm font-mono">{product.sku}</div>
                  {product.name && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {product.name}
                    </div>
                  )}
                  {product.product_categories && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {product.product_categories.name}
                      </Badge>
                      {product.product_categories.is_custom && (
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                  )}
                  {product.category && !product.product_categories && (
                    <Badge variant="secondary" className="text-xs mt-2">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

