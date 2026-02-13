import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// PUT /api/team/[id] - Update a team member (role, password reset)
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
      return NextResponse.json({ error: "Only managers can update team members" }, { status: 403 })
    }

    const body = await request.json()
    const { role, password, name } = body

    const adminSupabase = createAdminClient()

    // Update auth user if password is being reset
    if (password) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(
        params.id,
        { password }
      )
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
    }

    // Update public.users record
    const updates: Record<string, any> = {}
    if (role) updates.role = role
    if (name !== undefined) updates.name = name

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminSupabase
        .from("users")
        .update(updates)
        .eq("id", params.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update team member" },
      { status: 500 }
    )
  }
}

// DELETE /api/team/[id] - Delete a team member
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
      return NextResponse.json({ error: "Only managers can delete team members" }, { status: 403 })
    }

    // Prevent deleting yourself
    if (params.id === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Delete the auth user (cascades to public.users via FK)
    const { error } = await adminSupabase.auth.admin.deleteUser(params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete team member" },
      { status: 500 }
    )
  }
}

