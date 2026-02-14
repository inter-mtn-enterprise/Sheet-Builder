# Salesforce Integration Setup Guide

This guide explains how to set up the Salesforce integration for product import.

## Prerequisites

1. A Salesforce org with API access enabled
2. User account with:
   - API Enabled permission
   - Read access to Product2, ProductMedia, and ManagedContent objects
   - Commerce Cloud permissions (if using Commerce Cloud APIs)

## Step 1: Create Connected App in Salesforce

1. Navigate to **Setup** → **App Manager** → **New Connected App**
2. Fill in the basic information:
   - **Connected App Name**: `Banner Production PWA`
   - **API Name**: `Banner_Production_PWA`
   - **Contact Email**: Your email address
3. Enable **OAuth Settings**:
   - **Callback URL**: 
     - Production: `https://your-vercel-app.vercel.app/api/salesforce/callback`
     - Local: `http://localhost:3000/api/salesforce/callback`
   - **Selected OAuth Scopes**:
     - `Access and manage your data (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
     - If using Commerce Cloud: `ccapi`, `ccapi_product_read`, `ccapi_content_read`
4. **Save** and note:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret)
   - Your **Salesforce instance URL** (e.g., `https://yourinstance.salesforce.com`)

## Step 2: Configure Environment Variables

Add the following environment variables to your Vercel project (or `.env.local` for local development):

```bash
SALESFORCE_INSTANCE_URL=https://yourinstance.salesforce.com
SALESFORCE_CLIENT_ID=your_connected_app_consumer_key
SALESFORCE_CLIENT_SECRET=your_connected_app_consumer_secret
SALESFORCE_REDIRECT_URI=https://your-vercel-app.vercel.app/api/salesforce/callback
```

**For Local Development** (`.env.local`):
```bash
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/callback
```

## Step 3: Run Database Migration

Run the migration file in your Supabase SQL editor:

```bash
supabase/migrations/009_salesforce_tokens.sql
```

Or apply it through the Supabase dashboard.

## Step 4: Test the Integration

1. Log in as a **manager** user
2. Navigate to the **Banners** page
3. Click **"Connect to Salesforce"** in the Salesforce import section
4. Complete the OAuth flow in Salesforce
5. Once connected, click **"Import Products from Salesforce"**
6. Verify products are imported correctly

## Troubleshooting

### "Not connected to Salesforce" error
- Ensure you've completed the OAuth flow
- Check that tokens are stored in the `salesforce_tokens` table
- Verify environment variables are set correctly

### "Only managers can import from Salesforce" error
- Ensure your user role is set to `"manager"` in the `users` table
- Only users with manager role can access Salesforce import

### Import fails with "No active products found"
- Verify you have active Product2 records in Salesforce
- Check that the authenticated user has read access to Product2

### Rate limit errors
- Salesforce has API rate limits
- Wait a few minutes and try again
- Consider implementing batch processing for large imports

## Security Notes

- OAuth tokens are stored in the database with Row Level Security (RLS)
- Each user can only access their own tokens
- Tokens are automatically refreshed when expired
- Consider encrypting tokens in production for additional security

