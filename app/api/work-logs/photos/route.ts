import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/work-logs/photos - Upload a photo and attach it to a work log
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const workLogId = formData.get("work_log_id") as string | null
    const caption = formData.get("caption") as string | null

    if (!file || !workLogId) {
      return NextResponse.json(
        { error: "file and work_log_id are required" },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${workLogId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("work-log-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("work-log-photos")
      .getPublicUrl(uploadData.path)

    // Save photo record
    const { data: photo, error: photoError } = await supabase
      .from("work_log_photos")
      .insert({
        work_log_id: workLogId,
        photo_url: urlData.publicUrl,
        caption: caption || null,
      })
      .select()
      .single()

    if (photoError) {
      return NextResponse.json({ error: photoError.message }, { status: 500 })
    }

    return NextResponse.json({ photo })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upload photo" },
      { status: 500 }
    )
  }
}

