"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Printer, ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Sheet {
  id: string
  job_number: string | null
  status: string
  sheet_templates: {
    name: string
    field_definitions: any[]
  } | null
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

export default function SheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [items, setItems] = useState<SheetItem[]>([])
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
        setSheet(data.sheet)
      }
      if (data.items) {
        setItems(data.items)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sheet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">
          Sheet not found
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/sheets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {sheet.job_number || "Production Sheet"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Template: {sheet.sheet_templates?.name || "N/A"}
          </p>
        </div>
        <div className="ml-auto">
          <Link href={`/sheets/${params.id}/print`}>
            <Button>
              <Printer className="mr-2 h-4 w-4" />
              Print Sheet
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sheet Items</CardTitle>
          <CardDescription>
            {items.length} item{items.length !== 1 ? "s" : ""} in this sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items in this sheet
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">SKU</Label>
                        <div className="font-medium">{item.banner_sku}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <div className="text-sm">{item.banner_name || "N/A"}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <div>{item.quantity}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Qty in Order</Label>
                        <div>{item.qty_in_order}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

