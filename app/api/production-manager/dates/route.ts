import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
    const { sheetId, productionStartDate, estimatedCompletionDate } = body

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (productionStartDate !== undefined) {
      updates.production_start_date = productionStartDate
    }

    if (estimatedCompletionDate !== undefined) {
      updates.estimated_completion_date = estimatedCompletionDate
    }

    const { data: sheet, error } = await supabase
      .from("production_sheets")
      .update(updates)
      .eq("id", sheetId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sheet })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update dates" },
      { status: 500 }
    )
  }
}

