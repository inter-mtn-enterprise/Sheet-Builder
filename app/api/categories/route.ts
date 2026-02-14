import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const customOnly = searchParams.get("customOnly") === "true"
    const includeCounts = searchParams.get("includeCounts") === "true"

    let query = supabase
      .from("product_categories")
      .select("id, name, salesforce_id, is_custom, parent_category_id, catalog_id, created_at, updated_at")
      .order("name", { ascending: true })

    if (customOnly) {
      query = query.eq("is_custom", true)
    }

    const { data: categories, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If counts are requested, get product counts for each category
    if (includeCounts && categories) {
      const categoryIds = categories.map(c => c.id)
      const { data: counts } = await supabase
        .from("product_category_assignments")
        .select("category_id")
        .in("category_id", categoryIds)

      const countMap = new Map<string, number>()
      counts?.forEach((c: any) => {
        countMap.set(c.category_id, (countMap.get(c.category_id) || 0) + 1)
      })

      const categoriesWithCounts = categories.map(cat => ({
        ...cat,
        productCount: countMap.get(cat.id) || 0,
      }))

      return NextResponse.json({ categories: categoriesWithCounts })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
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
        { error: "Only managers can create categories" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, parent_category_id } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    // Validate parent_category_id if provided
    if (parent_category_id) {
      const { data: parentCategory } = await supabase
        .from("product_categories")
        .select("id, is_custom")
        .eq("id", parent_category_id)
        .single()

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" },
          { status: 400 }
        )
      }

      // Only allow custom categories as parents of custom categories
      if (!parentCategory.is_custom) {
        return NextResponse.json(
          { error: "Cannot set Salesforce category as parent of custom category" },
          { status: 400 }
        )
      }
    }

    // Create custom category
    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        name: name.trim(),
        salesforce_id: null,
        is_custom: true,
        parent_category_id: parent_category_id || null,
        imported_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    )
  }
}

