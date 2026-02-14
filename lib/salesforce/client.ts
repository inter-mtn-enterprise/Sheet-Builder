import { createClient } from "@/lib/supabase/server"
import type {
  SalesforceToken,
  SalesforceQueryResponse,
  SalesforceApiLimits,
} from "./types"

const IMAGE_URL_BASE = 'https://inter-mtn.com/cms/delivery/media'

/**
 * Get stored Salesforce token for a user
 */
export async function getStoredToken(userId: string): Promise<{
  access_token: string
  refresh_token: string | null
  instance_url: string
  token_type: string
  expires_at: string | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("salesforce_tokens")
    .select("access_token, refresh_token, instance_url, token_type, expires_at")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Store Salesforce token for a user
 */
export async function storeToken(
  userId: string,
  token: SalesforceToken
): Promise<void> {
  const supabase = await createClient()
  
  // Calculate expires_at if expires_in is provided
  let expiresAt: Date | null = null
  if (token.expires_in) {
    expiresAt = new Date(Date.now() + token.expires_in * 1000)
  }

  const { error } = await supabase
    .from("salesforce_tokens")
    .upsert({
      user_id: userId,
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      instance_url: token.instance_url,
      token_type: token.token_type || "Bearer",
      issued_at: new Date().toISOString(),
      expires_at: expiresAt?.toISOString() || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    })

  if (error) {
    throw new Error(`Failed to store token: ${error.message}`)
  }
}

/**
 * Refresh Salesforce access token
 */
export async function refreshToken(
  userId: string,
  refreshToken: string
): Promise<SalesforceToken> {
  const clientId = process.env.SALESFORCE_CLIENT_ID
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Salesforce credentials not configured")
  }

  // Get instance URL from stored token
  const stored = await getStoredToken(userId)
  if (!stored) {
    throw new Error("No stored token found")
  }

  const tokenUrl = `${stored.instance_url}/services/oauth2/token`
  
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  
  const newToken: SalesforceToken = {
    access_token: data.access_token,
    refresh_token: refreshToken, // Refresh token doesn't change
    instance_url: stored.instance_url,
    token_type: data.token_type || "Bearer",
    issued_at: new Date().toISOString(),
    expires_in: data.expires_in,
  }

  await storeToken(userId, newToken)
  return newToken
}

/**
 * Get valid access token, refreshing if expired
 */
export async function getAccessToken(userId: string): Promise<{
  access_token: string
  instance_url: string
}> {
  const stored = await getStoredToken(userId)
  
  if (!stored) {
    throw new Error("No Salesforce token found. Please connect to Salesforce first.")
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = stored.expires_at ? new Date(stored.expires_at) : null
  const now = new Date()
  const buffer = 5 * 60 * 1000 // 5 minutes

  if (expiresAt && expiresAt.getTime() - now.getTime() < buffer) {
    // Token is expired or about to expire, refresh it
    if (!stored.refresh_token) {
      throw new Error("Token expired and no refresh token available")
    }
    
    const refreshed = await refreshToken(userId, stored.refresh_token)
    return {
      access_token: refreshed.access_token,
      instance_url: refreshed.instance_url,
    }
  }

  return {
    access_token: stored.access_token,
    instance_url: stored.instance_url,
  }
}

/**
 * Execute a SOQL query against Salesforce
 * Returns the query response and API call count (always 1 for single query)
 */
export async function query<T>(
  soql: string,
  accessToken: string,
  instanceUrl: string
): Promise<{ data: SalesforceQueryResponse<T>; apiCalls: number }> {
  const encodedQuery = encodeURIComponent(soql)
  const url = `${instanceUrl}/services/data/v58.0/query/?q=${encodedQuery}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized - token may be expired")
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded - please try again later")
    }
    const error = await response.text()
    throw new Error(`Salesforce query failed: ${error}`)
  }

  const data = await response.json()
  return { data, apiCalls: 1 }
}

/**
 * Execute a SOQL query with pagination support
 * Returns all records and the total number of API calls made
 */
export async function queryAll<T>(
  soql: string,
  accessToken: string,
  instanceUrl: string
): Promise<{ records: T[]; apiCalls: number }> {
  const allRecords: T[] = []
  let nextUrl: string | undefined = undefined
  let isFirstQuery = true
  let apiCalls = 0

  do {
    let url: string
    if (isFirstQuery) {
      const encodedQuery = encodeURIComponent(soql)
      url = `${instanceUrl}/services/data/v58.0/query/?q=${encodedQuery}`
      isFirstQuery = false
    } else if (nextUrl) {
      url = `${instanceUrl}${nextUrl}`
    } else {
      break
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized - token may be expired")
      }
      if (response.status === 429) {
        // Rate limit - wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      const error = await response.text()
      throw new Error(`Salesforce query failed: ${error}`)
    }

    apiCalls++
    const data: SalesforceQueryResponse<T> = await response.json()
    allRecords.push(...data.records)
    nextUrl = data.nextRecordsUrl

    // Small delay to avoid rate limits
    if (nextUrl) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } while (nextUrl)

  return { records: allRecords, apiCalls }
}

/**
 * Build image URL from content key
 */
export function buildImageUrl(contentKey: string | null | undefined): string | null {
  if (!contentKey) return null
  return `${IMAGE_URL_BASE}/${contentKey}`
}

/**
 * Get Salesforce API limits
 */
export async function getApiLimits(
  accessToken: string,
  instanceUrl: string
): Promise<SalesforceApiLimits> {
  const url = `${instanceUrl}/services/data/v58.0/limits`
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized - token may be expired")
    }
    const error = await response.text()
    throw new Error(`Failed to get API limits: ${error}`)
  }

  return response.json()
}

