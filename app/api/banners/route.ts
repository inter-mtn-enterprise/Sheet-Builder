import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function parseJsonParam(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {
    // Fall back to comma-separated
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "60", 10)
    const categoriesOnly = searchParams.get("categoriesOnly") === "true"

    // Template-level filter params
    const categoriesToInclude = parseJsonParam(searchParams.get("categoriesToInclude"))
    const productsToInclude = parseJsonParam(searchParams.get("productsToInclude"))
    const productsToExclude = parseJsonParam(searchParams.get("productsToExclude"))
    const categoriesToExclude = parseJsonParam(searchParams.get("categoriesToExclude"))

    // If only categories are requested, return them quickly
    if (categoriesOnly) {
      // Supabase defaults to 1000 rows max per query, so we paginate
      // through all rows to collect every distinct category.
      const allCategories = new Set<string>()
      const batchSize = 1000
      let offset = 0
      let keepGoing = true

      while (keepGoing) {
        const { data: catData, error: catError } = await supabase
          .from("product_catalog")
          .select("category")
          .range(offset, offset + batchSize - 1)

        if (catError) {
          return NextResponse.json({ error: catError.message }, { status: 500 })
        }

        if (catData) {
          for (const row of catData) {
            if (row.category) allCategories.add(row.category)
          }
        }

        if (!catData || catData.length < batchSize) {
          keepGoing = false
        } else {
          offset += batchSize
        }
      }

      const uniqueCategories = Array.from(allCategories).sort()
      return NextResponse.json({ categories: uniqueCategories })
    }

    const hasInclusionFilters = categoriesToInclude.length > 0 || productsToInclude.length > 0
    const hasExclusionFilters = categoriesToExclude.length > 0 || productsToExclude.length > 0

    // Build paginated query with server-side search & filtering
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from("product_catalog")
      .select("*", { count: "exact" })
      .order("sku", { ascending: true })
      .range(from, to)

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    // Apply inclusion filters (union: category in list OR sku in list)
    if (hasInclusionFilters) {
      const orParts: string[] = []
      if (categoriesToInclude.length > 0) {
        orParts.push(`category.in.(${categoriesToInclude.join(",")})`)
      }
      if (productsToInclude.length > 0) {
        orParts.push(`sku.in.(${productsToInclude.join(",")})`)
      }
      query = query.or(orParts.join(","))
    }

    // Apply exclusion filters
    if (categoriesToExclude.length > 0) {
      // Exclude products in these categories
      for (const cat of categoriesToExclude) {
        query = query.neq("category", cat)
      }
    }
    if (productsToExclude.length > 0) {
      // Exclude specific products by SKU
      for (const sku of productsToExclude) {
        query = query.neq("sku", sku)
      }
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      banners: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: (data?.length || 0) === limit && from + (data?.length || 0) < (count || 0),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch banners" },
      { status: 500 }
    )
  }
}
