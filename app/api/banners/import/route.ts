import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function parseCSV(text: string) {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    if (values.length >= 4) {
      data.push({
        id: values[0] || '',
        name: values[1] || '',
        sku: values[2] || '',
        productCode: values[3] || ''
      })
    }
  }

  return data
}

function getCategoryFromProductCode(productCode: string): string {
  if (!productCode) return 'Other'
  const parts = productCode.split(':')
  return parts[0] || 'Other'
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

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const banners = parseCSV(text)

    if (banners.length === 0) {
      return NextResponse.json({ error: "No valid banner data found" }, { status: 400 })
    }

    // Insert banners into product_catalog (legacy single-file import)
    const bannerData = banners.map(banner => ({
      product_id: banner.id || null,
      sku: banner.sku,
      name: banner.name,
      product_code: banner.productCode,
      category: getCategoryFromProductCode(banner.productCode),
      imported_by: user.id,
    }))

    const { error } = await supabase
      .from("product_catalog")
      .upsert(bannerData, {
        onConflict: "sku",
        ignoreDuplicates: false,
      })

    if (error) {
      console.error("Error importing banners:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: banners.length,
    })
  } catch (error: any) {
    console.error("Error in CSV import:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import CSV" },
      { status: 500 }
    )
  }
}

