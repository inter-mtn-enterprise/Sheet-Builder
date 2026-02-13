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
      if ((status === "in_production" || status === "production_started") && estimated_completion_date) {
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
      // Get current sheet status to determine update strategy
      const { data: currentSheet } = await supabase
        .from("production_sheets")
        .select("status")
        .eq("id", params.id)
        .single()

      const isDraft = currentSheet?.status === "draft"

      // Get existing items to preserve completion tracking
      const { data: existingItems } = await supabase
        .from("sheet_items")
        .select("*")
        .eq("sheet_id", params.id)

      const existingItemsMap = new Map(
        (existingItems || []).map((item: any) => [item.id, item])
      )

      // Process each item in the update
      for (const item of items) {
        if (item.itemId) {
          // Update existing item - preserve completion tracking fields
          const existingItem = existingItemsMap.get(item.itemId)
          const updateData: any = {
            banner_sku: item.bannerSku,
            banner_name: item.bannerName,
            image_url: item.imageUrl,
            qty_in_order: item.qtyInOrder || 0,
            stock_qty: item.stockQty || 0,
            custom_fields: item.customFields || {},
            updated_at: new Date().toISOString(),
          }

          // Preserve completion tracking if it exists
          if (existingItem) {
            // If quantities are reduced below completed amounts, cap completed amounts
            if (updateData.qty_in_order < (existingItem.qty_in_order_completed || 0)) {
              updateData.qty_in_order_completed = updateData.qty_in_order
            }
            if (updateData.stock_qty < (existingItem.stock_qty_completed || 0)) {
              updateData.stock_qty_completed = updateData.stock_qty
            }
          }

          const { error: updateError } = await supabase
            .from("sheet_items")
            .update(updateData)
            .eq("id", item.itemId)

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from("sheet_items")
            .insert({
              sheet_id: params.id,
              banner_sku: item.bannerSku,
              banner_name: item.bannerName,
              image_url: item.imageUrl,
              qty_in_order: item.qtyInOrder || 0,
              stock_qty: item.stockQty || 0,
              custom_fields: item.customFields || {},
            })

          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
          }
        }
      }

      // For draft sheets, delete items that are no longer in the list
      // For production sheets, we keep all items to preserve history
      if (isDraft) {
        const updatedItemIds = items
          .map((item: any) => item.itemId)
          .filter((id: string) => id)
        const itemsToDelete = (existingItems || [])
          .map((item: any) => item.id)
          .filter((id: string) => !updatedItemIds.includes(id))

        if (itemsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("sheet_items")
            .delete()
            .in("id", itemsToDelete)

          if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
          }
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

