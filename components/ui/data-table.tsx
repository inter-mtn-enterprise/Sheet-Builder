"use client"

import { useRef, useEffect, useState } from "react"
import { ListTable } from "@visactor/react-vtable"
import type { ColumnsDefine } from "@visactor/vtable"

export type { ColumnsDefine }

interface DataTableProps {
  records: Record<string, any>[]
  columns: ColumnsDefine
  height?: number
  onClickCell?: (args: any) => void
  onIconClick?: (args: any) => void
  className?: string
}

export function DataTable({
  records,
  columns,
  height,
  onClickCell,
  onIconClick,
  className,
}: DataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    setContainerWidth(containerRef.current.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Auto-compute height based on rows if not specified
  const rowHeight = 40
  const headerHeight = 44
  const computedHeight = height ?? Math.min(600, headerHeight + records.length * rowHeight + 2)

  const option = {
    columns,
    records,
    widthMode: "adaptive" as const,
    heightMode: "adaptive" as const,
    autoFillWidth: true,
    defaultRowHeight: rowHeight,
    defaultHeaderRowHeight: headerHeight,
    hover: {
      highlightMode: "row" as const,
    },
    theme: {
      headerStyle: {
        bgColor: "#f9fafb",
        color: "#6b7280",
        fontSize: 12,
        fontWeight: "600",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderColor: "#e5e7eb",
        borderLineWidth: [0, 0, 1, 0],
        padding: [8, 12, 8, 12],
      },
      bodyStyle: {
        bgColor: "#ffffff",
        color: "#1f2937",
        fontSize: 13,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderColor: "#f3f4f6",
        borderLineWidth: [0, 0, 1, 0],
        padding: [8, 12, 8, 12],
        hover: {
          cellBgColor: "#f9fafb",
        },
      },
      frameStyle: {
        borderColor: "transparent",
        borderLineWidth: 0,
      },
    },
  }

  return (
    <div ref={containerRef} className={className} style={{ width: "100%" }}>
      {containerWidth > 0 && records.length > 0 && (
        <ListTable
          option={option}
          width={containerWidth}
          height={computedHeight}
          onClickCell={onClickCell}
          onIconClick={onIconClick}
        />
      )}
    </div>
  )
}
