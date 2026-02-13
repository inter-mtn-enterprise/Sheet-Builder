"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
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
import { DataTable } from "@/components/ui/data-table"
import type { ColumnsDefine } from "@/components/ui/data-table"

interface Sheet {
  id: string
  job_number: string | null
  status: string
  created_at: string
  estimated_completion_date: string | null
  completed_at: string | null
  sheet_templates: { name: string } | null
  users: { name: string; email: string } | null
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

export default function SheetsPage() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchSheets()
  }, [])

  const fetchSheets = async () => {
    try {
      const response = await fetch("/api/sheets")
      const data = await response.json()
      if (data.sheets) {
        setSheets(data.sheets)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sheets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sheets/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete sheet")
      }

      toast({
        title: "Success",
        description: "Sheet deleted successfully",
      })

      fetchSheets()
      setDeleteId(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sheet",
        variant: "destructive",
      })
    }
  }

  // Split sheets by status
  const draftSheets = useMemo(
    () => sheets.filter((s) => s.status === "draft"),
    [sheets]
  )
  const inProductionSheets = useMemo(
    () => sheets.filter((s) => s.status === "in_production"),
    [sheets]
  )
  const completedSheets = useMemo(
    () => sheets.filter((s) => s.status === "completed"),
    [sheets]
  )

  // Flatten nested fields for VTable records
  const toRecords = useCallback(
    (list: Sheet[]) =>
      list.map((sheet) => ({
        id: sheet.id,
        job_number: sheet.job_number || "N/A",
        template_name: sheet.sheet_templates?.name || "N/A",
        status: sheet.status,
        created_by: sheet.users?.name || sheet.users?.email || "Unknown",
        created_at: new Date(sheet.created_at).toLocaleDateString(),
        estimated_completion_date: sheet.estimated_completion_date
          ? new Date(sheet.estimated_completion_date).toLocaleDateString()
          : "",
        completed_at: sheet.completed_at
          ? new Date(sheet.completed_at).toLocaleDateString()
          : "",
      })),
    []
  )

  const draftRecords = useMemo(() => toRecords(draftSheets), [draftSheets, toRecords])
  const inProductionRecords = useMemo(() => toRecords(inProductionSheets), [inProductionSheets, toRecords])
  const completedRecords = useMemo(() => toRecords(completedSheets), [completedSheets, toRecords])

  // --- Column definitions ---

  const statusRender = useCallback((args: any) => {
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
  }, [])

  const VIEW_ICON = {
    type: "svg" as const,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    width: 16,
    height: 16,
    name: "view",
    positionType: "inlineFront" as any,
    marginRight: 8,
    cursor: "pointer",
    tooltip: { title: "View", placement: "top" as any },
    interactive: true,
  }

  const EDIT_ICON = {
    type: "svg" as const,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    width: 16,
    height: 16,
    name: "edit",
    positionType: "inlineFront" as any,
    marginRight: 8,
    cursor: "pointer",
    tooltip: { title: "Edit", placement: "top" as any },
    interactive: true,
  }

  const PRINT_ICON = {
    type: "svg" as const,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>',
    width: 16,
    height: 16,
    name: "print",
    positionType: "inlineFront" as any,
    marginRight: 8,
    cursor: "pointer",
    tooltip: { title: "Print", placement: "top" as any },
    interactive: true,
  }

  const DELETE_ICON = {
    type: "svg" as const,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    width: 16,
    height: 16,
    name: "delete",
    positionType: "inlineFront" as any,
    cursor: "pointer",
    tooltip: { title: "Delete", placement: "top" as any },
    interactive: true,
  }

  // Draft columns: includes edit icon
  const draftColumns: ColumnsDefine = useMemo(
    () => [
      {
        field: "job_number",
        title: "Job #",
        width: 120,
        sort: true,
        style: { fontWeight: "bold" },
      },
      {
        field: "template_name",
        title: "Template",
        width: "auto",
        sort: true,
      },
      {
        field: "status",
        title: "Status",
        width: 120,
        sort: true,
        customRender: statusRender,
      },
      {
        field: "created_by",
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
      {
        field: "id",
        title: "Actions",
        width: 160,
        disableHover: true,
        style: { textAlign: "center" },
        headerStyle: { textAlign: "center" },
        icon: [VIEW_ICON, EDIT_ICON, PRINT_ICON, DELETE_ICON],
        fieldFormat() {
          return ""
        },
      },
    ],
    [statusRender]
  )

  // In Production columns: includes est. completion date, no edit
  const inProductionColumns: ColumnsDefine = useMemo(
    () => [
      {
        field: "job_number",
        title: "Job #",
        width: 120,
        sort: true,
        style: { fontWeight: "bold" },
      },
      {
        field: "template_name",
        title: "Template",
        width: "auto",
        sort: true,
      },
      {
        field: "status",
        title: "Status",
        width: 130,
        sort: true,
        customRender: statusRender,
      },
      {
        field: "estimated_completion_date",
        title: "Est. Completion",
        width: 140,
        sort: true,
      },
      {
        field: "created_by",
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
      {
        field: "id",
        title: "Actions",
        width: 100,
        disableHover: true,
        style: { textAlign: "center" },
        headerStyle: { textAlign: "center" },
        icon: [VIEW_ICON, PRINT_ICON],
        fieldFormat() {
          return ""
        },
      },
    ],
    [statusRender]
  )

  // Completed columns: includes completion date, no edit
  const completedColumns: ColumnsDefine = useMemo(
    () => [
      {
        field: "job_number",
        title: "Job #",
        width: 120,
        sort: true,
        style: { fontWeight: "bold" },
      },
      {
        field: "template_name",
        title: "Template",
        width: "auto",
        sort: true,
      },
      {
        field: "status",
        title: "Status",
        width: 130,
        sort: true,
        customRender: statusRender,
      },
      {
        field: "completed_at",
        title: "Completed",
        width: 120,
        sort: true,
      },
      {
        field: "created_by",
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
      {
        field: "id",
        title: "Actions",
        width: 100,
        disableHover: true,
        style: { textAlign: "center" },
        headerStyle: { textAlign: "center" },
        icon: [VIEW_ICON, PRINT_ICON],
        fieldFormat() {
          return ""
        },
      },
    ],
    [statusRender]
  )

  // Icon click handlers
  const makeIconClickHandler = useCallback(
    (records: ReturnType<typeof toRecords>) =>
      (args: any) => {
        const iconName = args?.icon?.name || args?.name
        const row = args?.row
        if (row === undefined || row === 0) return
        const record = records[row - 1]
        if (!record) return

        switch (iconName) {
          case "view":
            router.push(`/sheets/${record.id}`)
            break
          case "edit":
            router.push(`/sheets/${record.id}/edit`)
            break
          case "print":
            router.push(`/sheets/${record.id}/print`)
            break
          case "delete":
            setDeleteId(record.id)
            break
        }
      },
    [router]
  )

  const makeCellClickHandler = useCallback(
    (records: ReturnType<typeof toRecords>, colCount: number) =>
      (args: any) => {
        const row = args?.row
        const col = args?.col
        if (row === undefined || row === 0) return
        const record = records[row - 1]
        if (!record) return

        // Don't navigate if clicking the actions column (last column)
        if (col === colCount - 1) return

        router.push(`/sheets/${record.id}`)
      },
    [router]
  )

  const draftIconClick = useMemo(
    () => makeIconClickHandler(draftRecords),
    [draftRecords, makeIconClickHandler]
  )
  const inProductionIconClick = useMemo(
    () => makeIconClickHandler(inProductionRecords),
    [inProductionRecords, makeIconClickHandler]
  )
  const completedIconClick = useMemo(
    () => makeIconClickHandler(completedRecords),
    [completedRecords, makeIconClickHandler]
  )

  const draftCellClick = useMemo(
    () => makeCellClickHandler(draftRecords, draftColumns.length),
    [draftRecords, draftColumns.length, makeCellClickHandler]
  )
  const inProductionCellClick = useMemo(
    () => makeCellClickHandler(inProductionRecords, inProductionColumns.length),
    [inProductionRecords, inProductionColumns.length, makeCellClickHandler]
  )
  const completedCellClick = useMemo(
    () => makeCellClickHandler(completedRecords, completedColumns.length),
    [completedRecords, completedColumns.length, makeCellClickHandler]
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Production Sheets</h1>
          <p className="text-muted-foreground mt-2">
            Manage your production sheets
          </p>
        </div>
        <Link href="/sheets/new/select-template">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Sheet
          </Button>
        </Link>
      </div>

      {/* Draft Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Draft ({draftSheets.length})</CardTitle>
              <CardDescription>
                Sheets that are still being prepared
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : draftRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No draft sheets
            </div>
          ) : (
            <DataTable
              records={draftRecords}
              columns={draftColumns}
              onClickCell={draftCellClick}
              onIconClick={draftIconClick}
            />
          )}
        </CardContent>
      </Card>

      {/* In Production Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>In Production ({inProductionSheets.length})</CardTitle>
              <CardDescription>
                Sheets currently being produced
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : inProductionRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No sheets in production
            </div>
          ) : (
            <DataTable
              records={inProductionRecords}
              columns={inProductionColumns}
              onClickCell={inProductionCellClick}
              onIconClick={inProductionIconClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Completed Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Completed ({completedSheets.length})</CardTitle>
              <CardDescription>
                Sheets that have been completed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : completedRecords.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No completed sheets
            </div>
          ) : (
            <DataTable
              records={completedRecords}
              columns={completedColumns}
              onClickCell={completedCellClick}
              onIconClick={completedIconClick}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sheet and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
