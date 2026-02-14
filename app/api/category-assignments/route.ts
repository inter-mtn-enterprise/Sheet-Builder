import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const categoryId = searchParams.get("categoryId")

    let query = supabase
      .from("product_category_assignments")
      .select(`
        id,
        product_id,
        category_id,
        is_primary,
        salesforce_product_id,
        salesforce_category_id,
        created_at,
        product_catalog(
          id,
          sku,
          name
        ),
        product_categories(
          id,
          name,
          is_custom
        )
      `)
      .order("created_at", { ascending: false })

    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assignments: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignments" },
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

    // Check that the requesting user is a manager
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!currentUser || currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can create assignments" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { product_id, category_id, is_primary } = body

    if (!product_id || !category_id) {
      return NextResponse.json(
        { error: "product_id and category_id are required" },
        { status: 400 }
      )
    }

    // Verify product exists
    const { data: product } = await supabase
      .from("product_catalog")
      .select("id, product_id")
      .eq("id", product_id)
      .single()

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 400 }
      )
    }

    // Verify category exists
    const { data: category } = await supabase
      .from("product_categories")
      .select("id, salesforce_id")
      .eq("id", category_id)
      .single()

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from("product_category_assignments")
      .select("id")
      .eq("product_id", product_id)
      .eq("category_id", category_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Assignment already exists" },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primary assignments for this product
    if (is_primary) {
      await supabase
        .from("product_category_assignments")
        .update({ is_primary: false })
        .eq("product_id", product_id)
        .eq("is_primary", true)
    }

    // Create assignment
    const assignmentData: any = {
      product_id,
      category_id,
      is_primary: is_primary || false,
      salesforce_product_id: product.product_id || null,
      salesforce_category_id: category.salesforce_id || null,
    }

    const { data, error } = await supabase
      .from("product_category_assignments")
      .insert(assignmentData)
      .select(`
        *,
        product_catalog(
          id,
          sku,
          name
        ),
        product_categories(
          id,
          name,
          is_custom
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update product's primary_category_id if this is primary
    if (is_primary) {
      await supabase
        .from("product_catalog")
        .update({ primary_category_id: category_id })
        .eq("id", product_id)
    }

    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create assignment" },
      { status: 500 }
    )
  }
}

