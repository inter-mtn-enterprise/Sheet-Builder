import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/work-logs?sheet_id=xxx - List work logs for a sheet
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sheetId = searchParams.get("sheet_id")

    if (!sheetId) {
      return NextResponse.json({ error: "sheet_id is required" }, { status: 400 })
    }

    const { data: logs, error } = await supabase
      .from("work_logs")
      .select("*, users(name, email), work_log_photos(*)")
      .eq("sheet_id", sheetId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch work logs" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/work-logs
 *
 * Two work_type modes:
 *
 * 1. start_working  – marks a single product as "working"
 *    Body: { sheet_id, work_type: "start_working", item_id }
 *
 * 2. log_completion – logs qty completed for one or more products
 *    Body: {
 *      sheet_id,
 *      work_type: "log_completion",
 *      hours?,
 *      notes?,
 *      items: [{ item_id, qty_completed }]
 *    }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { sheet_id, work_type } = body

    if (!sheet_id) {
      return NextResponse.json({ error: "sheet_id is required" }, { status: 400 })
    }

    // ── START WORKING ──────────────────────────────────────────
    if (work_type === "start_working") {
      const { item_id } = body

      if (!item_id) {
        return NextResponse.json({ error: "item_id is required" }, { status: 400 })
      }

      // Update the sheet_item status to "working"
      const { error: itemError } = await supabase
        .from("sheet_items")
        .update({ status: "working", updated_at: new Date().toISOString() })
        .eq("id", item_id)

      if (itemError) {
        return NextResponse.json({ error: itemError.message }, { status: 500 })
      }

      // Create a work log entry
      const { data: log, error: logError } = await supabase
        .from("work_logs")
        .insert({
          sheet_id,
          user_id: user.id,
          work_type: "start_working",
          item_id,
          notes: "Started working",
          items_completed: [],
        })
        .select("*, users(name, email)")
        .single()

      if (logError) {
        return NextResponse.json({ error: logError.message }, { status: 500 })
      }

      // Update job status
      await updateJobStatus(supabase, sheet_id)

      return NextResponse.json({ log })
    }

    // ── LOG COMPLETION ─────────────────────────────────────────
    if (work_type === "log_completion") {
      const { hours, notes, items } = body

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: "items array is required for log_completion" },
          { status: 400 }
        )
      }

      // Process each item: calculate qty splits and update status
      const completionDetails: any[] = []

      for (const entry of items) {
        const { item_id, qty_completed } = entry

        if (!item_id || qty_completed === undefined || qty_completed === null) {
          continue
        }

        // Fetch current item state
        const { data: item, error: fetchError } = await supabase
          .from("sheet_items")
          .select("*")
          .eq("id", item_id)
          .single()

        if (fetchError || !item) continue

        const qtyInOrder = item.qty_in_order || 0
        const stockQty = item.stock_qty || 0
        const prevOrderCompleted = item.qty_in_order_completed || 0
        const prevStockCompleted = item.stock_qty_completed || 0

        // Calculate how to split the new qty_completed
        // Priority: fill qty_in_order first, then stock_qty
        const orderRemaining = Math.max(0, qtyInOrder - prevOrderCompleted)
        const stockRemaining = Math.max(0, stockQty - prevStockCompleted)

        const addToOrder = Math.min(qty_completed, orderRemaining)
        const addToStock = Math.min(qty_completed - addToOrder, stockRemaining)

        const newOrderCompleted = prevOrderCompleted + addToOrder
        const newStockCompleted = prevStockCompleted + addToStock

        // Determine new item status
        const orderDone = newOrderCompleted >= qtyInOrder
        const stockDone = newStockCompleted >= stockQty
        let newStatus: string

        if (orderDone && stockDone) {
          newStatus = "complete"
        } else {
          newStatus = "partially_complete"
        }

        // Update the sheet_item
        const { error: updateError } = await supabase
          .from("sheet_items")
          .update({
            qty_in_order_completed: newOrderCompleted,
            stock_qty_completed: newStockCompleted,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item_id)

        if (updateError) {
          console.error("Failed to update item", item_id, updateError)
        }

        completionDetails.push({
          item_id,
          qty_completed,
          qty_in_order_completed: newOrderCompleted,
          stock_qty_completed: newStockCompleted,
          status: newStatus,
        })
      }

      // Create the work log entry
      const { data: log, error: logError } = await supabase
        .from("work_logs")
        .insert({
          sheet_id,
          user_id: user.id,
          work_type: "log_completion",
          hours: hours || null,
          notes: notes || null,
          items_completed: completionDetails,
        })
        .select("*, users(name, email)")
        .single()

      if (logError) {
        return NextResponse.json({ error: logError.message }, { status: 500 })
      }

      // Update job status
      await updateJobStatus(supabase, sheet_id)

      return NextResponse.json({ log })
    }

    // ── LEGACY / FALLBACK (old-style log without work_type) ───
    const { hours, notes, items_completed } = body

    const { data: log, error } = await supabase
      .from("work_logs")
      .insert({
        sheet_id,
        user_id: user.id,
        hours: hours || null,
        notes: notes || null,
        items_completed: items_completed || [],
        work_type: "log_completion",
      })
      .select("*, users(name, email)")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create work log" },
      { status: 500 }
    )
  }
}

/**
 * Helper: recalculate job status from product statuses.
 */
async function updateJobStatus(supabase: any, sheetId: string) {
  try {
    const { data: items } = await supabase
      .from("sheet_items")
      .select("id, status")
      .eq("sheet_id", sheetId)

    if (!items || items.length === 0) return

    const allComplete = items.every((i: any) => i.status === "complete")
    const anyStarted = items.some(
      (i: any) =>
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

      await supabase
        .from("production_sheets")
        .update(updates)
        .eq("id", sheetId)
    }
  } catch (err) {
    console.error("Failed to update job status", err)
  }
}
