import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getStoredToken } from "@/lib/salesforce/client"
import crypto from "crypto"

/**
 * GET /api/salesforce/auth
 * Initiate OAuth flow or check token status
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is manager
    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!currentUser || currentUser.role !== "manager") {
      return NextResponse.json(
        { error: "Only managers can connect to Salesforce" },
        { status: 403 }
      )
    }

    // Check if user has existing valid token
    const stored = await getStoredToken(user.id)
    const hasValidToken = stored && stored.expires_at && new Date(stored.expires_at) > new Date()

    // If has valid token, return status
    if (hasValidToken) {
      return NextResponse.json({
        connected: true,
        instance_url: stored.instance_url,
      })
    }

    // Otherwise, initiate OAuth flow
    const clientId = process.env.SALESFORCE_CLIENT_ID
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI || process.env.NEXT_PUBLIC_SITE_URL + "/api/salesforce/callback"
    const instanceUrl = process.env.SALESFORCE_INSTANCE_URL

    if (!clientId || !redirectUri || !instanceUrl) {
      return NextResponse.json(
        { error: "Salesforce configuration missing" },
        { status: 500 }
      )
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex")
    
    // Generate PKCE code_verifier and code_challenge (REQUIRED by this Connected App)
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

    const scopes = [
      "api",
      "refresh_token",
      "offline_access",
    ].join(" ")

    // Build OAuth URL with PKCE (required by Connected App)
    const authUrl = `${instanceUrl}/services/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`
    
    // Store code_verifier in a cookie for retrieval in callback
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('sf_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error: any) {
    console.error("Salesforce auth error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/salesforce/auth
 * Check token status for current user
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

    const stored = await getStoredToken(user.id)
    
    if (!stored) {
      return NextResponse.json({ connected: false })
    }

    const expiresAt = stored.expires_at ? new Date(stored.expires_at) : null
    const isExpired = expiresAt ? expiresAt <= new Date() : false

    return NextResponse.json({
      connected: !isExpired,
      instance_url: stored.instance_url,
      expires_at: stored.expires_at,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check token status" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/salesforce/auth
 * Revoke token and delete from database
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get stored token to revoke it
    const stored = await getStoredToken(user.id)
    
    if (stored && stored.refresh_token) {
      // Revoke token in Salesforce
      const revokeUrl = `${stored.instance_url}/services/oauth2/revoke`
      try {
        await fetch(revokeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `token=${encodeURIComponent(stored.refresh_token)}`,
        })
      } catch (error) {
        // Continue even if revocation fails
        console.error("Failed to revoke token in Salesforce:", error)
      }
    }

    // Delete token from database
    const { error } = await supabase
      .from("salesforce_tokens")
      .delete()
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to revoke token" },
      { status: 500 }
    )
  }
}

