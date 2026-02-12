"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface AnalyticsData {
  totalSheets: number
  completedSheets: number
  printingSheets: number
  draftSheets: number
  sheetsByUser: Array<{
    user_name: string
    user_email: string
    count: number
  }>
  recentSheets: Array<{
    id: string
    job_number: string | null
    status: string
    created_at: string
    users: { name: string; email: string } | null
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const [sheetsResponse] = await Promise.all([
        fetch("/api/sheets"),
      ])

      const sheetsData = await sheetsResponse.json()

      if (sheetsData.sheets) {
        const sheets = sheetsData.sheets
        const totalSheets = sheets.length
        const completedSheets = sheets.filter((s: any) => s.status === "completed").length
        const printingSheets = sheets.filter((s: any) => s.status === "printing").length
        const draftSheets = sheets.filter((s: any) => s.status === "draft").length

        // Group by user
        const userCounts: Record<string, { name: string; email: string; count: number }> = {}
        sheets.forEach((sheet: any) => {
          const userId = sheet.user_id
          const userName = sheet.users?.name || "Unknown"
          const userEmail = sheet.users?.email || ""

          if (!userCounts[userId]) {
            userCounts[userId] = {
              name: userName,
              email: userEmail,
              count: 0,
            }
          }
          userCounts[userId].count++
        })

        const sheetsByUser = Object.values(userCounts).sort((a, b) => b.count - a.count)

        const recentSheets = sheets
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)

        setData({
          totalSheets,
          completedSheets,
          printingSheets,
          draftSheets,
          sheetsByUser,
          recentSheets,
        })
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          View production sheet metrics and usage data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSheets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.completedSheets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Printing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.printingSheets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {data.draftSheets}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sheets by User</CardTitle>
            <CardDescription>
              Number of sheets created by each user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Sheets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sheetsByUser.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {user.name || user.email || "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">{user.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sheets</CardTitle>
            <CardDescription>
              Most recently created sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell className="font-medium">
                      {sheet.job_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sheet.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : sheet.status === "printing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sheet.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

