import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET /api/team - List all team members
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch team" },
      { status: 500 }
    )
  }
}

// POST /api/team - Create a new team member
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
      return NextResponse.json({ error: "Only managers can create team members" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Use admin client to create the auth user
    const adminSupabase = createAdminClient()

    const { data: newAuthUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so worker can log in immediately
      user_metadata: {
        name,
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // The trigger handle_new_user will create the public.users row.
    // Now update the role to whatever was specified (default: worker)
    const userRole = role || "worker"
    const { error: updateError } = await adminSupabase
      .from("users")
      .update({ role: userRole, name })
      .eq("id", newAuthUser.user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      user: {
        id: newAuthUser.user.id,
        email,
        name,
        role: userRole,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create team member" },
      { status: 500 }
    )
  }
}

