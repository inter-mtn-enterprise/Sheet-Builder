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

    const { data, error } = await supabase
      .from("sheet_templates")
      .select("*")
      .or(`user_id.eq.${user.id},is_shared.eq.true`)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
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
    const {
      name,
      isShared,
      fieldDefinitions,
      categoriesToInclude,
      productsToInclude,
      productsToExclude,
      categoriesToExclude,
    } = body

    if (!name || !fieldDefinitions) {
      return NextResponse.json(
        { error: "Name and fieldDefinitions are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("sheet_templates")
      .insert({
        user_id: user.id,
        name,
        is_shared: isShared || false,
        field_definitions: fieldDefinitions,
        categories_to_include: categoriesToInclude || [],
        products_to_include: productsToInclude || [],
        products_to_exclude: productsToExclude || [],
        categories_to_exclude: categoriesToExclude || [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    )
  }
}

