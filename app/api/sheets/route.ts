import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")

    let query = supabase
      .from("production_sheets")
      .select("*, sheet_templates(name), users(email, name)")
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sheets: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sheets" },
      { status: 500 }
    )
  }
}

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
    const { templateId, jobNumber, items } = body

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    // Create the sheet
    const { data: sheet, error: sheetError } = await supabase
      .from("production_sheets")
      .insert({
        template_id: templateId,
        user_id: user.id,
        job_number: jobNumber || null,
        status: "draft",
      })
      .select()
      .single()

    if (sheetError) {
      return NextResponse.json({ error: sheetError.message }, { status: 500 })
    }

    // Create sheet items if provided
    if (items && items.length > 0) {
      const sheetItems = items.map((item: any) => ({
        sheet_id: sheet.id,
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
        // Rollback sheet creation
        await supabase.from("production_sheets").delete().eq("id", sheet.id)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    // Record analytics event
    await supabase.from("analytics_events").insert({
      sheet_id: sheet.id,
      event_type: "created",
      user_id: user.id,
    })

    return NextResponse.json({ sheet })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create sheet" },
      { status: 500 }
    )
  }
}

