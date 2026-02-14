import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("product_categories")
      .select(`
        *,
        product_category_assignments(
          id,
          product_id,
          is_primary,
          product_catalog(
            id,
            sku,
            name
          )
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch category" },
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
        { error: "Only managers can update categories" },
        { status: 403 }
      )
    }

    // Check if category exists and is custom
    const { data: existingCategory } = await supabase
      .from("product_categories")
      .select("id, is_custom")
      .eq("id", params.id)
      .single()

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    if (!existingCategory.is_custom) {
      return NextResponse.json(
        { error: "Cannot update Salesforce categories" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, parent_category_id } = body

    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Category name cannot be empty" },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (parent_category_id !== undefined) {
      if (parent_category_id === null) {
        updateData.parent_category_id = null
      } else {
        // Validate parent category
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

        // Prevent circular references
        if (parent_category_id === params.id) {
          return NextResponse.json(
            { error: "Category cannot be its own parent" },
            { status: 400 }
          )
        }

        // Only allow custom categories as parents
        if (!parentCategory.is_custom) {
          return NextResponse.json(
            { error: "Cannot set Salesforce category as parent" },
            { status: 400 }
          )
        }

        updateData.parent_category_id = parent_category_id
      }
    }

    const { data, error } = await supabase
      .from("product_categories")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
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

    // Check that the requesting user is a manager
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!currentUser || currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can delete categories" },
        { status: 403 }
      )
    }

    // Check if category exists and is custom
    const { data: existingCategory } = await supabase
      .from("product_categories")
      .select("id, is_custom")
      .eq("id", params.id)
      .single()

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    if (!existingCategory.is_custom) {
      return NextResponse.json(
        { error: "Cannot delete Salesforce categories" },
        { status: 403 }
      )
    }

    // Delete category (assignments will cascade delete)
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 }
    )
  }
}

