"use client"

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Loader2 } from "lucide-react"

interface Banner {
  id: string
  sku: string
  name: string
  product_code: string
  category: string
  image_url?: string
}

interface BannerSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (banners: Banner[]) => void
  selectedBannerIds?: string[]
  // Template-level product filtering
  categoriesToInclude?: string[]
  productsToInclude?: string[]
  productsToExclude?: string[]
  categoriesToExclude?: string[]
}

const PAGE_SIZE = 60

export function BannerSelector({
  open,
  onOpenChange,
  onSelect,
  selectedBannerIds = [],
  categoriesToInclude,
  productsToInclude,
  productsToExclude,
  categoriesToExclude,
}: BannerSelectorProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedBannerIds))
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch categories once when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open])

  // Fetch products when search or category changes (reset to page 1)
  useEffect(() => {
    if (open) {
      setPage(1)
      setBanners([])
      fetchBanners(1, false)
    }
  }, [debouncedSearch, categoryFilter, open])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/banners?categoriesOnly=true")
      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const buildFilterParams = (params: URLSearchParams) => {
    if (categoriesToInclude && categoriesToInclude.length > 0) {
      params.set("categoriesToInclude", JSON.stringify(categoriesToInclude))
    }
    if (productsToInclude && productsToInclude.length > 0) {
      params.set("productsToInclude", JSON.stringify(productsToInclude))
    }
    if (productsToExclude && productsToExclude.length > 0) {
      params.set("productsToExclude", JSON.stringify(productsToExclude))
    }
    if (categoriesToExclude && categoriesToExclude.length > 0) {
      params.set("categoriesToExclude", JSON.stringify(categoriesToExclude))
    }
  }

  const fetchBanners = async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: PAGE_SIZE.toString(),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter)

      // Apply template-level filters
      buildFilterParams(params)

      const response = await fetch(`/api/banners?${params}`)
      const data = await response.json()

      if (data.banners) {
        if (append) {
          setBanners(prev => [...prev, ...data.banners])
        } else {
          setBanners(data.banners)
        }
        setTotal(data.total || 0)
        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error("Failed to fetch banners:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchBanners(nextPage, true)
  }

  // Infinite scroll: load more when user scrolls near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < 300) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchBanners(nextPage, true)
    }
  }, [loadingMore, hasMore, page, debouncedSearch, categoryFilter])

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleAddSelected = () => {
    const selectedBanners = banners.filter((b) => selectedIds.has(b.id))
    onSelect(selectedBanners)
    setSelectedIds(new Set())
    setSearchTerm("")
    setDebouncedSearch("")
    setCategoryFilter("all")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Products</DialogTitle>
          <DialogDescription>
            Search and select products to add to your production sheet.
            {total > 0 && (
              <span className="ml-1">
                Showing {banners.length} of {total} products.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, Name, or Product Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedIds.has(banner.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleSelection(banner.id)}
                  >
                    {banner.image_url && (
                      <div className="w-full h-32 mb-2 rounded border bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={banner.image_url}
                          alt={banner.sku}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(banner.id)}
                        onCheckedChange={() => toggleSelection(banner.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{banner.sku}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {banner.name}
                        </div>
                        {banner.category && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {banner.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {hasMore && !loadingMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={loadMore}>
                    Load More Products
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <div className="text-sm text-muted-foreground mr-auto">
            {selectedIds.size} selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={selectedIds.size === 0}>
            Add Selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
