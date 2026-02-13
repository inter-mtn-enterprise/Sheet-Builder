"use client"

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react"
import type { GanttConstructorOptions } from "@visactor/vtable-gantt"

export interface GanttRecord {
  id: string
  job_number: string
  template_name: string
  status: string
  status_label: string
  created_by: string
  startDate: string
  endDate: string
  sort_order: number
}

export interface GanttLink {
  type: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish"
  linkedFromTaskKey: string
  linkedToTaskKey: string
}

export type ViewMode = "day" | "week" | "month" | "quarter"

export interface GanttChartHandle {
  getRecordOrder: () => { id: string; sort_order: number }[]
  setViewMode: (mode: ViewMode) => void
}

export interface GanttChartProps {
  records: GanttRecord[]
  links?: GanttLink[]
  minDate?: string
  maxDate?: string
  initialViewMode?: ViewMode
  onViewSheet?: (record: GanttRecord) => void
  onBarDateChange?: (recordId: string, startDate: string, endDate: string) => void
  onCreateDependencyLink?: (args: any) => void
  onDeleteDependencyLink?: (args: any) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/* Scale definitions for each view mode                                */
/* ------------------------------------------------------------------ */
function getScalesForMode(mode: ViewMode) {
  switch (mode) {
    case "quarter":
      return {
        colWidth: 80,
        scales: [
          {
            unit: "year" as const,
            step: 1,
            format(date: any) {
              return String((date.startDate as Date).getFullYear())
            },
            style: { fontSize: 12, fontWeight: "600" as const, color: "#374151" },
          },
          {
            unit: "quarter" as const,
            step: 1,
            format(date: any) {
              const q = Math.ceil(((date.startDate as Date).getMonth() + 1) / 3)
              return `Q${q}`
            },
            style: { fontSize: 11, color: "#6b7280" },
          },
        ],
      }
    case "month":
      return {
        colWidth: 40,
        scales: [
          {
            unit: "year" as const,
            step: 1,
            format(date: any) {
              return String((date.startDate as Date).getFullYear())
            },
            style: { fontSize: 12, fontWeight: "600" as const, color: "#374151" },
          },
          {
            unit: "month" as const,
            step: 1,
            format(date: any) {
              return (date.startDate as Date).toLocaleString("default", { month: "short" })
            },
            style: { fontSize: 11, color: "#6b7280" },
          },
        ],
      }
    case "week":
      return {
        colWidth: 30,
        scales: [
          {
            unit: "month" as const,
            step: 1,
            format(date: any) {
              return (date.startDate as Date).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
            },
            style: { fontSize: 12, fontWeight: "600" as const, color: "#374151" },
          },
          {
            unit: "week" as const,
            step: 1,
            format(date: any) {
              const d = date.startDate as Date
              return `W${Math.ceil(d.getDate() / 7)}`
            },
            style: { fontSize: 11, color: "#6b7280" },
          },
        ],
      }
    case "day":
    default:
      return {
        colWidth: 60,
        scales: [
          {
            unit: "month" as const,
            step: 1,
            format(date: any) {
              return (date.startDate as Date).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
            },
            style: { fontSize: 12, fontWeight: "600" as const, color: "#374151" },
          },
          {
            unit: "day" as const,
            step: 1,
            format(date: any) {
              return String((date.startDate as Date).getDate())
            },
            style: { fontSize: 11, color: "#6b7280" },
          },
        ],
      }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(
  function GanttChart(
    {
      records,
      links = [],
      minDate,
      maxDate,
      initialViewMode = "day",
      onViewSheet,
      onBarDateChange,
      onCreateDependencyLink,
      onDeleteDependencyLink,
      className,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const ganttRef = useRef<any>(null)
    const currentViewModeRef = useRef<ViewMode>(initialViewMode)

    const callbacksRef = useRef({
      onViewSheet,
      onBarDateChange,
      onCreateDependencyLink,
      onDeleteDependencyLink,
    })
    callbacksRef.current = {
      onViewSheet,
      onBarDateChange,
      onCreateDependencyLink,
      onDeleteDependencyLink,
    }

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getRecordOrder() {
        if (!ganttRef.current) return []
        const currentRecords = ganttRef.current.records || []
        return currentRecords.map((r: any, i: number) => ({
          id: r.id,
          sort_order: i,
        }))
      },
      setViewMode(mode: ViewMode) {
        if (!ganttRef.current) return
        currentViewModeRef.current = mode
        const { colWidth, scales } = getScalesForMode(mode)
        // Update the options on the gantt instance
        ganttRef.current.options.timelineHeader.colWidth = colWidth
        ganttRef.current.updateScales(scales)
      },
    }))

    // Helper to extract dates from an event and call the callback
    const handleDateChangeEvent = useCallback((args: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/f7927392-b6f7-4c6f-8126-d142ac4e026e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gantt-chart.tsx:dateChange',message:'Date change event',data:{eventType:args?._type||'unknown',index:args?.index,startDate:String(args?.startDate),endDate:String(args?.endDate),recordId:args?.record?.id,recordStartDate:args?.record?.startDate,recordEndDate:args?.record?.endDate},timestamp:Date.now(),runId:'run7',hypothesisId:'dateChange'})}).catch(()=>{});
      // #endregion

      const record = args?.record
      if (!record?.id) return

      const formatDate = (d: any) => {
        if (!d) return null
        const date = d instanceof Date ? d : new Date(d)
        if (isNaN(date.getTime())) return null
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }

      // The record itself has the updated dates
      const newStart = formatDate(record.startDate || args?.startDate)
      const newEnd = formatDate(record.endDate || args?.endDate)

      if (newStart && newEnd) {
        callbacksRef.current.onBarDateChange?.(record.id, newStart, newEnd)
      }
    }, [])

    // Build options — initial view mode determines the scales
    const options = useMemo((): GanttConstructorOptions => {
      const viewIconSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'

      const { colWidth, scales } = getScalesForMode(initialViewMode)

      return {
        records,
        taskListTable: {
          columns: [
            { field: "job_number", title: "Job #", width: 80 },
            { field: "template_name", title: "Template", width: 120 },
            { field: "status_label", title: "Status", width: 90 },
            { field: "created_by", title: "Created By", width: 90 },
            {
              field: "id",
              title: "",
              width: 36,
              icon: [
                {
                  name: "view",
                  type: "svg",
                  svg: viewIconSvg,
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  tooltip: { title: "Open Sheet" },
                },
              ],
            },
          ] as any,
          tableWidth: "auto" as any,
          minTableWidth: 200,
          maxTableWidth: 500,
          theme: {
            headerStyle: {
              bgColor: "#f9fafb",
              color: "#6b7280",
              fontSize: 12,
              fontWeight: "600",
              borderColor: "#e5e7eb",
            },
            bodyStyle: {
              bgColor: "#ffffff",
              color: "#1f2937",
              fontSize: 13,
              borderColor: "#f3f4f6",
              hover: { cellBgColor: "#f9fafb" },
            },
          } as any,
        },
        timelineHeader: {
          colWidth,
          backgroundColor: "#f9fafb",
          scales,
        },
        taskBar: {
          startDateField: "startDate",
          endDateField: "endDate",
          labelText: "{job_number}",
          labelTextStyle: { fontSize: 12, color: "#ffffff" },
          barStyle: { barColor: "#3b82f6", cornerRadius: 4 },
          hoverBarStyle: { barOverlayColor: "rgba(0,0,0,0.1)", cornerRadius: 4 },
          selectedBarStyle: {
            shadowBlur: 6,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
            shadowColor: "rgba(0,0,0,0.2)",
            borderColor: "#1d4ed8",
            borderLineWidth: 2,
          },
          selectable: true,
          resizable: true,
          moveable: true,
          dragOrder: true,
        },
        taskKeyField: "id",
        rowHeight: 44,
        minDate,
        maxDate,
        markLine: true,
        dependency: {
          links: links as any,
          linkCreatable: true,
          linkSelectable: true,
          linkDeletable: true,
          linkLineStyle: { lineColor: "#6366f1", lineWidth: 1.5 },
          linkSelectedLineStyle: {
            lineColor: "#4f46e5",
            lineWidth: 2,
            shadowBlur: 4,
            shadowColor: "rgba(99,102,241,0.3)",
          },
          linkCreatePointStyle: {
            strokeColor: "#6366f1",
            fillColor: "#ffffff",
            radius: 4,
            strokeWidth: 1.5,
          },
          linkCreatingPointStyle: {
            strokeColor: "#4f46e5",
            fillColor: "#6366f1",
            radius: 4,
            strokeWidth: 2,
          },
        },
        scrollStyle: {
          scrollSliderColor: "rgba(0,0,0,0.15)",
          scrollSliderCornerRadius: 3,
          scrollRailColor: "transparent",
          visible: "scrolling" as const,
          width: 8,
        },
        frame: {
          outerFrameStyle: {
            borderColor: "#e5e7eb",
            borderLineWidth: 1,
            cornerRadius: 8,
          },
          verticalSplitLine: { lineColor: "#e5e7eb", lineWidth: 1 },
          verticalSplitLineMoveable: true,
          verticalSplitLineHighlight: { lineColor: "#3b82f6", lineWidth: 2 },
        },
        grid: {
          horizontalLine: { lineColor: "#f3f4f6", lineWidth: 1 },
          verticalLine: { lineColor: "#f3f4f6", lineWidth: 1 },
          weekendBackgroundColor: "rgba(0,0,0,0.02)",
        },
      }
    }, [records, links, minDate, maxDate, initialViewMode])

    const initGantt = useCallback(async () => {
      if (!containerRef.current) return

      const vtableGantt = await import("@visactor/vtable-gantt")
      const GanttClass = vtableGantt.Gantt
      const GANTT_EVENT_TYPE = (vtableGantt.TYPES as any)?.GANTT_EVENT_TYPE

      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/f7927392-b6f7-4c6f-8126-d142ac4e026e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gantt-chart.tsx:initGantt',message:'init',data:{hasGanttClass:!!GanttClass,hasEvents:!!GANTT_EVENT_TYPE,hasCHANGE_DATE_RANGE:!!GANTT_EVENT_TYPE?.CHANGE_DATE_RANGE,containerW:containerRef.current?.clientWidth,containerH:containerRef.current?.clientHeight,recordCount:options.records?.length},timestamp:Date.now(),runId:'run7',hypothesisId:'init'})}).catch(()=>{});
      // #endregion

      if (!GanttClass) return

      if (ganttRef.current) {
        ganttRef.current.release()
        ganttRef.current = null
      }

      const gantt = new GanttClass(containerRef.current, options)
      ganttRef.current = gantt

      // Handle icon click in the task list (for "View" icon)
      const listTable = gantt.taskListTableInstance
      if (listTable) {
        listTable.on("icon_click" as any, (args: any) => {
          const { col, row, icon } = args
          const iconName = icon?.name || args?.name
          if (iconName === "view" && typeof col === "number" && typeof row === "number") {
            const record = listTable.getCellOriginRecord(col, row)
            if (record) {
              callbacksRef.current.onViewSheet?.(record)
            }
          }
        })
      }

      // ---- DATE CHANGES (both move AND resize) ----

      // Fires when the WHOLE bar is moved (drag) or reordered
      if (GANTT_EVENT_TYPE?.MOVE_END_TASK_BAR) {
        gantt.on(GANTT_EVENT_TYPE.MOVE_END_TASK_BAR as any, (args: any) => {
          handleDateChangeEvent(args)
        })
      }

      // Fires when a bar END is RESIZED (left or right edge drag)
      if (GANTT_EVENT_TYPE?.CHANGE_DATE_RANGE) {
        gantt.on(GANTT_EVENT_TYPE.CHANGE_DATE_RANGE as any, (args: any) => {
          handleDateChangeEvent(args)
        })
      }

      // ---- DEPENDENCIES ----
      if (GANTT_EVENT_TYPE?.CREATE_DEPENDENCY_LINK) {
        gantt.on(GANTT_EVENT_TYPE.CREATE_DEPENDENCY_LINK as any, (args: any) => {
          callbacksRef.current.onCreateDependencyLink?.(args)
        })
      }
      if (GANTT_EVENT_TYPE?.DELETE_DEPENDENCY_LINK) {
        gantt.on(GANTT_EVENT_TYPE.DELETE_DEPENDENCY_LINK as any, (args: any) => {
          callbacksRef.current.onDeleteDependencyLink?.(args)
        })
      }
    }, [options, handleDateChangeEvent])

    useEffect(() => {
      initGantt()
      return () => {
        if (ganttRef.current) {
          ganttRef.current.release()
          ganttRef.current = null
        }
      }
    }, [initGantt])

    // Resize observer
    useEffect(() => {
      if (!containerRef.current) return
      const observer = new ResizeObserver(() => {
        if (ganttRef.current) {
          ganttRef.current._resize()
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }, [])

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      />
    )
  }
)
