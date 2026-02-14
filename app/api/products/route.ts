import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const categoryId = searchParams.get("categoryId") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const includeCategoryDetails = searchParams.get("includeCategoryDetails") === "true"

    // Build paginated query
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query - join with product_categories if filtering by categoryId or including details
    let query = supabase
      .from("product_catalog")
      .select(
        includeCategoryDetails || categoryId
          ? "*, product_categories!product_catalog_primary_category_id_fkey(id, name, is_custom)"
          : "*",
        { count: "exact" }
      )
      .order("sku", { ascending: true })
      .range(from, to)

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }

    // Filter by categoryId
    if (categoryId) {
      query = query.eq("primary_category_id", categoryId)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      products: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: (data?.length || 0) === limit && from + (data?.length || 0) < (count || 0),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    )
  }
}

