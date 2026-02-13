"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  FileText,
  Camera,
  ChevronDown,
  ChevronUp,
  User,
  ArrowLeft,
  Calendar,
  Play,
  Package,
  CheckCircle,
} from "lucide-react"

// ── Interfaces ──────────────────────────────────────────────

interface SheetOption {
  id: string
  job_number: string | null
  status: string
  sheet_templates: { name: string } | null
  estimated_completion_date: string | null
  created_at: string
}

interface SheetItem {
  id: string
  banner_sku: string
  banner_name: string | null
  image_url: string | null
  qty_in_order: number
  stock_qty: number
  qty_in_order_completed: number
  stock_qty_completed: number
  status: string
}

interface WorkLogPhoto {
  id: string
  photo_url: string
  caption: string | null
  created_at: string
}

interface WorkLog {
  id: string
  hours: number | null
  notes: string | null
  work_type: string
  item_id: string | null
  items_completed: any[]
  created_at: string
  users: { name: string | null; email: string } | null
  work_log_photos: WorkLogPhoto[]
}

// ── Status helpers ──────────────────────────────────────────

const ITEM_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: "bg-gray-100", text: "text-gray-800", label: "Not Started" },
  working: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Working" },
  partially_complete: { bg: "bg-orange-100", text: "text-orange-800", label: "Partial" },
  complete: { bg: "bg-green-100", text: "text-green-800", label: "Complete" },
}

const JOB_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  in_production: { bg: "bg-blue-100", text: "text-blue-800", label: "In Production" },
  production_started: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Production Started" },
  completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
  draft: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ── Main Component ──────────────────────────────────────────

export default function WorkLogPage() {
  const { toast } = useToast()

  // Sheet selection
  const [sheets, setSheets] = useState<SheetOption[]>([])
  const [selectedSheetId, setSelectedSheetId] = useState<string>("")
  const [selectedSheet, setSelectedSheet] = useState<SheetOption | null>(null)
  const [loadingSheets, setLoadingSheets] = useState(true)

  // Sheet items (products) for the selected sheet
  const [sheetItems, setSheetItems] = useState<SheetItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Log completion form
  const [loggingItemId, setLoggingItemId] = useState<string | null>(null)
  const [qtyInput, setQtyInput] = useState("")
  const [hours, setHours] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Photo upload
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Log history
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Fetch in-production and production_started sheets
  useEffect(() => {
    fetchSheets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch items and logs when a sheet is selected
  useEffect(() => {
    if (selectedSheetId) {
      const sheet = sheets.find((s) => s.id === selectedSheetId)
      setSelectedSheet(sheet || null)
      fetchSheetItems(selectedSheetId)
      fetchLogs(selectedSheetId)
    } else {
      setSelectedSheet(null)
      setSheetItems([])
      setLogs([])
      setLoggingItemId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheetId, sheets])

  const fetchSheets = async () => {
    try {
      const response = await fetch("/api/sheets?status=in_production,production_started")
      const data = await response.json()
      if (data.sheets) {
        setSheets(data.sheets)
      }
    } catch {
      toast({ title: "Error", description: "Failed to load sheets", variant: "destructive" })
    } finally {
      setLoadingSheets(false)
    }
  }

  const fetchSheetItems = async (sheetId: string) => {
    setLoadingItems(true)
    try {
      const response = await fetch(`/api/sheets/${sheetId}`)
      const data = await response.json()
      if (data.items) {
        setSheetItems(data.items)
      }
    } catch {
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" })
    } finally {
      setLoadingItems(false)
    }
  }

  const fetchLogs = async (sheetId: string) => {
    setLoadingLogs(true)
    try {
      const response = await fetch(`/api/work-logs?sheet_id=${sheetId}`)
      const data = await response.json()
      if (data.logs) {
        setLogs(data.logs)
      }
    } catch {
      toast({ title: "Error", description: "Failed to load work logs", variant: "destructive" })
    } finally {
      setLoadingLogs(false)
    }
  }

  // ── Start Working ─────────────────────────────────────────

  const handleStartWorking = async (itemId: string) => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: selectedSheetId,
          work_type: "start_working",
          item_id: itemId,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed")

      toast({ title: "Started", description: "Product marked as working" })
      fetchSheetItems(selectedSheetId)
      fetchLogs(selectedSheetId)
      // Refresh sheets list to get updated job status
      fetchSheets()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Log Completion ────────────────────────────────────────

  const handleLogCompletion = async () => {
    if (!loggingItemId || !selectedSheetId) return

    const qty = parseInt(qtyInput, 10)
    if (!qty || qty <= 0) {
      toast({ title: "Error", description: "Enter a valid quantity", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // 1. Create work log
      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: selectedSheetId,
          work_type: "log_completion",
          hours: hours ? parseFloat(hours) : null,
          notes: notes || null,
          items: [{ item_id: loggingItemId, qty_completed: qty }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed")

      // 2. Upload photos if any
      if (photoFiles.length > 0 && data.log?.id) {
        for (const file of photoFiles) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("work_log_id", data.log.id)
          await fetch("/api/work-logs/photos", { method: "POST", body: formData })
        }
      }

      toast({ title: "Logged", description: "Completion recorded" })

      // Reset form
      setLoggingItemId(null)
      setQtyInput("")
      setHours("")
      setNotes("")
      setPhotoFiles([])

      // Refresh data
      fetchSheetItems(selectedSheetId)
      fetchLogs(selectedSheetId)
      fetchSheets()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Photo helpers ─────────────────────────────────────────

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) setPhotoFiles((prev) => [...prev, ...Array.from(files)])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Helper: get item for a log entry ──────────────────────

  const getItemForLog = (log: WorkLog): SheetItem | undefined => {
    if (log.item_id) return sheetItems.find((i) => i.id === log.item_id)
    return undefined
  }

  // ── Render: Log Completion Form ───────────────────────────

  const loggingItem = loggingItemId ? sheetItems.find((i) => i.id === loggingItemId) : null

  if (loggingItem && selectedSheet) {
    const totalNeeded = (loggingItem.qty_in_order || 0) + (loggingItem.stock_qty || 0)
    const totalDone = (loggingItem.qty_in_order_completed || 0) + (loggingItem.stock_qty_completed || 0)
    const remaining = Math.max(0, totalNeeded - totalDone)

    return (
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoggingItemId(null)
            setQtyInput("")
            setHours("")
            setNotes("")
            setPhotoFiles([])
          }}
          className="mb-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">{loggingItem.banner_sku}</h1>
          {loggingItem.banner_name && (
            <p className="text-muted-foreground text-sm">{loggingItem.banner_name}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-sm">
            <StatusBadge status={loggingItem.status} map={ITEM_STATUS_BADGE} />
            <span className="text-muted-foreground">
              {totalDone}/{totalNeeded} completed ({remaining} remaining)
            </span>
          </div>
        </div>

        {/* Progress breakdown */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Order Qty</span>
              <span className="font-medium">
                {loggingItem.qty_in_order_completed || 0} / {loggingItem.qty_in_order || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${loggingItem.qty_in_order ? Math.min(100, ((loggingItem.qty_in_order_completed || 0) / loggingItem.qty_in_order) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>Stock Qty</span>
              <span className="font-medium">
                {loggingItem.stock_qty_completed || 0} / {loggingItem.stock_qty || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${loggingItem.stock_qty ? Math.min(100, ((loggingItem.stock_qty_completed || 0) / loggingItem.stock_qty) * 100) : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Completion form */}
        <Card className="mb-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Log Completion</CardTitle>
            <CardDescription>
              Enter how many you completed. Order qty fills first, then stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            <div>
              <Label htmlFor="qty" className="flex items-center gap-1.5 mb-1.5">
                <Package className="h-3.5 w-3.5" />
                Quantity Completed
              </Label>
              <Input
                id="qty"
                type="number"
                min="1"
                max={remaining}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder={`Max ${remaining}`}
                className="text-base"
                inputMode="numeric"
              />
            </div>

            <div>
              <Label htmlFor="hours" className="flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3.5 w-3.5" />
                Hours Worked (optional)
              </Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="text-base"
                inputMode="decimal"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notes (optional)
              </Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this work..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Camera className="h-3.5 w-3.5" />
                Photos (optional)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo or Choose File
              </Button>
              {photoFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photoFiles.map((file, index) => (
                    <div key={index} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="h-16 w-16 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={handleLogCompletion}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Completion"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render: Product List (sheet selected) ─────────────────

  if (selectedSheetId && selectedSheet) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        {/* Header with back button */}
        <div className="mb-4 md:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSheetId("")
              setSelectedSheet(null)
            }}
            className="mb-3"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">
            {selectedSheet.job_number || "Production Sheet"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {selectedSheet.sheet_templates?.name || "N/A"}
          </p>
          {selectedSheet.estimated_completion_date && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Est. Completion: {new Date(selectedSheet.estimated_completion_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Products list */}
        <Card className="mb-4">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-base md:text-lg">
              Products ({sheetItems.length})
            </CardTitle>
            <CardDescription>Select a product to start working or log progress</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 md:p-6 md:pt-2">
            {loadingItems ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading products...</div>
            ) : sheetItems.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No products in this sheet
              </div>
            ) : (
              <div className="space-y-3">
                {sheetItems.map((item) => {
                  const totalNeeded = (item.qty_in_order || 0) + (item.stock_qty || 0)
                  const totalDone = (item.qty_in_order_completed || 0) + (item.stock_qty_completed || 0)
                  const pct = totalNeeded > 0 ? Math.round((totalDone / totalNeeded) * 100) : 0

                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4"
                    >
                      {/* Top row: SKU + status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{item.banner_sku}</p>
                          {item.banner_name && (
                            <p className="text-xs text-muted-foreground truncate">{item.banner_name}</p>
                          )}
                        </div>
                        <StatusBadge status={item.status} map={ITEM_STATUS_BADGE} />
                      </div>

                      {/* Progress info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                        <span>Order: {item.qty_in_order_completed || 0}/{item.qty_in_order || 0}</span>
                        <span>Stock: {item.stock_qty_completed || 0}/{item.stock_qty || 0}</span>
                        <span>{pct}% done</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            pct === 100 ? "bg-green-500" : pct > 0 ? "bg-yellow-500" : "bg-gray-300"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {item.status === "not_started" && (
                          <Button
                            size="sm"
                            onClick={() => handleStartWorking(item.id)}
                            disabled={submitting}
                            className="flex-1"
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start Working
                          </Button>
                        )}
                        {(item.status === "working" || item.status === "partially_complete") && (
                          <Button
                            size="sm"
                            onClick={() => setLoggingItemId(item.id)}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Log Progress
                          </Button>
                        )}
                        {item.status === "complete" && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log History */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-base md:text-lg">
              Activity Log ({logs.length})
            </CardTitle>
            <CardDescription>Work history for this job</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 md:p-6 md:pt-2">
            {loadingLogs ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No activity yet
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id
                  const logItem = getItemForLog(log)
                  const isStart = log.work_type === "start_working"

                  return (
                    <div key={log.id} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">
                              {log.users?.name || log.users?.email || "Unknown"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                            {isStart ? (
                              <span className="text-yellow-700 font-medium">
                                Started working{logItem ? ` on ${logItem.banner_sku}` : ""}
                              </span>
                            ) : (
                              <>
                                {log.hours && <span>{log.hours}h</span>}
                                {Array.isArray(log.items_completed) && log.items_completed.length > 0 && (
                                  <span className="text-green-700 font-medium">
                                    {log.items_completed.map((ic: any) => {
                                      const itm = sheetItems.find((i) => i.id === ic.item_id)
                                      return `${itm?.banner_sku || "item"}: ${ic.qty_completed}`
                                    }).join(", ")}
                                  </span>
                                )}
                              </>
                            )}
                            {log.work_log_photos?.length > 0 && (
                              <span>{log.work_log_photos.length} photo(s)</span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t p-3 space-y-3 bg-muted/10">
                          {log.hours && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-0.5">Hours</p>
                              <p className="text-sm">{log.hours} hours</p>
                            </div>
                          )}
                          {log.notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-0.5">Notes</p>
                              <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
                            </div>
                          )}
                          {!isStart && Array.isArray(log.items_completed) && log.items_completed.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Completion Details</p>
                              <div className="space-y-1">
                                {log.items_completed.map((ic: any, idx: number) => {
                                  const itm = sheetItems.find((i) => i.id === ic.item_id)
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">
                                        {itm?.banner_sku || ic.item_id?.slice(0, 8)}
                                      </span>
                                      <span>+{ic.qty_completed} completed</span>
                                      {ic.status === "complete" && (
                                        <span className="text-green-600 text-xs font-medium">(Done!)</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {log.work_log_photos?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Photos</p>
                              <div className="flex flex-wrap gap-2">
                                {log.work_log_photos.map((photo) => (
                                  <a
                                    key={photo.id}
                                    href={photo.photo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={photo.photo_url}
                                      alt={photo.caption || "Work photo"}
                                      className="h-20 w-20 object-cover rounded-md border hover:opacity-80 transition-opacity"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render: Jobs List (default view) ──────────────────────

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Work Log</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Select a job to log your work
        </p>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
          <CardTitle className="text-base md:text-lg">
            Jobs in Production ({sheets.length})
          </CardTitle>
          <CardDescription>
            Click on a job to view products and log progress
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 md:p-6 md:pt-2">
          {loadingSheets ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading jobs...</div>
          ) : sheets.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No jobs in production
            </div>
          ) : (
            <div className="space-y-2">
              {sheets.map((sheet) => {
                const badge = JOB_STATUS_BADGE[sheet.status]
                return (
                  <button
                    key={sheet.id}
                    onClick={() => setSelectedSheetId(sheet.id)}
                    className="w-full text-left border rounded-lg p-4 hover:bg-muted/30 transition-colors active:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base truncate">
                            {sheet.job_number || "No Job #"}
                          </h3>
                          <StatusBadge status={sheet.status} map={JOB_STATUS_BADGE} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {sheet.sheet_templates?.name || "N/A"}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span>Created {new Date(sheet.created_at).toLocaleDateString()}</span>
                          {sheet.estimated_completion_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Est. {new Date(sheet.estimated_completion_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-muted-foreground shrink-0">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
