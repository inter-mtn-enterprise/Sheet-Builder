"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartCard } from "@/components/ui/chart-card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnsDefine } from "@/components/ui/data-table"

interface AnalyticsResponse {
  summary: {
    totalSheets: number
    completedSheets: number
    inProductionSheets: number
    draftSheets: number
    totalProducts: number
  }
  statusBreakdown: Array<{ status: string; count: number }>
  sheetsOverTime: Array<{ date: string; count: number }>
  sheetsByUser: Array<{ user: string; count: number }>
  productsByCategory: Array<{ category: string; count: number }>
  recentSheets: Array<{
    id: string
    status: string
    created_at: string
    user_name: string
  }>
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  in_production: "#3b82f6",
  draft: "#6b7280",
}

const STATUS_BG: Record<string, string> = {
  completed: "#dcfce7",
  in_production: "#dbeafe",
  draft: "#f3f4f6",
}

const STATUS_FG: Record<string, string> = {
  completed: "#166534",
  in_production: "#1e40af",
  draft: "#374151",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_production: "In Production",
  draft: "Draft",
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics")
      const json = await response.json()

      if (response.ok) {
        setData(json)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- Chart Specs ---

  const pieSpec = useMemo(() => {
    if (!data || data.statusBreakdown.length === 0) return null
    return {
      type: "pie" as const,
      data: [
        {
          id: "statusData",
          values: data.statusBreakdown.map((d) => ({
            ...d,
            status: STATUS_LABELS[d.status] || d.status,
          })),
        },
      ],
      outerRadius: 0.8,
      innerRadius: 0.5,
      valueField: "count",
      categoryField: "status",
      color: {
        type: "ordinal" as const,
        domain: ["Completed", "In Production", "Draft"],
        range: [STATUS_COLORS.completed, STATUS_COLORS.in_production, STATUS_COLORS.draft],
      },
      title: { visible: false },
      legends: {
        visible: true,
        orient: "bottom" as const,
      },
      label: {
        visible: true,
        position: "outside" as const,
      },
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: any) => datum?.status,
              value: (datum: any) => datum?.count,
            },
          ],
        },
      },
      padding: 12,
    }
  }, [data])

  const lineSpec = useMemo(() => {
    if (!data || data.sheetsOverTime.length === 0) return null
    return {
      type: "area" as const,
      data: [
        {
          id: "timeData",
          values: data.sheetsOverTime,
        },
      ],
      xField: "date",
      yField: "count",
      point: {
        visible: true,
        size: 4,
      },
      line: {
        style: {
          curveType: "monotone",
        },
      },
      area: {
        style: {
          fillOpacity: 0.15,
        },
      },
      axes: [
        {
          orient: "bottom" as const,
          label: {
            formatMethod: (val: string) => {
              const d = new Date(val)
              return `${d.getMonth() + 1}/${d.getDate()}`
            },
          },
        },
        {
          orient: "left" as const,
          title: { visible: false },
        },
      ],
      title: { visible: false },
      tooltip: {
        mark: {
          content: [
            {
              key: "Date",
              value: (datum: any) => datum?.date,
            },
            {
              key: "Sheets",
              value: (datum: any) => datum?.count,
            },
          ],
        },
      },
      padding: 12,
    }
  }, [data])

  const barUsersSpec = useMemo(() => {
    if (!data || data.sheetsByUser.length === 0) return null
    return {
      type: "bar" as const,
      data: [
        {
          id: "userData",
          values: data.sheetsByUser,
        },
      ],
      direction: "horizontal" as const,
      xField: "count",
      yField: "user",
      label: {
        visible: true,
        position: "outside" as const,
      },
      axes: [
        {
          orient: "bottom" as const,
          title: { visible: false },
        },
        {
          orient: "left" as const,
          title: { visible: false },
          label: {
            formatMethod: (val: string) =>
              val.length > 18 ? val.slice(0, 18) + "…" : val,
          },
        },
      ],
      title: { visible: false },
      bar: {
        style: {
          cornerRadius: 4,
        },
      },
      padding: 12,
    }
  }, [data])

  const barCategorySpec = useMemo(() => {
    if (!data || data.productsByCategory.length === 0) return null
    return {
      type: "bar" as const,
      data: [
        {
          id: "categoryData",
          values: data.productsByCategory,
        },
      ],
      xField: "category",
      yField: "count",
      label: {
        visible: true,
        position: "outside" as const,
      },
      axes: [
        {
          orient: "bottom" as const,
          label: {
            autoRotate: true,
            autoRotateAngle: [0, 45, 90],
            formatMethod: (val: string) =>
              val.length > 12 ? val.slice(0, 12) + "…" : val,
          },
        },
        {
          orient: "left" as const,
          title: { visible: false },
        },
      ],
      title: { visible: false },
      bar: {
        style: {
          cornerRadius: [4, 4, 0, 0],
        },
      },
      padding: 12,
    }
  }, [data])

  // --- Recent Sheets VTable ---

  const recentSheetsRecords = useMemo(() => {
    if (!data) return []
    return data.recentSheets.map((sheet) => ({
      id_display: sheet.id.slice(0, 8) + "…",
      status: sheet.status,
      user_name: sheet.user_name,
      created_at: new Date(sheet.created_at).toLocaleDateString(),
    }))
  }, [data])

  const recentSheetsColumns = useMemo(
    () =>
      [
        {
          field: "id_display",
          title: "ID",
          width: 120,
          style: { fontWeight: "bold", fontFamily: "monospace", fontSize: 12 },
        },
        {
          field: "status",
          title: "Status",
          width: 120,
          sort: true,
          customRender(args: any) {
            const { height } = args.rect
            const status = args.value || ""
            const label = STATUS_LABELS[status] || status
            const bg = STATUS_BG[status] || "#f3f4f6"
            const fg = STATUS_FG[status] || "#374151"
            const textWidth = Math.max(label.length * 7 + 16, 50)
            return {
              renderDefault: false,
              elements: [
                {
                  type: "rect" as const,
                  x: 12,
                  y: (height - 22) / 2,
                  width: textWidth,
                  height: 22,
                  fill: bg,
                  cornerRadius: 11,
                },
                {
                  type: "text" as const,
                  x: 12 + textWidth / 2,
                  y: height / 2,
                  text: label,
                  fontSize: 11,
                  fontWeight: "600",
                  fill: fg,
                  textAlign: "center",
                  textBaseline: "middle",
                },
              ],
            }
          },
        },
        {
          field: "user_name",
          title: "Created By",
          width: "auto",
          sort: true,
        },
        {
          field: "created_at",
          title: "Created",
          width: 120,
          sort: true,
        },
      ] as ColumnsDefine,
    []
  )

  // --- Render ---

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">
          Failed to load analytics data
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          View production sheet metrics, product catalog insights, and usage data
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.totalSheets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {data.summary.completedSheets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {data.summary.inProductionSheets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {data.summary.draftSheets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {data.summary.totalProducts}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Sheet Status Breakdown"
          description="Distribution of sheets by current status"
          spec={pieSpec}
          loading={loading}
          height={300}
        />

        <ChartCard
          title="Sheets Over Time"
          description="Number of sheets created per day"
          spec={lineSpec}
          loading={loading}
          height={300}
        />

        <ChartCard
          title="Sheets by User"
          description="Number of sheets created by each user"
          spec={barUsersSpec}
          loading={loading}
          height={300}
        />

        <ChartCard
          title="Products by Category"
          description="Product catalog breakdown by category"
          spec={barCategorySpec}
          loading={loading}
          height={300}
        />
      </div>

      {/* Recent Sheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sheets</CardTitle>
          <CardDescription>
            Most recently created production sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentSheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sheets created yet
            </div>
          ) : (
            <DataTable
              records={recentSheetsRecords}
              columns={recentSheetsColumns}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
