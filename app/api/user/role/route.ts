import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/user/role
 * Get current user's role
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      role: userData?.role || "worker",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get user role" },
      { status: 500 }
    )
  }
}

