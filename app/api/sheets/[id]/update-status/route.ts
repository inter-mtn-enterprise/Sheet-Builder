import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/sheets/[id]/update-status
 *
 * Recalculates the job (production_sheets) status based on the statuses of
 * all its products (sheet_items).
 *
 * Rules:
 *  - If ALL items are 'complete' → job status = 'completed'
 *  - If ANY item is 'working', 'partially_complete', or 'complete'
 *    (but not all complete) → job status = 'production_started'
 *  - Otherwise leave as-is (draft / in_production)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sheetId = params.id

    // Fetch all items for this sheet
    const { data: items, error: itemsError } = await supabase
      .from("sheet_items")
      .select("id, status")
      .eq("sheet_id", sheetId)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ status: "no_items" })
    }

    const allComplete = items.every((i) => i.status === "complete")
    const anyStarted = items.some(
      (i) =>
        i.status === "working" ||
        i.status === "partially_complete" ||
        i.status === "complete"
    )

    let newStatus: string | null = null

    if (allComplete) {
      newStatus = "completed"
    } else if (anyStarted) {
      newStatus = "production_started"
    }

    if (newStatus) {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from("production_sheets")
        .update(updates)
        .eq("id", sheetId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ status: newStatus || "unchanged" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    )
  }
}

