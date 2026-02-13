"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Clock,
  User,
  FileText,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react"

// ── Interfaces ──────────────────────────────────────────────

interface SheetDetail {
  id: string
  job_number: string | null
  status: string
  created_at: string
  production_start_date: string | null
  estimated_completion_date: string | null
  completed_at: string | null
  sheet_templates: {
    name: string
    field_definitions?: any[]
  } | null
  users: { email: string; name: string | null } | null
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

// ── Status badge maps ───────────────────────────────────────

const ITEM_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: "bg-gray-100", text: "text-gray-800", label: "Not Started" },
  working: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Working" },
  partially_complete: { bg: "bg-orange-100", text: "text-orange-800", label: "Partial" },
  complete: { bg: "bg-green-100", text: "text-green-800", label: "Complete" },
}

const JOB_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
  in_production: { bg: "bg-blue-100", text: "text-blue-800", label: "In Production" },
  production_started: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Started" },
  completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
}

function Badge({ status, map }: { status: string; map: Record<string, { bg: string; text: string; label: string }> }) {
  const s = map[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ── Component ───────────────────────────────────────────────

interface OrderDetailsDrawerProps {
  sheetId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDrawer({ sheetId, open, onOpenChange }: OrderDetailsDrawerProps) {
  const [sheet, setSheet] = useState<SheetDetail | null>(null)
  const [items, setItems] = useState<SheetItem[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)

  const fetchDetails = useCallback(async (id: string) => {
    setLoadingSheet(true)
    setLoadingLogs(true)
    setExpandedLog(null)
    setExpandedPhoto(null)

    try {
      const res = await fetch(`/api/sheets/${id}`)
      const data = await res.json()
      if (data.sheet) setSheet(data.sheet)
      if (data.items) setItems(data.items)
    } catch {
      setSheet(null)
      setItems([])
    } finally {
      setLoadingSheet(false)
    }

    try {
      const res = await fetch(`/api/work-logs?sheet_id=${id}`)
      const data = await res.json()
      if (data.logs) setLogs(data.logs)
    } catch {
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    if (open && sheetId) {
      fetchDetails(sheetId)
    }
    if (!open) {
      // Reset on close
      setSheet(null)
      setItems([])
      setLogs([])
      setExpandedLog(null)
      setExpandedPhoto(null)
    }
  }, [open, sheetId, fetchDetails])

  // ── Helpers ─────────────────────────────────────────────────

  const getItemForLog = (log: WorkLog): SheetItem | undefined => {
    if (log.item_id) return items.find((i) => i.id === log.item_id)
    return undefined
  }

  const totalItems = items.length
  const completedItems = items.filter((i) => i.status === "complete").length
  const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0)

  // ── Render ──────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] flex flex-col p-0 rounded-t-xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 pb-4 border-b">
          {loadingSheet ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : sheet ? (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <SheetTitle className="text-xl">
                  {sheet.job_number || "No Job #"}
                </SheetTitle>
                <Badge status={sheet.status} map={JOB_STATUS} />
              </div>
              <SheetDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{sheet.sheet_templates?.name || "N/A"}</span>
                {sheet.users && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {sheet.users.name || sheet.users.email}
                  </span>
                )}
                {sheet.production_start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Start: {new Date(sheet.production_start_date).toLocaleDateString()}
                  </span>
                )}
                {sheet.estimated_completion_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Est: {new Date(sheet.estimated_completion_date).toLocaleDateString()}
                  </span>
                )}
                {sheet.completed_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Calendar className="h-3 w-3" />
                    Done: {new Date(sheet.completed_at).toLocaleDateString()}
                  </span>
                )}
              </SheetDescription>

              {/* Summary stats */}
              <div className="flex flex-wrap gap-4 mt-2 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{completedItems}/{totalItems}</span>
                  <span className="text-muted-foreground">products done</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{totalHours}</span>
                  <span className="text-muted-foreground">hours logged</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{logs.length}</span>
                  <span className="text-muted-foreground">log entries</span>
                </div>
              </div>
            </>
          ) : (
            <SheetTitle>Order Details</SheetTitle>
          )}
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* ── Product Status Section ───────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Product Status
            </h3>
            {loadingSheet ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products in this sheet</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const totalNeeded = (item.qty_in_order || 0) + (item.stock_qty || 0)
                  const totalDone = (item.qty_in_order_completed || 0) + (item.stock_qty_completed || 0)
                  const pct = totalNeeded > 0 ? Math.round((totalDone / totalNeeded) * 100) : 0

                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {item.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.banner_sku}
                              className="h-10 w-10 object-cover rounded border shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{item.banner_sku}</p>
                            {item.banner_name && (
                              <p className="text-xs text-muted-foreground truncate">{item.banner_name}</p>
                            )}
                          </div>
                        </div>
                        <Badge status={item.status} map={ITEM_STATUS} />
                      </div>

                      {/* Qty breakdown */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                        <span>Order: {item.qty_in_order_completed || 0}/{item.qty_in_order || 0}</span>
                        <span>Stock: {item.stock_qty_completed || 0}/{item.stock_qty || 0}</span>
                        <span className="font-medium">{pct}% done</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Work Logs Section ────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Activity Log ({logs.length})
            </h3>
            {loadingLogs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id
                  const logItem = getItemForLog(log)
                  const isStart = log.work_type === "start_working"

                  return (
                    <div key={log.id} className="border rounded-lg overflow-hidden">
                      {/* Collapsed row */}
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
                                {log.hours != null && log.hours > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {log.hours}h
                                  </span>
                                )}
                                {Array.isArray(log.items_completed) && log.items_completed.length > 0 && (
                                  <span className="text-green-700 font-medium">
                                    {log.items_completed.map((ic: any) => {
                                      const itm = items.find((i) => i.id === ic.item_id)
                                      return `${itm?.banner_sku || "item"}: +${ic.qty_completed}`
                                    }).join(", ")}
                                  </span>
                                )}
                              </>
                            )}
                            {log.notes && (
                              <span className="truncate max-w-[200px]">
                                <FileText className="h-3 w-3 inline mr-0.5" />
                                {log.notes}
                              </span>
                            )}
                            {log.work_log_photos?.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ImageIcon className="h-3 w-3" />
                                {log.work_log_photos.length}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t p-3 space-y-3 bg-muted/10">
                          {log.hours != null && log.hours > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-0.5">Hours Worked</p>
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
                                  const itm = items.find((i) => i.id === ic.item_id)
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
                                  <div key={photo.id} className="relative group">
                                    {expandedPhoto === photo.id ? (
                                      <div className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={photo.photo_url}
                                          alt={photo.caption || "Work photo"}
                                          className="max-h-64 max-w-full object-contain rounded-md border cursor-pointer"
                                          onClick={() => setExpandedPhoto(null)}
                                        />
                                        <a
                                          href={photo.photo_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                        {photo.caption && (
                                          <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                                        )}
                                      </div>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={photo.photo_url}
                                        alt={photo.caption || "Work photo"}
                                        className="h-20 w-20 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setExpandedPhoto(photo.id)}
                                      />
                                    )}
                                  </div>
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
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

