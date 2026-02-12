import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  parseProductsCSV,
  parseProductMediaCSV,
  parseManagedContentCSV,
} from "@/lib/csv-parser"
import { buildImageMappings } from "@/lib/image-url-builder"

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
    const productsFile = formData.get("productsFile") as File
    const productMediaFile = formData.get("productMediaFile") as File
    const managedContentFile = formData.get("managedContentFile") as File

    // Validate all files are provided
    if (!productsFile || !productMediaFile || !managedContentFile) {
      return NextResponse.json(
        { error: "All three CSV files are required: products, productMedia, and managedContent" },
        { status: 400 }
      )
    }

    // Read and parse all three files
    const [productsText, productMediaText, managedContentText] = await Promise.all([
      productsFile.text(),
      productMediaFile.text(),
      managedContentFile.text(),
    ])

    // Parse CSVs
    const products = parseProductsCSV(productsText)
    const productMedia = parseProductMediaCSV(productMediaText)
    const managedContent = parseManagedContentCSV(managedContentText)

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found in products CSV" },
        { status: 400 }
      )
    }

    // Build image URL mappings
    const imageMappings = buildImageMappings(productMedia, managedContent)

    // Fetch existing products to preserve product_code and category if new data is missing
    const existingSkus = products.map(p => p.sku)
    const { data: existingProducts } = await supabase
      .from("product_catalog")
      .select("sku, product_code, category")
      .in("sku", existingSkus)

    const existingMap = new Map(
      (existingProducts || []).map(p => [p.sku, { product_code: p.product_code, category: p.category }])
    )

    // Prepare product data with image URLs, preserving existing product_code/category if new is empty
    const productData = products.map(product => {
      const imageMapping = imageMappings.get(product.id)
      const imageUrl = imageMapping?.imageUrl || null
      const existing = existingMap.get(product.sku)

      // Preserve existing product_code if new one is empty
      const productCode = product.productCode || existing?.product_code || null
      // Preserve existing category if product_code is empty, otherwise derive from product_code
      const category = productCode 
        ? getCategoryFromProductCode(productCode)
        : (existing?.category || 'Other')

      return {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        product_code: productCode,
        category: category,
        image_url: imageUrl,
        imported_by: user.id,
      }
    })

    // Upsert products into database
    const { error } = await supabase
      .from("product_catalog")
      .upsert(productData, {
        onConflict: "sku",
        ignoreDuplicates: false,
      })

    if (error) {
      console.error("Error importing products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const productsWithImages = productData.filter(p => p.image_url !== null).length
    const productsWithoutImages = productData.length - productsWithImages

    return NextResponse.json({
      success: true,
      statistics: {
        totalProducts: products.length,
        productsImported: productData.length,
        productsWithImages,
        productsWithoutImages,
        imageMappingsFound: imageMappings.size,
      },
    })
  } catch (error: any) {
    console.error("Error in product import:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import products" },
      { status: 500 }
    )
  }
}

