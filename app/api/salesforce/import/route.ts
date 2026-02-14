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
 * POST /api/salesforce/import
 * Import products from Salesforce
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
        { error: "Only managers can import from Salesforce" },
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

    // Get API limits before import
    let apiLimitsBefore: any = null
    try {
      apiLimitsBefore = await getApiLimits(accessToken, instanceUrl)
      totalApiCalls++
    } catch (error: any) {
      console.warn("Failed to get API limits before import:", error.message)
    }

    // Fetch Products from Salesforce (if selected)
    let products: SalesforceProduct[] = []
    if (importProducts) {
      console.log("Fetching products from Salesforce...")
      const productsResult = await queryAll<SalesforceProduct>(
        "SELECT Id, Name, StockKeepingUnit, ProductCode, IsActive FROM Product2 WHERE IsActive = true",
        accessToken,
        instanceUrl
      )
      products = productsResult.records
      totalApiCalls += productsResult.apiCalls

      if (products.length === 0 && importCategories) {
        return NextResponse.json(
          { error: "No active products found in Salesforce. Products are required for category imports." },
          { status: 400 }
        )
      }

      console.log(`Found ${products.length} products`)
    }

    // Fetch Product Media
    console.log("Fetching product media...")
    const productIds = products.map(p => `'${p.Id}'`).join(",")
    let productMedia: SalesforceProductMedia[] = []
    
    try {
      // Query in batches to avoid URL length limits
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
      // Continue without media
    }

    console.log(`Found ${productMedia.length} product media records`)

    // Fetch Categories from Salesforce (if selected)
    let categories: SalesforceProductCategory[] = []
    if (importCategories) {
      console.log("Fetching categories from Salesforce...")
      try {
        const categoriesResult = await queryAll<SalesforceProductCategory>(
          "SELECT Id, Name, CatalogId, ParentCategoryId FROM ProductCategory",
          accessToken,
          instanceUrl
        )
        categories = categoriesResult.records
        totalApiCalls += categoriesResult.apiCalls
        console.log(`Found ${categories.length} categories`)
      } catch (error: any) {
        console.warn("Failed to fetch categories:", error.message)
        return NextResponse.json(
          { error: `Failed to fetch categories: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Fetch Category Mappings from Salesforce (if selected)
    let categoryMappings: SalesforceProductCategoryProduct[] = []
    if (importMappings) {
      console.log("Fetching category mappings from Salesforce...")
      try {
        const mappingsResult = await queryAll<SalesforceProductCategoryProduct>(
          "SELECT Id, ProductId, ProductCategoryId FROM ProductCategoryProduct",
          accessToken,
          instanceUrl
        )
        categoryMappings = mappingsResult.records
        totalApiCalls += mappingsResult.apiCalls
        console.log(`Found ${categoryMappings.length} category mappings`)
      } catch (error: any) {
        console.warn("Failed to fetch category mappings:", error.message)
        return NextResponse.json(
          { error: `Failed to fetch category mappings: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Fetch Managed Content (for image URLs)
    console.log("Fetching managed content...")
    let managedContent: SalesforceManagedContent[] = []
    
    try {
      const electronicMediaIds = productMedia
        .map(m => m.ElectronicMediaId)
        .filter((id): id is string => !!id)
      
      if (electronicMediaIds.length > 0) {
        // Query in batches
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
      // Continue without managed content
    }

    console.log(`Found ${managedContent.length} managed content records`)

    // Build image URL mappings
    // Step 1: Map ElectronicMediaId to ContentKey
    const mediaToContent = new Map<string, string>()
    managedContent.forEach(content => {
      if (content.Id && content.ContentKey) {
        mediaToContent.set(content.Id, content.ContentKey)
      }
    })

    // Step 2: Map ProductId to ImageMapping
    const productToMedia = new Map<string, SalesforceProductMedia>()
    productMedia.forEach(media => {
      if (!productToMedia.has(media.ProductId)) {
        productToMedia.set(media.ProductId, media)
      }
    })

    // Step 3: Build final image mappings
    const imageMappings = new Map<string, string | null>()
    productToMedia.forEach((media, productId) => {
      if (media.ElectronicMediaId) {
        const contentKey = mediaToContent.get(media.ElectronicMediaId)
        const imageUrl = buildImageUrl(contentKey)
        imageMappings.set(productId, imageUrl)
      }
    })

    // Import Categories (if selected)
    let categoriesImported = 0
    const categoryIdMap = new Map<string, string>() // Maps Salesforce category ID to our UUID
    if (importCategories && categories.length > 0) {
      console.log(`Importing ${categories.length} categories...`)
      
      // Build category data for upsert - only Salesforce categories (skip custom ones)
      const categoryData = categories
        .filter(cat => cat.Id) // Only categories with Salesforce ID
        .map(cat => ({
          salesforce_id: cat.Id,
          name: cat.Name,
          catalog_id: cat.CatalogId || null,
          parent_category_id: null, // Will be set after all categories are imported
          imported_by: user.id,
          is_custom: false, // Explicitly mark as Salesforce category
        }))

      // Upsert categories manually to work with partial unique index
      // First, get existing categories by salesforce_id
      const salesforceIds = categoryData.map(c => c.salesforce_id).filter((id): id is string => !!id)
      const { data: existingCategories } = await supabase
        .from("product_categories")
        .select("id, salesforce_id")
        .in("salesforce_id", salesforceIds)

      const existingMap = new Map<string, string>()
      existingCategories?.forEach(cat => {
        if (cat.salesforce_id) {
          existingMap.set(cat.salesforce_id, cat.id)
          // Populate categoryIdMap with existing categories immediately
          categoryIdMap.set(cat.salesforce_id, cat.id)
        }
      })

      // Separate into inserts and updates
      const toInsert = categoryData.filter(c => !existingMap.has(c.salesforce_id!))
      const toUpdate = categoryData.filter(c => existingMap.has(c.salesforce_id!))

      // Insert new categories
      if (toInsert.length > 0) {
        const { data: insertedCategories, error: insertError } = await supabase
          .from("product_categories")
          .insert(toInsert)
          .select("id, salesforce_id")

        if (insertError) {
          console.error("Error inserting categories:", insertError)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        insertedCategories?.forEach(cat => {
          if (cat.salesforce_id) {
            categoryIdMap.set(cat.salesforce_id, cat.id)
          }
        })
      }

      // Update existing categories
      if (toUpdate.length > 0) {
        for (const cat of toUpdate) {
          const existingId = existingMap.get(cat.salesforce_id!)
          if (existingId) {
            const { error: updateError } = await supabase
              .from("product_categories")
              .update({
                name: cat.name,
                catalog_id: cat.catalog_id,
                imported_by: cat.imported_by,
                is_custom: false,
              })
              .eq("id", existingId)

            if (updateError) {
              console.error("Error updating category:", updateError)
              return NextResponse.json({ error: updateError.message }, { status: 500 })
            }

            categoryIdMap.set(cat.salesforce_id!, existingId)
          }
        }
      }

      categoriesImported = categoryData.length

      // Update parent_category_id for hierarchical categories
      if (categories.some(c => c.ParentCategoryId)) {
        for (const cat of categories) {
          if (cat.ParentCategoryId && categoryIdMap.has(cat.Id) && categoryIdMap.has(cat.ParentCategoryId)) {
            const ourCategoryId = categoryIdMap.get(cat.Id)!
            const parentCategoryId = categoryIdMap.get(cat.ParentCategoryId)!
            await supabase
              .from("product_categories")
              .update({ parent_category_id: parentCategoryId })
              .eq("id", ourCategoryId)
          }
        }
      }

      console.log(`Imported ${categoriesImported} categories`)
    }

    // Fetch existing products to preserve product_code and category if new data is missing
    let productData: any[] = []
    let productsWithImages = 0
    let productsWithoutImages = 0
    
    if (importProducts && products.length > 0) {
      const existingSkus = products
        .map(p => p.StockKeepingUnit)
        .filter((sku): sku is string => !!sku)
      
      // Batch the query to avoid Supabase's IN clause limit (typically 1000 items)
      const existingMap = new Map<string, { product_code: string | null; category: string | null }>()
      const batchSize = 1000
      
      for (let i = 0; i < existingSkus.length; i += batchSize) {
        const batch = existingSkus.slice(i, i + batchSize)
        const { data: existingProducts } = await supabase
          .from("product_catalog")
          .select("sku, product_code, category")
          .in("sku", batch)
        
        existingProducts?.forEach(p => {
          existingMap.set(p.sku, { product_code: p.product_code, category: p.category })
        })
      }

      // Prepare product data with image URLs, preserving existing product_code/category if new is empty
      productData = products
        .filter(p => p.StockKeepingUnit) // Only products with SKU
        .map(product => {
          const imageUrl = imageMappings.get(product.Id) || null
          const existing = existingMap.get(product.StockKeepingUnit || "")

          // Preserve existing product_code if new one is empty
          const productCode = product.ProductCode || existing?.product_code || null
          // Preserve existing category if product_code is empty, otherwise derive from product_code
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
            imported_by: user.id,
          }
        })

      // Upsert products into database
      console.log(`Upserting ${productData.length} products...`)
      const { error: upsertError } = await supabase
        .from("product_catalog")
        .upsert(productData, {
          onConflict: "sku",
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error("Error importing products:", upsertError)
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }

      // Calculate statistics
      productsWithImages = productData.filter(p => p.image_url !== null).length
      productsWithoutImages = productData.length - productsWithImages
    }

    // Import Category Mappings (if selected)
    let mappingsImported = 0
    let productsWithCategories = 0
    let assignmentData: any[] = [] // Declare outside for diagnostics
    
    console.log(`Category mapping import check: importMappings=${importMappings}, categoryMappings.length=${categoryMappings.length}, products.length=${products.length}, categories.length=${categories.length}`)
    
    if (!importMappings) {
      console.log("SKIPPING category mappings: importMappings is false")
    } else if (categoryMappings.length === 0) {
      console.log("SKIPPING category mappings: categoryMappings array is empty")
    } else if (products.length === 0) {
      console.log("SKIPPING category mappings: products array is empty")
    } else if (categories.length === 0) {
      console.log("SKIPPING category mappings: categories array is empty")
    }
    
    if (importMappings && categoryMappings.length > 0 && products.length > 0 && categories.length > 0) {
      console.log(`Importing ${categoryMappings.length} category mappings...`)
      console.log(`Category ID map size: ${categoryIdMap.size}`)
      console.log(`Categories in map: ${Array.from(categoryIdMap.keys()).slice(0, 5).join(', ')}...`)

      // Get product IDs from our database (map Salesforce Product2.Id to our product_catalog.id)
      const salesforceProductIds = products.map(p => p.Id)
      const { data: ourProducts } = await supabase
        .from("product_catalog")
        .select("id, product_id")
        .in("product_id", salesforceProductIds)

      console.log(`Found ${ourProducts?.length || 0} products in database matching ${salesforceProductIds.length} Salesforce product IDs`)

      const productIdMap = new Map<string, string>() // Maps Salesforce product_id to our UUID
      if (ourProducts) {
        ourProducts.forEach(p => {
          if (p.product_id) {
            productIdMap.set(p.product_id, p.id)
          }
        })
      }

      console.log(`Product ID map size: ${productIdMap.size}`)

      // Build assignment data
      assignmentData = []
      const productCategoryCounts = new Map<string, number>() // Track how many categories per product
      let unmatchedMappings = 0
      let unmatchedProducts = 0
      let unmatchedCategories = 0

      for (const mapping of categoryMappings) {
        const ourProductId = productIdMap.get(mapping.ProductId)
        const ourCategoryId = categoryIdMap.get(mapping.ProductCategoryId)

        if (!ourProductId) {
          unmatchedProducts++
        }
        if (!ourCategoryId) {
          unmatchedCategories++
        }

        if (ourProductId && ourCategoryId) {
          const currentCount = productCategoryCounts.get(ourProductId) || 0
          assignmentData.push({
            product_id: ourProductId,
            category_id: ourCategoryId,
            salesforce_product_id: mapping.ProductId,
            salesforce_category_id: mapping.ProductCategoryId,
            is_primary: currentCount === 0, // First category is primary
          })
          productCategoryCounts.set(ourProductId, currentCount + 1)
        } else {
          unmatchedMappings++
        }
      }

      console.log(`Built ${assignmentData.length} assignments from ${categoryMappings.length} mappings`)
      console.log(`Unmatched: ${unmatchedMappings} total (${unmatchedProducts} products, ${unmatchedCategories} categories)`)

      if (assignmentData.length > 0) {
        console.log(`Sample assignment data (first 3):`, assignmentData.slice(0, 3).map(a => ({
          product_id: a.product_id?.substring(0, 8) + '...',
          category_id: a.category_id?.substring(0, 8) + '...',
          is_primary: a.is_primary,
          salesforce_product_id: a.salesforce_product_id?.substring(0, 8) + '...',
          salesforce_category_id: a.salesforce_category_id?.substring(0, 8) + '...',
        })))
        // Delete existing Salesforce-sourced assignments for these products to avoid duplicates
        // Preserve custom category assignments (those without salesforce_category_id)
        const productIdsToUpdate = Array.from(new Set(assignmentData.map(a => a.product_id)))
        
        // Only delete assignments that have salesforce_category_id (Salesforce-sourced)
        // Custom category assignments (salesforce_category_id IS NULL) will be preserved
        // Use a more explicit filter to ensure we only delete Salesforce-sourced assignments
        const { error: deleteError } = await supabase
          .from("product_category_assignments")
          .delete()
          .in("product_id", productIdsToUpdate)
          .not("salesforce_category_id", "is", null)
        
        if (deleteError) {
          console.error("Error deleting old assignments:", deleteError)
          // Continue anyway - we'll try to insert and let unique constraint handle duplicates
        }

        // Insert new assignments
        console.log(`Attempting to insert ${assignmentData.length} assignments into product_category_assignments`)
        console.log(`First assignment sample:`, JSON.stringify(assignmentData[0], null, 2))
        
        const { data: insertedAssignments, error: assignmentError } = await supabase
          .from("product_category_assignments")
          .insert(assignmentData)
          .select("id, product_id, category_id, is_primary")

        if (assignmentError) {
          console.error("ERROR importing category mappings:", assignmentError)
          console.error("Error details:", JSON.stringify(assignmentError, null, 2))
          // Return detailed error for debugging
          return NextResponse.json({ 
            error: assignmentError.message,
            details: assignmentError,
            assignmentDataSample: assignmentData.slice(0, 2),
            assignmentDataLength: assignmentData.length
          }, { status: 500 })
        }

        console.log(`Successfully inserted ${insertedAssignments?.length || 0} assignments`)
        if (insertedAssignments && insertedAssignments.length > 0) {
          console.log(`Sample inserted assignment:`, insertedAssignments[0])
        } else {
          console.error("CRITICAL: Insert returned success but no data! This means inserts were silently ignored.")
        }
        if (insertedAssignments && insertedAssignments.length > 0) {
          const primaryCount = insertedAssignments.filter(a => a.is_primary).length
          console.log(`Of inserted assignments, ${primaryCount} are marked as primary`)
        }

        mappingsImported = assignmentData.length
        productsWithCategories = productIdsToUpdate.length

        console.log(`Starting to update primary_category_id for ${productIdsToUpdate.length} products`)

        // Verify assignments were actually inserted by querying the database
        const { data: verifyAssignments, error: verifyError } = await supabase
          .from("product_category_assignments")
          .select("id, product_id, category_id, is_primary")
          .in("product_id", productIdsToUpdate.slice(0, 10)) // Check first 10
          .eq("is_primary", true)
        
        if (verifyError) {
          console.error("Error verifying assignments:", verifyError)
        } else {
          console.log(`Verified: Found ${verifyAssignments?.length || 0} primary assignments in database for sample products`)
        }

        // Update product_catalog with primary_category_id and category name
        // Build a map of product_id -> primary assignment for efficient lookup
        const primaryAssignmentsMap = new Map<string, typeof assignmentData[0]>()
        assignmentData.forEach(assignment => {
          if (assignment.is_primary) {
            primaryAssignmentsMap.set(assignment.product_id, assignment)
          }
        })

        console.log(`Found ${primaryAssignmentsMap.size} primary assignments in memory out of ${assignmentData.length} total assignments`)
        
        if (primaryAssignmentsMap.size === 0) {
          console.error("CRITICAL: No primary assignments found! This means is_primary is not being set correctly.")
        }

        // Get all category names in one query
        const categoryIds = Array.from(new Set(assignmentData.map(a => a.category_id)))
        const { data: allCategories, error: categoriesError } = await supabase
          .from("product_categories")
          .select("id, name")
          .in("id", categoryIds)

        if (categoriesError) {
          console.error("Error fetching categories for product updates:", categoriesError)
        }

        const categoryNameMap = new Map<string, string>()
        allCategories?.forEach(cat => {
          categoryNameMap.set(cat.id, cat.name)
        })

        // Update products in batches
        let productsUpdated = 0
        let productsUpdateFailed = 0
        let productsNoPrimary = 0
        const batchSize = 100

        for (let i = 0; i < productIdsToUpdate.length; i += batchSize) {
          const batch = productIdsToUpdate.slice(i, i + batchSize)
          const updates: Array<{ id: string; primary_category_id: string; category: string }> = []

          for (const productId of batch) {
            const primaryAssignment = primaryAssignmentsMap.get(productId)
            if (primaryAssignment) {
              const categoryName = categoryNameMap.get(primaryAssignment.category_id)
              if (categoryName) {
                updates.push({
                  id: productId,
                  primary_category_id: primaryAssignment.category_id,
                  category: categoryName,
                })
              } else {
                console.warn(`Category name not found for category_id ${primaryAssignment.category_id} (product ${productId})`)
                productsUpdateFailed++
              }
            } else {
              productsNoPrimary++
            }
          }

          // Batch update products
          if (updates.length > 0) {
            console.log(`Updating ${updates.length} products in batch ${Math.floor(i / batchSize) + 1}`)
            for (const update of updates) {
              const { data: updatedProduct, error: updateError } = await supabase
                .from("product_catalog")
                .update({
                  primary_category_id: update.primary_category_id,
                  category: update.category,
                })
                .eq("id", update.id)
                .select("id, primary_category_id")
                .single()

              if (updateError) {
                console.error(`Error updating product ${update.id} with primary category ${update.primary_category_id}:`, updateError)
                productsUpdateFailed++
              } else {
                if (updatedProduct?.primary_category_id) {
                  productsUpdated++
                } else {
                  console.warn(`Product ${update.id} update returned but primary_category_id is still null`)
                  productsUpdateFailed++
                }
              }
            }
          }
        }

        console.log(`Imported ${mappingsImported} category mappings for ${productsWithCategories} products`)
        console.log(`Updated primary_category_id: ${productsUpdated} succeeded, ${productsUpdateFailed} failed, ${productsNoPrimary} no primary assignment`)
        
        // Final verification - check a few products to confirm primary_category_id was set
        if (productsUpdated > 0) {
          const { data: sampleProducts, error: sampleError } = await supabase
            .from("product_catalog")
            .select("id, sku, primary_category_id")
            .in("id", productIdsToUpdate.slice(0, 5))
            .not("primary_category_id", "is", null)
          
          if (sampleError) {
            console.error("Error verifying updated products:", sampleError)
          } else {
            console.log(`Verification: ${sampleProducts?.length || 0} out of 5 sample products have primary_category_id set`)
          }
        }
      } else {
        console.warn("No assignment data to insert - skipping product updates")
      }
    }

    console.log("Import completed successfully")

    // Get API limits after import
    let apiLimitsAfter: any = null
    try {
      apiLimitsAfter = await getApiLimits(accessToken, instanceUrl)
      totalApiCalls++
    } catch (error: any) {
      console.warn("Failed to get API limits after import:", error.message)
    }

    // Calculate API usage
    const dailyApiRequests = apiLimitsAfter?.DailyApiRequests || apiLimitsBefore?.DailyApiRequests
    const apiUsage = dailyApiRequests ? {
      used: dailyApiRequests.Max - dailyApiRequests.Remaining,
      remaining: dailyApiRequests.Remaining,
      limit: dailyApiRequests.Max,
      usedInThisImport: totalApiCalls,
    } : null

    return NextResponse.json({
      success: true,
      statistics: {
        totalProducts: products.length,
        productsImported: productData.length,
        productsWithImages,
        productsWithoutImages,
        imageMappingsFound: imageMappings.size,
        ...(importCategories && { categoriesImported }),
        ...(importMappings && { 
          mappingsImported, 
          productsWithCategories,
          // Diagnostic info
          categoryMappingsCount: categoryMappings.length,
          assignmentDataCount: assignmentData.length,
          categoryIdMapSize: importMappings ? categoryIdMap.size : 0,
        }),
        apiUsage,
      },
    })
  } catch (error: any) {
    console.error("Error in Salesforce import:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import from Salesforce" },
      { status: 500 }
    )
  }
}

