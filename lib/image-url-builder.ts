/**
 * Image URL Builder
 * Matches ProductId → ElectronicMediaId → ContentKey and builds image URLs
 */

import type { ProductMediaRow, ManagedContentRow } from './csv-parser'

const IMAGE_URL_BASE = 'https://inter-mtn.com/cms/delivery/media'

export interface ImageMapping {
  productId: string
  electronicMediaId: string | null
  contentKey: string | null
  imageUrl: string | null
}

/**
 * Build image URL mappings from ProductMedia and ManagedContent data
 */
export function buildImageMappings(
  productMediaRows: ProductMediaRow[],
  managedContentRows: ManagedContentRow[]
): Map<string, ImageMapping> {
  // Step 1: Build map from ElectronicMediaId to ContentKey
  const mediaToContent = new Map<string, string>()
  managedContentRows.forEach(row => {
    mediaToContent.set(row.id, row.contentKey)
  })

  // Step 2: Build map from ProductId to ImageMapping
  // If a product has multiple media entries, use the first one
  const productToMedia = new Map<string, ProductMediaRow>()
  productMediaRows.forEach(row => {
    if (!productToMedia.has(row.productId)) {
      productToMedia.set(row.productId, row)
    }
  })

  // Step 3: Combine to create final mappings
  const mappings = new Map<string, ImageMapping>()

  productToMedia.forEach((mediaRow, productId) => {
    const contentKey = mediaToContent.get(mediaRow.electronicMediaId) || null
    const imageUrl = contentKey ? `${IMAGE_URL_BASE}/${contentKey}` : null

    mappings.set(productId, {
      productId,
      electronicMediaId: mediaRow.electronicMediaId,
      contentKey,
      imageUrl,
    })
  })

  return mappings
}

/**
 * Get image URL for a product ID
 */
export function getImageUrlForProduct(
  productId: string,
  mappings: Map<string, ImageMapping>
): string | null {
  return mappings.get(productId)?.imageUrl || null
}

