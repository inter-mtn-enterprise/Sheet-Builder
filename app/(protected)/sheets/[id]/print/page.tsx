"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Printer, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
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

export default function PrintSheetPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [items, setItems] = useState<SheetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  const handlePrint = () => {
    window.print()
  }

  const handleFinishAndSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/sheets/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save sheet")
      }

      toast({
        title: "Success",
        description: "Sheet marked as completed and saved",
      })

      router.push("/sheets")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save sheet",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleMarkInProduction = async () => {
    try {
      const response = await fetch(`/api/sheets/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "in_production",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update sheet status")
      }

      toast({
        title: "Success",
        description: "Sheet marked as In Production",
      })

      fetchSheet()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update sheet",
        variant: "destructive",
      })
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
    <>
      <div className="no-print container mx-auto py-4 flex gap-4">
        <Link href={`/sheets/${params.id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button onClick={handleMarkInProduction} variant="outline">
          Mark as In Production
        </Button>
        <Button onClick={handleFinishAndSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Finish & Save"}
        </Button>
      </div>

      <div className="container mx-auto py-8 print-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Banner Production Sheet - {sheet.job_number || "N/A"}
          </h1>
          <p className="text-muted-foreground">
            Date: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="print-card border-2">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-48">
                    <div className="border border-black h-48 bg-gray-100 flex items-center justify-center mb-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.banner_sku}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-bold">IMAGE</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold block mb-1">Time</label>
                        <div className="space-y-1">
                          <input
                            type="text"
                            className="w-full border-b border-black bg-transparent text-xs"
                          />
                          <input
                            type="text"
                            className="w-full border-b border-black bg-transparent text-xs"
                          />
                          <input
                            type="text"
                            className="w-full border-b border-black bg-transparent text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Initials</label>
                        <input
                          type="text"
                          className="w-full border-b border-black bg-transparent text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex">
                      <span className="font-bold w-24">Job #:</span>
                      <span className="border-b border-black flex-1 px-2">
                        {sheet.job_number || ""}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-bold w-24">SKU:</span>
                      <span className="border-b border-black flex-1 px-2">
                        {item.banner_sku}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-bold w-24">QTY in Order:</span>
                      <span className="border-b border-black flex-1 px-2">
                        {item.qty_in_order}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-bold w-24">QTY in Stock:</span>
                      <span className="border-b border-black flex-1 px-2">
                        {item.stock_qty}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="font-bold mb-2">Stencil:</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>Styrene</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>Vinyl</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>Extra Sticky</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-bold mb-2">Ink:</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>White</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>Black</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="font-bold mb-2">Ticker Tape:</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="font-bold">Completed:</span>
                      <input type="checkbox" className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0;
          }
          .print-card {
            page-break-inside: avoid;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </>
  )
}

