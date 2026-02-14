import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
        { error: "Only managers can delete assignments" },
        { status: 403 }
      )
    }

    // Get assignment details before deleting
    const { data: assignment } = await supabase
      .from("product_category_assignments")
      .select("product_id, category_id, is_primary")
      .eq("id", params.id)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    // Delete assignment
    const { error } = await supabase
      .from("product_category_assignments")
      .delete()
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If this was the primary category, update product
    if (assignment.is_primary) {
      // Find another primary assignment or set to null
      const { data: otherPrimary } = await supabase
        .from("product_category_assignments")
        .select("category_id")
        .eq("product_id", assignment.product_id)
        .eq("is_primary", true)
        .limit(1)
        .single()

      await supabase
        .from("product_catalog")
        .update({
          primary_category_id: otherPrimary?.category_id || null,
        })
        .eq("id", assignment.product_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete assignment" },
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
        { error: "Only managers can update assignments" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { is_primary } = body

    // If setting as primary, unset other primary assignments
    if (is_primary) {
      const { data: assignment } = await supabase
        .from("product_category_assignments")
        .select("product_id")
        .eq("id", params.id)
        .single()

      if (assignment) {
        await supabase
          .from("product_category_assignments")
          .update({ is_primary: false })
          .eq("product_id", assignment.product_id)
          .eq("is_primary", true)
          .neq("id", params.id)

        // Update product's primary_category_id
        const { data: categoryData } = await supabase
          .from("product_category_assignments")
          .select("category_id")
          .eq("id", params.id)
          .single()

        if (categoryData) {
          await supabase
            .from("product_catalog")
            .update({ primary_category_id: categoryData.category_id })
            .eq("id", assignment.product_id)
        }
      }
    }

    const { data, error } = await supabase
      .from("product_category_assignments")
      .update({ is_primary: is_primary || false })
      .eq("id", params.id)
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

    return NextResponse.json({ assignment: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    )
  }
}

