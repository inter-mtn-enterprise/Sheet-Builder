"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Printer, ArrowLeft, Edit, Factory, CheckCircle2, Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_production: "In Production",
  draft: "Draft",
}

const STATUS_BG: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  in_production: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
}

interface Sheet {
  id: string
  job_number: string | null
  status: string
  estimated_completion_date: string | null
  completed_at: string | null
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

  // Modal states
  const [showProductionModal, setShowProductionModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [estimatedDate, setEstimatedDate] = useState("")
  const [statusChanging, setStatusChanging] = useState(false)

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

  const handleMoveToProduction = async () => {
    if (!estimatedDate) {
      toast({
        title: "Error",
        description: "Please select an estimated completion date",
        variant: "destructive",
      })
      return
    }

    setStatusChanging(true)
    try {
      const response = await fetch(`/api/sheets/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "in_production",
          estimated_completion_date: new Date(estimatedDate).toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      toast({
        title: "Success",
        description: "Sheet moved to In Production",
      })

      setShowProductionModal(false)
      setEstimatedDate("")
      fetchSheet()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setStatusChanging(false)
    }
  }

  const handleMarkComplete = async () => {
    setStatusChanging(true)
    try {
      const response = await fetch(`/api/sheets/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      toast({
        title: "Success",
        description: "Sheet marked as Completed",
      })

      setShowCompleteModal(false)
      fetchSheet()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setStatusChanging(false)
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

  const statusLabel = STATUS_LABELS[sheet.status] || sheet.status
  const statusBg = STATUS_BG[sheet.status] || "bg-gray-100 text-gray-800"

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/sheets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {sheet.job_number || "Production Sheet"}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-muted-foreground mt-2">
            Template: {sheet.sheet_templates?.name || "N/A"}
          </p>
          {sheet.estimated_completion_date && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Est. Completion: {new Date(sheet.estimated_completion_date).toLocaleDateString()}
            </p>
          )}
          {sheet.completed_at && (
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed: {new Date(sheet.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Edit button - available for draft and production sheets */}
          {(sheet.status === "draft" || sheet.status === "in_production" || sheet.status === "production_started") && (
            <Link href={`/sheets/${params.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}

          {/* Status change buttons */}
          {sheet.status === "draft" && (
            <Button
              variant="default"
              onClick={() => setShowProductionModal(true)}
            >
              <Factory className="mr-2 h-4 w-4" />
              Move to Production
            </Button>
          )}
          {sheet.status === "in_production" && (
            <Button
              variant="default"
              onClick={() => setShowCompleteModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Complete
            </Button>
          )}

          <Link href={`/sheets/${params.id}/print`}>
            <Button variant="outline">
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

      {/* Move to Production Modal */}
      <Dialog open={showProductionModal} onOpenChange={setShowProductionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to In Production</DialogTitle>
            <DialogDescription>
              Set an estimated completion date for this production sheet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="estimatedDate">Estimated Completion Date</Label>
            <Input
              id="estimatedDate"
              type="date"
              value={estimatedDate}
              onChange={(e) => setEstimatedDate(e.target.value)}
              className="mt-2"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProductionModal(false)
                setEstimatedDate("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMoveToProduction}
              disabled={statusChanging || !estimatedDate}
            >
              {statusChanging ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Complete Confirmation */}
      <AlertDialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the sheet as completed and log the completion date.
              This action moves the sheet to the Completed section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkComplete}
              disabled={statusChanging}
              className="bg-green-600 hover:bg-green-700"
            >
              {statusChanging ? "Updating..." : "Mark Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
