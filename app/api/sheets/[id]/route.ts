import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
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

    const { data: sheet, error: sheetError } = await supabase
      .from("production_sheets")
      .select("*, sheet_templates(*), users(email, name)")
      .eq("id", params.id)
      .single()

    if (sheetError) {
      return NextResponse.json({ error: sheetError.message }, { status: 500 })
    }

    const { data: items, error: itemsError } = await supabase
      .from("sheet_items")
      .select("*")
      .eq("sheet_id", params.id)
      .order("created_at", { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({ sheet, items: items || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sheet" },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body = await request.json()
    const { jobNumber, status, items, estimated_completion_date } = body

    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (jobNumber !== undefined) updates.job_number = jobNumber
    if (status !== undefined) {
      updates.status = status
      if (status === "in_production" && estimated_completion_date) {
        updates.estimated_completion_date = estimated_completion_date
      }
      if (status === "completed") {
        updates.completed_at = new Date().toISOString()
      }
    }
    if (estimated_completion_date !== undefined && status !== "in_production") {
      updates.estimated_completion_date = estimated_completion_date
    }

    const { data: sheet, error: sheetError } = await supabase
      .from("production_sheets")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single()

    if (sheetError) {
      return NextResponse.json({ error: sheetError.message }, { status: 500 })
    }

    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase.from("sheet_items").delete().eq("sheet_id", params.id)

      // Insert new items
      if (items.length > 0) {
        const sheetItems = items.map((item: any) => ({
          sheet_id: params.id,
          banner_sku: item.bannerSku,
          banner_name: item.bannerName,
          image_url: item.imageUrl,
          quantity: item.quantity || 1,
          qty_in_order: item.qtyInOrder || 0,
          stock_qty: item.stockQty || 0,
          custom_fields: item.customFields || {},
        }))

        const { error: itemsError } = await supabase
          .from("sheet_items")
          .insert(sheetItems)

        if (itemsError) {
          return NextResponse.json({ error: itemsError.message }, { status: 500 })
        }
      }
    }

    // Record analytics event if status changed
    if (status) {
      await supabase.from("analytics_events").insert({
        sheet_id: params.id,
        event_type: status,
        user_id: user.id,
      })
    }

    return NextResponse.json({ sheet })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update sheet" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check ownership
    const { data: existing } = await supabase
      .from("production_sheets")
      .select("user_id")
      .eq("id", params.id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("production_sheets")
      .delete()
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete sheet" },
      { status: 500 }
    )
  }
}

