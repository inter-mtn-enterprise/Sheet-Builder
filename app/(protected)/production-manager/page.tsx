"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { GanttChart } from "@/components/ui/gantt-chart"
import type { GanttChartHandle, GanttRecord, ViewMode } from "@/components/ui/gantt-chart"
import {
  RefreshCw,
  Factory,
  Info,
  Save,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
} from "lucide-react"

interface SheetRecord {
  id: string
  job_number: string | null
  status: string
  sort_order: number
  created_at: string
  production_start_date: string | null
  estimated_completion_date: string | null
  completed_at: string | null
  sheet_templates: { name: string } | null
  users: { email: string; name: string | null } | null
}

interface Dependency {
  id: string
  predecessor_id: string
  successor_id: string
  dependency_type: string
}

const VIEW_MODE_OPTIONS: { mode: ViewMode; label: string; icon: any }[] = [
  { mode: "day", label: "Day", icon: Calendar },
  { mode: "week", label: "Week", icon: CalendarDays },
  { mode: "month", label: "Month", icon: CalendarRange },
  { mode: "quarter", label: "Quarter", icon: LayoutGrid },
]

export default function ProductionManagerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const ganttRef = useRef<GanttChartHandle>(null)
  const [sheets, setSheets] = useState<SheetRecord[]>([])
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [activeView, setActiveView] = useState<ViewMode>("day")

  const fetchData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true)
      try {
        const response = await fetch("/api/production-manager")
        const data = await response.json()
        if (data.sheets) setSheets(data.sheets)
        if (data.dependencies) setDependencies(data.dependencies)
      } catch {
        toast({
          title: "Error",
          description: "Failed to load production data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---- Transform data for Gantt ----
  const ganttRecords = useMemo(() => {
    return sheets.map((sheet) => {
      const startDate = sheet.production_start_date
        ? sheet.production_start_date
        : sheet.created_at
          ? new Date(sheet.created_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]

      let endDate: string
      if (sheet.status === "completed" && sheet.completed_at) {
        endDate = new Date(sheet.completed_at).toISOString().split("T")[0]
      } else if (sheet.estimated_completion_date) {
        endDate = new Date(sheet.estimated_completion_date)
          .toISOString()
          .split("T")[0]
      } else {
        const end = new Date(startDate)
        end.setDate(end.getDate() + 7)
        endDate = end.toISOString().split("T")[0]
      }

      return {
        id: sheet.id,
        job_number: sheet.job_number || "No Job #",
        template_name: sheet.sheet_templates?.name || "N/A",
        status: sheet.status,
        status_label:
          sheet.status === "completed" ? "Completed" : "In Production",
        created_by:
          sheet.users?.name || sheet.users?.email || "Unknown",
        startDate,
        endDate,
        sort_order: sheet.sort_order,
      }
    })
  }, [sheets])

  const dateRange = useMemo(() => {
    if (ganttRecords.length === 0) {
      const now = new Date()
      const min = new Date(now)
      min.setDate(min.getDate() - 7)
      const max = new Date(now)
      max.setDate(max.getDate() + 30)
      return {
        minDate: min.toISOString().split("T")[0],
        maxDate: max.toISOString().split("T")[0],
      }
    }
    const allDates = ganttRecords.flatMap((r) => [
      new Date(r.startDate).getTime(),
      new Date(r.endDate).getTime(),
    ])
    const minTime = Math.min(...allDates)
    const maxTime = Math.max(...allDates)
    const min = new Date(minTime)
    min.setDate(min.getDate() - 7)
    const max = new Date(maxTime)
    max.setDate(max.getDate() + 14)
    return {
      minDate: min.toISOString().split("T")[0],
      maxDate: max.toISOString().split("T")[0],
    }
  }, [ganttRecords])

  const ganttLinks = useMemo(() => {
    return dependencies.map((dep) => ({
      type: "finish_to_start" as const,
      linkedFromTaskKey: dep.predecessor_id,
      linkedToTaskKey: dep.successor_id,
    }))
  }, [dependencies])

  // ---- Callbacks ----
  const handleViewSheet = useCallback(
    (record: GanttRecord) => {
      if (record?.id) router.push(`/sheets/${record.id}`)
    },
    [router]
  )

  const handleBarDateChange = useCallback(
    async (recordId: string, startDate: string, endDate: string) => {
      try {
        const response = await fetch("/api/production-manager/dates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetId: recordId,
            productionStartDate: startDate,
            estimatedCompletionDate: endDate,
          }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update dates")
        }
        toast({
          title: "Dates Updated",
          description: `Schedule: ${startDate} → ${endDate}`,
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to update schedule",
          variant: "destructive",
        })
        fetchData()
      }
    },
    [toast, fetchData]
  )

  const handleSaveOrder = useCallback(async () => {
    if (!ganttRef.current) return
    const orders = ganttRef.current.getRecordOrder()
    if (orders.length === 0) return
    setSavingOrder(true)
    try {
      const response = await fetch("/api/production-manager", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save order")
      }
      toast({ title: "Order Saved", description: "Priority order has been saved" })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save row order",
        variant: "destructive",
      })
    } finally {
      setSavingOrder(false)
    }
  }, [toast])

  const handleCreateDependencyLink = useCallback(
    async (args: any) => {
      const link = args.link
      if (!link) return
      try {
        const response = await fetch("/api/production-manager/dependencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predecessorId: link.linkedFromTaskKey,
            successorId: link.linkedToTaskKey,
          }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create dependency")
        }
        toast({ title: "Dependency Created" })
        fetchData()
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        fetchData()
      }
    },
    [toast, fetchData]
  )

  const handleDeleteDependencyLink = useCallback(
    async (args: any) => {
      const link = args.link
      if (!link) return
      try {
        const response = await fetch("/api/production-manager/dependencies", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predecessorId: link.linkedFromTaskKey,
            successorId: link.linkedToTaskKey,
          }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to delete dependency")
        }
        toast({ title: "Dependency Removed" })
        fetchData()
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        fetchData()
      }
    },
    [toast, fetchData]
  )

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setActiveView(mode)
    ganttRef.current?.setViewMode(mode)
  }, [])

  // ---- Render ----
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Production Manager</h1>
          <p className="text-muted-foreground mt-1">
            Gantt chart view of In Production and Completed sheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveOrder}
            disabled={savingOrder || sheets.length === 0}
          >
            <Save className={`mr-2 h-4 w-4 ${savingOrder ? "animate-pulse" : ""}`} />
            {savingOrder ? "Saving..." : "Save Order"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {sheets.filter((s) => s.status === "in_production").length}
                </div>
                <div className="text-sm text-muted-foreground">In Production</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {sheets.filter((s) => s.status === "completed").length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-indigo-500" />
              <div>
                <div className="text-2xl font-bold">{dependencies.length}</div>
                <div className="text-sm text-muted-foreground">Dependencies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart Card — full bleed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>
                {sheets.length} sheet{sheets.length !== 1 ? "s" : ""}
                {" · "}
                Drag bar edges to resize · Drag bars to move · Drag rows to reorder
              </CardDescription>
            </div>

            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {VIEW_MODE_OPTIONS.map(({ mode, label, icon: Icon }) => (
                <Button
                  key={mode}
                  variant={activeView === mode ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleViewModeChange(mode)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-6 rounded bg-blue-500" />
              <span>In Production</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-6 rounded bg-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-6 border-t-2 border-indigo-500" />
              <span>Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              <span>Click 🔗 icon to open sheet</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sheets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No production sheets yet</p>
              <p className="text-sm mt-1">
                Move sheets from Draft to In Production to see them here.
              </p>
            </div>
          ) : (
            <div
              style={{
                height: Math.max(
                  400,
                  Math.min(700, ganttRecords.length * 44 + 120)
                ),
              }}
            >
              <GanttChart
                ref={ganttRef}
                records={ganttRecords}
                links={ganttLinks}
                minDate={dateRange.minDate}
                maxDate={dateRange.maxDate}
                initialViewMode="day"
                onViewSheet={handleViewSheet}
                onBarDateChange={handleBarDateChange}
                onCreateDependencyLink={handleCreateDependencyLink}
                onDeleteDependencyLink={handleDeleteDependencyLink}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
