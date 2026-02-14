import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getAccessToken, queryAll, buildImageUrl, getApiLimits } from "@/lib/salesforce/client"
import type {
  SalesforceProduct,
  SalesforceProductMedia,
  SalesforceManagedContent,
  SalesforceProductCategory,
  SalesforceProductCategoryProduct,
} from "@/lib/salesforce/types"

function getCategoryFromProductCode(productCode: string | null | undefined): string {
  if (!productCode) return 'Other'
  const parts = productCode.split(':')
  return parts[0] || 'Other'
}

/**
 * POST /api/salesforce/import/preview
 * Preview what would be imported without actually importing
 */
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
      return NextResponse.json(
        { error: "Only managers can preview Salesforce imports" },
        { status: 403 }
      )
    }

    // Parse request body for import selections
    let importProducts = true
    let importCategories = false
    let importMappings = false
    
    try {
      const body = await request.json()
      importProducts = body.importProducts !== undefined ? body.importProducts : true
      importCategories = body.importCategories === true
      importMappings = body.importMappings === true
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Validation: require products if categories or mappings selected
    if ((importCategories || importMappings) && !importProducts) {
      return NextResponse.json(
        { error: "Products must be selected when importing Categories or Mappings" },
        { status: 400 }
      )
    }

    // Get valid access token
    let accessToken: string
    let instanceUrl: string
    try {
      const token = await getAccessToken(user.id)
      accessToken = token.access_token
      instanceUrl = token.instance_url
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Not connected to Salesforce. Please connect first." },
        { status: 401 }
      )
    }

    // Track API usage
    let totalApiCalls = 0

    // Get API limits before preview
    let apiLimitsBefore: any = null
    try {
      apiLimitsBefore = await getApiLimits(accessToken, instanceUrl)
      totalApiCalls++
    } catch (error: any) {
      console.warn("Failed to get API limits before preview:", error.message)
    }

    // Fetch Products from Salesforce (if selected)
    let products: SalesforceProduct[] = []
    if (importProducts) {
      const productsResult = await queryAll<SalesforceProduct>(
        "SELECT Id, Name, StockKeepingUnit, ProductCode, IsActive FROM Product2 WHERE IsActive = true",
        accessToken,
        instanceUrl
      )
      products = productsResult.records
      totalApiCalls += productsResult.apiCalls

      if (products.length === 0 && importCategories) {
        return NextResponse.json({
          preview: [],
          statistics: {
            totalProducts: 0,
            newProducts: 0,
            existingProducts: 0,
            productsWithImages: 0,
            productsWithoutImages: 0,
            ...(importCategories && { categoriesImported: 0 }),
            ...(importMappings && { mappingsImported: 0, productsWithCategories: 0 }),
          },
        })
      }
    }

    // Fetch Categories from Salesforce (if selected)
    let categories: SalesforceProductCategory[] = []
    if (importCategories) {
      try {
        const categoriesResult = await queryAll<SalesforceProductCategory>(
          "SELECT Id, Name, CatalogId, ParentCategoryId FROM ProductCategory",
          accessToken,
          instanceUrl
        )
        categories = categoriesResult.records
        totalApiCalls += categoriesResult.apiCalls
      } catch (error: any) {
        console.warn("Failed to fetch categories:", error.message)
      }
    }

    // Fetch Category Mappings from Salesforce (if selected)
    let categoryMappings: SalesforceProductCategoryProduct[] = []
    if (importMappings) {
      try {
        const mappingsResult = await queryAll<SalesforceProductCategoryProduct>(
          "SELECT Id, ProductId, ProductCategoryId FROM ProductCategoryProduct",
          accessToken,
          instanceUrl
        )
        categoryMappings = mappingsResult.records
        totalApiCalls += mappingsResult.apiCalls
      } catch (error: any) {
        console.warn("Failed to fetch category mappings:", error.message)
      }
    }

    // Fetch Product Media (only if products are selected)
    let productMedia: SalesforceProductMedia[] = []
    let managedContent: SalesforceManagedContent[] = []
    
    if (importProducts && products.length > 0) {
      const productIds = products.map(p => `'${p.Id}'`).join(",")
      
      try {
        const batchSize = 200
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize)
          const batchIds = batch.map(p => `'${p.Id}'`).join(",")
          const mediaQuery = `SELECT Id, ProductId, ElectronicMediaId FROM ProductMedia WHERE ProductId IN (${batchIds})`
          const batchMediaResult = await queryAll<SalesforceProductMedia>(
            mediaQuery,
            accessToken,
            instanceUrl
          )
          productMedia.push(...batchMediaResult.records)
          totalApiCalls += batchMediaResult.apiCalls
        }
      } catch (error: any) {
        console.warn("Failed to fetch product media:", error.message)
      }

      // Fetch Managed Content
      try {
        const electronicMediaIds = productMedia
          .map(m => m.ElectronicMediaId)
          .filter((id): id is string => !!id)
        
        if (electronicMediaIds.length > 0) {
          const batchSize = 200
          for (let i = 0; i < electronicMediaIds.length; i += batchSize) {
            const batch = electronicMediaIds.slice(i, i + batchSize)
            const batchIds = batch.map(id => `'${id}'`).join(",")
            const contentQuery = `SELECT Id, ContentKey FROM ManagedContent WHERE Id IN (${batchIds})`
            const batchContentResult = await queryAll<SalesforceManagedContent>(
              contentQuery,
              accessToken,
              instanceUrl
            )
            managedContent.push(...batchContentResult.records)
            totalApiCalls += batchContentResult.apiCalls
          }
        }
      } catch (error: any) {
        console.warn("Failed to fetch managed content:", error.message)
      }
    }

    // Build image URL mappings (only if products are selected)
    const imageMappings = new Map<string, string | null>()
    if (importProducts && products.length > 0 && productMedia.length > 0) {
      const mediaToContent = new Map<string, string>()
      managedContent.forEach(content => {
        if (content.Id && content.ContentKey) {
          mediaToContent.set(content.Id, content.ContentKey)
        }
      })

      const productToMedia = new Map<string, SalesforceProductMedia>()
      productMedia.forEach(media => {
        if (!productToMedia.has(media.ProductId)) {
          productToMedia.set(media.ProductId, media)
        }
      })

      productToMedia.forEach((media, productId) => {
        if (media.ElectronicMediaId) {
          const contentKey = mediaToContent.get(media.ElectronicMediaId)
          const imageUrl = buildImageUrl(contentKey)
          imageMappings.set(productId, imageUrl)
        }
      })
    }

    // Build preview data (only if products are selected)
    let previewData: any[] = []
    let newProducts = 0
    let existingProductsCount = 0
    let productsWithImages = 0
    let productsWithoutImages = 0

    if (importProducts && products.length > 0) {
      // Get existing products to determine what's new vs existing
      const existingSkus = products
        .map(p => p.StockKeepingUnit)
        .filter((sku): sku is string => !!sku)
      
      // Batch the query to avoid Supabase's IN clause limit (typically 1000 items)
      const existingMap = new Map<string, any>()
      const batchSize = 1000
      
      for (let i = 0; i < existingSkus.length; i += batchSize) {
        const batch = existingSkus.slice(i, i + batchSize)
        const { data: existingProducts } = await supabase
          .from("product_catalog")
          .select("sku, product_code, category, name")
          .in("sku", batch)
        
        existingProducts?.forEach(p => {
          existingMap.set(p.sku, p)
        })
      }

      // Build preview data
      previewData = products
        .filter(p => p.StockKeepingUnit)
        .slice(0, 50) // Limit preview to first 50 products
        .map(product => {
          const imageUrl = imageMappings.get(product.Id) || null
          const existing = existingMap.get(product.StockKeepingUnit || "")
          const productCode = product.ProductCode || existing?.product_code || null
          const category = productCode
            ? getCategoryFromProductCode(productCode)
            : (existing?.category || 'Other')

          return {
            product_id: product.Id,
            sku: product.StockKeepingUnit!,
            name: product.Name || null,
            product_code: productCode,
            category: category,
            image_url: imageUrl,
            isNew: !existing,
            existingName: existing?.name || null,
            willUpdate: !!existing,
          }
        })

      // Calculate statistics for all products (not just preview)
      const allProductData = products
        .filter(p => p.StockKeepingUnit)
        .map(product => {
          const imageUrl = imageMappings.get(product.Id) || null
          const existing = existingMap.get(product.StockKeepingUnit || "")
          return {
            isNew: !existing,
            hasImage: !!imageUrl,
          }
        })

      newProducts = allProductData.filter(p => p.isNew).length
      existingProductsCount = allProductData.filter(p => !p.isNew).length
      productsWithImages = allProductData.filter(p => p.hasImage).length
      productsWithoutImages = allProductData.length - productsWithImages
    }

    // Calculate category statistics
    let categoriesImported: number | undefined
    let mappingsImported: number | undefined
    let productsWithCategories: number | undefined

    if (importCategories) {
      categoriesImported = categories.length
    }

    if (importMappings && categoryMappings.length > 0 && products.length > 0) {
      mappingsImported = categoryMappings.length
      // Count unique products that have category mappings
      const productsWithMappings = new Set(categoryMappings.map(m => m.ProductId))
      productsWithCategories = productsWithMappings.size
    }

    // Get API limits after preview
    let apiLimitsAfter: any = null
    try {
      apiLimitsAfter = await getApiLimits(accessToken, instanceUrl)
      totalApiCalls++
    } catch (error: any) {
      console.warn("Failed to get API limits after preview:", error.message)
    }

    // Calculate API usage
    const dailyApiRequests = apiLimitsAfter?.DailyApiRequests || apiLimitsBefore?.DailyApiRequests
    const apiUsage = dailyApiRequests ? {
      used: dailyApiRequests.Max - dailyApiRequests.Remaining,
      remaining: dailyApiRequests.Remaining,
      limit: dailyApiRequests.Max,
      usedInThisPreview: totalApiCalls,
    } : null

    return NextResponse.json({
      preview: previewData,
      statistics: {
        totalProducts: products.length,
        newProducts,
        existingProducts: existingProductsCount,
        productsWithImages,
        productsWithoutImages,
        previewLimit: 50,
        totalPreviewable: products.filter(p => p.StockKeepingUnit).length,
        ...(categoriesImported !== undefined && { categoriesImported }),
        ...(mappingsImported !== undefined && { mappingsImported }),
        ...(productsWithCategories !== undefined && { productsWithCategories }),
        apiUsage,
      },
    })
  } catch (error: any) {
    console.error("Error in Salesforce preview:", error)
    return NextResponse.json(
      { error: error.message || "Failed to preview Salesforce import" },
      { status: 500 }
    )
  }
}

