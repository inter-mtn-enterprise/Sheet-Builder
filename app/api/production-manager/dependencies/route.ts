import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { predecessorId, successorId } = body

    if (!predecessorId || !successorId) {
      return NextResponse.json(
        { error: "predecessorId and successorId are required" },
        { status: 400 }
      )
    }

    if (predecessorId === successorId) {
      return NextResponse.json(
        { error: "A sheet cannot depend on itself" },
        { status: 400 }
      )
    }

    // Validate both sheets exist
    const { data: predecessor } = await supabase
      .from("production_sheets")
      .select("id")
      .eq("id", predecessorId)
      .single()

    const { data: successor } = await supabase
      .from("production_sheets")
      .select("id")
      .eq("id", successorId)
      .single()

    if (!predecessor || !successor) {
      return NextResponse.json(
        { error: "One or both sheets not found" },
        { status: 404 }
      )
    }

    // Insert the dependency
    const { data: dependency, error } = await supabase
      .from("sheet_dependencies")
      .insert({
        predecessor_id: predecessorId,
        successor_id: successorId,
        dependency_type: "finish_to_start",
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This dependency link already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ dependency })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create dependency" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, predecessorId, successorId } = body

    if (!id && (!predecessorId || !successorId)) {
      return NextResponse.json(
        { error: "Either id or both predecessorId and successorId are required" },
        { status: 400 }
      )
    }

    let query = supabase.from("sheet_dependencies").delete()

    if (id) {
      query = query.eq("id", id)
    } else {
      query = query
        .eq("predecessor_id", predecessorId)
        .eq("successor_id", successorId)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete dependency" },
      { status: 500 }
    )
  }
}
