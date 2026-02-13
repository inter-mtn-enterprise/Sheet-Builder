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

interface Template {
  id: string
  name: string
  is_shared: boolean
  created_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates")
      const data = await response.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast({
        title: "Success",
        description: "Template deleted successfully",
      })

      fetchTemplates()
      setDeleteId(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  const tableRecords = useMemo(
    () =>
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        shared: t.is_shared ? "Yes" : "No",
        created_at: new Date(t.created_at).toLocaleDateString(),
      })),
    [templates]
  )

  const columns = useMemo(
    () => [
      {
        field: "name",
        title: "Name",
        width: "auto",
        sort: true,
        style: { fontWeight: "bold" },
      },
      {
        field: "shared",
        title: "Shared",
        width: 100,
        sort: true,
      },
      {
        field: "created_at",
        title: "Created",
        width: 140,
        sort: true,
      },
      {
        field: "id",
        title: "Actions",
        width: 100,
        disableHover: true,
        style: { textAlign: "center" },
        headerStyle: { textAlign: "center" },
        icon: [
          {
            type: "svg" as const,
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
            width: 16,
            height: 16,
            name: "edit",
            positionType: "inlineFront" as any,
            marginRight: 10,
            cursor: "pointer",
            tooltip: { title: "Edit", placement: "top" as any },
            interactive: true,
          },
          {
            type: "svg" as const,
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
            width: 16,
            height: 16,
            name: "delete",
            positionType: "inlineFront" as any,
            cursor: "pointer",
            tooltip: { title: "Delete", placement: "top" as any },
            interactive: true,
          },
        ],
        fieldFormat() {
          return ""
        },
      },
    ] as ColumnsDefine,
    []
  )

  const handleIconClick = useCallback(
    (args: any) => {
      const iconName = args?.icon?.name || args?.name
      const row = args?.row
      if (row === undefined || row === 0) return
      const record = tableRecords[row - 1]
      if (!record) return

      switch (iconName) {
        case "edit":
          router.push(`/templates/${record.id}/edit`)
          break
        case "delete":
          setDeleteId(record.id)
          break
      }
    },
    [tableRecords, router]
  )

  const handleCellClick = useCallback(
    (args: any) => {
      const row = args?.row
      const col = args?.col
      if (row === undefined || row === 0) return
      const record = tableRecords[row - 1]
      if (!record) return

      // Don't navigate if clicking the actions column (last column)
      if (col === columns.length - 1) return

      router.push(`/templates/${record.id}/edit`)
    },
    [tableRecords, columns.length, router]
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sheet Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage custom production sheet templates
          </p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Templates define the fields available in your production sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates yet. Create your first template to get started.
            </div>
          ) : (
            <DataTable
              records={tableRecords}
              columns={columns}
              onClickCell={handleCellClick}
              onIconClick={handleIconClick}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template.
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
