/**
 * Enhanced CSV Parser Utility
 * Handles quoted fields, multiple formats, and validates data
 */

export interface ParsedCSVRow {
  [key: string]: string
}

export function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    return []
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))

  const data: ParsedCSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    if (values.length === 0) continue

    const row: ParsedCSVRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^"|"$/g, '') || ''
    })

    data.push(row)
  }

  return data
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add the last field
  values.push(current)

  return values
}

/**
 * Parse Products CSV (ID, Name, SKU, ProductCode format)
 */
export interface ProductRow {
  id: string
  name: string
  sku: string
  productCode: string
}

export function parseProductsCSV(text: string): ProductRow[] {
  const rows = parseCSV(text)
  
  if (rows.length === 0) {
    return []
  }

  // Get all possible column name variations
  const firstRow = rows[0]
  const allKeys = Object.keys(firstRow)

  // Try to find ID column (could be first column or named column)
  const findColumn = (variations: string[], fallbackIndex?: number): string => {
    for (const key of allKeys) {
      const lowerKey = key.toLowerCase()
      for (const variation of variations) {
        if (lowerKey === variation.toLowerCase() || lowerKey.includes(variation.toLowerCase())) {
          return key
        }
      }
    }
    // If not found by name, try by position (first column = ID, second = Name, third = SKU, fourth = ProductCode)
    if (fallbackIndex !== undefined && allKeys[fallbackIndex]) {
      return allKeys[fallbackIndex]
    }
    return ''
  }

  const idKey = findColumn(['id', 'productid', 'product_id'], 0)
  const nameKey = findColumn(['name', 'productname', 'product_name'], 1)
  const skuKey = findColumn(['sku', 'stockkeepingunit', 'stock_keeping_unit', 'productsku', 'product_sku'], 2)
  const productCodeKey = findColumn(['productcode', 'product_code', 'productcode2'], 3)
  
  const products = rows
    .map((row) => {
      const id = idKey ? (row[idKey] || '') : ''
      const name = nameKey ? (row[nameKey] || '') : ''
      const sku = skuKey ? (row[skuKey] || '') : ''
      const productCode = productCodeKey ? (row[productCodeKey] || '') : ''

      if (!id || !sku) return null

      return {
        id: id.trim(),
        name: name.trim(),
        sku: sku.trim(),
        productCode: productCode.trim(),
      }
    })
    .filter((row): row is ProductRow => row !== null)
  
  return products
}

/**
 * Parse ProductMediaextract CSV
 */
export interface ProductMediaRow {
  productId: string
  electronicMediaId: string
}

export function parseProductMediaCSV(text: string): ProductMediaRow[] {
  const rows = parseCSV(text)
  
  return rows
    .map(row => {
      const productId = row['ProductId'] || row['productId'] || ''
      const electronicMediaId = row['ElectronicMediaId'] || row['electronicMediaId'] || ''

      if (!productId || !electronicMediaId) return null

      return {
        productId: productId.trim(),
        electronicMediaId: electronicMediaId.trim(),
      }
    })
    .filter((row): row is ProductMediaRow => row !== null)
}

/**
 * Parse ManagedContentextract CSV
 */
export interface ManagedContentRow {
  id: string
  contentKey: string
}

export function parseManagedContentCSV(text: string): ManagedContentRow[] {
  const rows = parseCSV(text)
  
  return rows
    .map(row => {
      const id = row['Id'] || row['id'] || ''
      const contentKey = row['ContentKey'] || row['contentKey'] || ''

      if (!id || !contentKey) return null

      return {
        id: id.trim(),
        contentKey: contentKey.trim(),
      }
    })
    .filter((row): row is ManagedContentRow => row !== null)
}

