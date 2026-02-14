import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { storeToken } from "@/lib/salesforce/client"
import type { SalesforceToken } from "@/lib/salesforce/types"

/**
 * GET /api/salesforce/callback
 * Handle OAuth callback from Salesforce
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      console.error("OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        new URL(`/banners?error=salesforce_auth_failed&details=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/banners?error=no_code", request.url)
      )
    }

    // Exchange authorization code for tokens
    const clientId = process.env.SALESFORCE_CLIENT_ID
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
    // CRITICAL: redirect_uri must match EXACTLY what was used in authorization request
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI || process.env.NEXT_PUBLIC_SITE_URL + "/api/salesforce/callback"
    let instanceUrl = process.env.SALESFORCE_INSTANCE_URL

    if (!clientId || !redirectUri || !instanceUrl) {
      return NextResponse.redirect(
        new URL("/banners?error=config_missing", request.url)
      )
    }

    // Convert lightning.force.com to my.salesforce.com for token endpoint
    // Token endpoint should use My Domain URL, not Lightning URL
    if (instanceUrl.includes('lightning.force.com')) {
      instanceUrl = instanceUrl.replace('lightning.force.com', 'my.salesforce.com')
    }
    
    // Ensure instance URL doesn't have trailing slash for token endpoint
    instanceUrl = instanceUrl.replace(/\/$/, '')
    
    // Get code_verifier from cookie (set during auth initiation)
    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('sf_code_verifier')?.value || null
    
    const tokenUrl = `${instanceUrl}/services/oauth2/token`
    
    // When PKCE is required, Connected App is typically configured as "Public Client"
    // Public Clients do NOT use client_secret - only code_verifier
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    })
    
    // Add code_verifier (required for PKCE, replaces client_secret for public clients)
    if (!codeVerifier) {
      // If no code_verifier, this is an error - PKCE is required
      return NextResponse.redirect(
        new URL("/banners?error=missing_code_verifier", request.url)
      )
    }
    params.append('code_verifier', codeVerifier)
    
    const requestBody = params.toString()
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON, keep as text
        errorData = { raw: errorText }
      }
      
      // Some Connected Apps require BOTH client_secret AND code_verifier
      // Try again with client_secret included if we have it
      // Retry on both 'unsupported_grant_type' and 'invalid_client' errors
      if (clientSecret && !params.has('client_secret') && (errorData.error === 'unsupported_grant_type' || errorData.error === 'invalid_client')) {
        params.append('client_secret', clientSecret)
        const retryBody = params.toString()
        
        const retryResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: retryBody,
        })
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          const token: SalesforceToken = {
            access_token: retryData.access_token,
            refresh_token: retryData.refresh_token,
            instance_url: retryData.instance_url || instanceUrl,
            token_type: retryData.token_type || "Bearer",
            issued_at: new Date().toISOString(),
            expires_in: retryData.expires_in,
          }
          await storeToken(user.id, token)
          return NextResponse.redirect(
            new URL("/banners?success=salesforce_connected", request.url)
          )
        } else {
          const retryErrorText = await retryResponse.text()
          let retryErrorData: any = {}
          try {
            retryErrorData = JSON.parse(retryErrorText)
          } catch {
            retryErrorData = { raw: retryErrorText }
          }
        }
      }
      
      console.error("Token exchange failed:", errorText)
      return NextResponse.redirect(
        new URL("/banners?error=token_exchange_failed", request.url)
      )
    }

    const data = await response.json()

    const token: SalesforceToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      instance_url: data.instance_url || instanceUrl,
      token_type: data.token_type || "Bearer",
      issued_at: new Date().toISOString(),
      expires_in: data.expires_in,
    }

    // Store token in database
    await storeToken(user.id, token)

    // Redirect to banners page with success message
    return NextResponse.redirect(
      new URL("/banners?success=salesforce_connected", request.url)
    )
  } catch (error: any) {
    console.error("Callback error:", error)
    return NextResponse.redirect(
      new URL("/banners?error=callback_failed", request.url)
    )
  }
}

