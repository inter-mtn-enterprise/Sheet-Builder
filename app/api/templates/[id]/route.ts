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

    const { data, error } = await supabase
      .from("sheet_templates")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data.user_id !== user.id && !data.is_shared) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ template: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
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
    const {
      name,
      isShared,
      fieldDefinitions,
      categoriesToInclude,
      productsToInclude,
      productsToExclude,
      categoriesToExclude,
    } = body

    // Check ownership
    const { data: existing } = await supabase
      .from("sheet_templates")
      .select("user_id")
      .eq("id", params.id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatePayload: Record<string, any> = {
      name,
      is_shared: isShared,
      field_definitions: fieldDefinitions,
      updated_at: new Date().toISOString(),
    }

    if (categoriesToInclude !== undefined) updatePayload.categories_to_include = categoriesToInclude
    if (productsToInclude !== undefined) updatePayload.products_to_include = productsToInclude
    if (productsToExclude !== undefined) updatePayload.products_to_exclude = productsToExclude
    if (categoriesToExclude !== undefined) updatePayload.categories_to_exclude = categoriesToExclude

    const { data, error } = await supabase
      .from("sheet_templates")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
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
      .from("sheet_templates")
      .select("user_id")
      .eq("id", params.id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("sheet_templates")
      .delete()
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    )
  }
}

