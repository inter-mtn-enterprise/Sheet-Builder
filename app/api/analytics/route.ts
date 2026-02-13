import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all production sheets with user info
    const { data: sheets, error: sheetsError } = await supabase
      .from("production_sheets")
      .select("id, status, created_at, user_id, users(email, name)")
      .order("created_at", { ascending: true })

    if (sheetsError) {
      return NextResponse.json({ error: sheetsError.message }, { status: 500 })
    }

    // Fetch product catalog for category breakdown
    const { data: products, error: productsError } = await supabase
      .from("product_catalog")
      .select("id, category")

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    // --- Aggregate: Status counts (for pie chart) ---
    const statusCounts: Record<string, number> = {}
    ;(sheets || []).forEach((s: any) => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
    })
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }))

    // --- Aggregate: Sheets over time (for line chart) ---
    const dailyCounts: Record<string, number> = {}
    ;(sheets || []).forEach((s: any) => {
      const day = s.created_at.slice(0, 10) // YYYY-MM-DD
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    })
    const sheetsOverTime = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // --- Aggregate: Sheets by user (for bar chart) ---
    const userCounts: Record<string, { name: string; email: string; count: number }> = {}
    ;(sheets || []).forEach((s: any) => {
      const uid = s.user_id
      const name = (s.users as any)?.name || "Unknown"
      const email = (s.users as any)?.email || ""
      if (!userCounts[uid]) {
        userCounts[uid] = { name, email, count: 0 }
      }
      userCounts[uid].count++
    })
    const sheetsByUser = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .map((u) => ({
        user: u.name || u.email || "Unknown",
        count: u.count,
      }))

    // --- Aggregate: Products by category (for bar chart) ---
    const categoryCounts: Record<string, number> = {}
    ;(products || []).forEach((p: any) => {
      const cat = p.category || "Uncategorized"
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    const productsByCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15) // top 15 categories
      .map(([category, count]) => ({ category, count }))

    // --- Summary stats ---
    const totalSheets = (sheets || []).length
    const completedSheets = statusCounts["completed"] || 0
    const inProductionSheets = (statusCounts["in_production"] || 0) + (statusCounts["production_started"] || 0)
    const draftSheets = statusCounts["draft"] || 0
    const totalProducts = (products || []).length

    // --- Recent sheets (for table) ---
    const recentSheets = [...(sheets || [])]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((s: any) => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        user_name: (s.users as any)?.name || (s.users as any)?.email || "Unknown",
      }))

    return NextResponse.json({
      summary: {
        totalSheets,
        completedSheets,
        inProductionSheets,
        draftSheets,
        totalProducts,
      },
      statusBreakdown,
      sheetsOverTime,
      sheetsByUser,
      productsByCategory,
      recentSheets,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

