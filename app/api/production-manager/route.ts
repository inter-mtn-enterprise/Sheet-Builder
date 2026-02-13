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

    // Fetch all In Production + Completed sheets with template and user info
    const { data: sheets, error: sheetsError } = await supabase
      .from("production_sheets")
      .select("*, sheet_templates(name), users(name, email)")
      .in("status", ["in_production", "production_started", "completed"])
      .order("sort_order", { ascending: true })

    if (sheetsError) {
      return NextResponse.json({ error: sheetsError.message }, { status: 500 })
    }

    // Get all sheet IDs for dependency lookup
    const sheetIds = (sheets || []).map((s: any) => s.id)

    let dependencies: any[] = []
    if (sheetIds.length > 0) {
      const { data: deps, error: depsError } = await supabase
        .from("sheet_dependencies")
        .select("*")
        .or(
          `predecessor_id.in.(${sheetIds.join(",")}),successor_id.in.(${sheetIds.join(",")})`
        )

      if (depsError) {
        return NextResponse.json({ error: depsError.message }, { status: 500 })
      }
      dependencies = deps || []
    }

    return NextResponse.json({ sheets: sheets || [], dependencies })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch production data" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { orders } = body

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: "orders array is required" },
        { status: 400 }
      )
    }

    // Batch update sort_order for each sheet
    for (const item of orders) {
      const { error } = await supabase
        .from("production_sheets")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update sort order" },
      { status: 500 }
    )
  }
}
