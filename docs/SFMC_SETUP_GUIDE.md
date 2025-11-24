# SFMC Integration Setup Guide

This guide will help you sync your Salesforce Marketing Cloud (SFMC) account with your DERA project.

## Step 1: Create an Installed Package in SFMC

1. **Log in to Salesforce Marketing Cloud**
   - Go to Setup → Apps → Installed Packages

2. **Create a New Package**
   - Click "New" to create a new package
   - Name it something like "DERA Lineage Tool"
   - Description: "Data Extension Lineage and Risk Analysis"

3. **Add Component: API Integration**
   - Click "Add Component" → "API Integration"
   - Integration Type: Select "Server-to-Server"
   - Permissions needed (check these boxes):
     - **Data Extensions**: Read, Write
     - **Automation**: Read
     - **Journeys**: Read
     - **Assets**: Read
     - **Webhooks**: Read

4. **Save and Get Credentials**
   - After saving, you'll see:
     - **Client ID**
     - **Client Secret**
     - **Authentication Base URI**
     - **REST Base URI** 
     - **SOAP Base URI**

## Step 2: Find Your Subdomain

Your SFMC subdomain is typically visible in your SFMC URL. For example:
- If your SFMC URL is: `https://mc.s11.exacttarget.com/...`
- Your subdomain is: `mc.s11.exacttarget.com`
- Your auth URL would be: `https://mc11a1zyzy4s-q40y5mqdnly.auth.marketingcloudapis.com`

**Common Stack Subdomains:**
- Stack 1: `mc.s1.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`
- Stack 4: `mc.s4.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`
- Stack 6: `mc.s6.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`
- Stack 7: `mc.s7.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`
- Stack 10: `mc.s10.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`
- Stack 11: `mc.s11.exacttarget.com` → `mcXXXXXX-XXXXX.auth.marketingcloudapis.com`

## Step 3: Create Your `.env.local` File

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace the SFMC values:
   ```env
   SFMC_CLIENT_ID=abc123xyz456
   SFMC_CLIENT_SECRET=def789ghi012
   SFMC_AUTH_BASE_URL=https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com
   SFMC_REST_BASE_URL=https://YOUR_SUBDOMAIN.rest.marketingcloudapis.com
   SFMC_SOAP_BASE_URL=https://YOUR_SUBDOMAIN.soap.marketingcloudapis.com
   SFMC_ACCOUNT_ID=YOUR_MID_OR_BU_ID
   ```

3. Replace:
   - `YOUR_SUBDOMAIN` with your actual SFMC subdomain
   - `SFMC_CLIENT_ID` with your Client ID from the Installed Package
   - `SFMC_CLIENT_SECRET` with your Client Secret
   - `SFMC_ACCOUNT_ID` with your Member ID (MID) - usually visible in SFMC Setup

## Step 4: Test the Connection

After setting up your `.env.local` file:

1. Restart your dev server:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. Navigate to your DERA app at `http://localhost:3000`

3. Go to the **Data Extensions** page

4. If configured correctly, you should see your real SFMC Data Extensions instead of sample data!

## Step 5: Verify the Sync

The application will:
- ✅ Fetch all Data Extensions via SOAP API
- ✅ Retrieve field names and data types for each DE
- ✅ Display them in the Data Extensions table
- ✅ Allow you to analyze lineage for each DE

## Troubleshooting

### Error: "SFMC env not configured"
- Make sure your `.env.local` file exists in the project root
- Verify all SFMC_* variables are set

### Error: "SFMC token error 401"
- Check your Client ID and Client Secret are correct
- Verify the Installed Package is enabled in SFMC

### Error: "SFMC token error 403" 
- Check the API Integration permissions
- Ensure you've granted read access to Data Extensions

### No Data Extensions Showing
- Open browser console (F12) and check for errors
- The app falls back to sample data if the API fails
- Verify your SFMC account has Data Extensions

### Finding Your Subdomain
If you're unsure of your subdomain:
1. Log in to SFMC
2. Look at the URL in your browser
3. The subdomain is usually in the format: `mcXXXXXX-XXXXX`
4. Or check the Installed Package page - it often shows the full URLs

## Security Notes

- ⚠️ **Never commit `.env.local` to Git** (it's already in `.gitignore`)
- 🔒 Keep your Client Secret secure
- 🔐 Only grant the minimum required permissions
- 📝 Rotate credentials periodically

## Need Help?

Based on the screenshot you provided, it looks like you have access to an SFMC instance with many Data Extensions. Once you complete this setup, those DEs will automatically sync to your DERA application!
