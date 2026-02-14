import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("product_catalog")
      .select(`
        *,
        product_categories!product_catalog_primary_category_id_fkey(
          id,
          name,
          is_custom,
          salesforce_id
        ),
        product_category_assignments(
          id,
          is_primary,
          product_categories(
            id,
            name,
            is_custom
          )
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
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

    // Check that the requesting user is a manager
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!currentUser || currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can update products" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Only allow updating limited fields (preserve Salesforce data)
    const allowedFields = ["name", "product_code", "category"]
    const updateData: any = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from("product_catalog")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500 }
    )
  }
}

