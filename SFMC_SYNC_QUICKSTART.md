# 🔄 SFMC Sync Quick Start Guide

This guide will help you sync your Salesforce Marketing Cloud (SFMC) account with your DERA project in **5 easy steps**.

---

## 📋 Prerequisites

- Access to your Salesforce Marketing Cloud account
- Admin or elevated permissions to create Installed Packages
- Node.js and npm installed locally

---

## 🚀 Quick Setup (5 Steps)

### **Step 1: Create `.env.local` File**

In your project root (`/Users/eshwar/Desktop/DERA`), create a `.env.local` file:

```bash
cp .env.example .env.local
```

### **Step 2: Set Up SFMC Installed Package**

1. **Log in to SFMC** → Go to **Setup** → **Apps** → **Installed Packages**

2. **Click "New"** to create a new package:
   - **Name**: `DERA Lineage Tool`
   - **Description**: `Data Extension Lineage and Risk Analysis`

3. **Add Component** → **API Integration**
   - **Integration Type**: `Server-to-Server`
   
4. **Check these permissions**:
   - ✅ **Data Extensions**: Read, Write
   - ✅ **Automation**: Read  
   - ✅ **Journeys**: Read
   - ✅ **Assets**: Read
   - ✅ **Webhooks**: Read

5. **Save** and copy these values:
   - Client ID
   - Client Secret  
   - Authentication Base URI
   - REST Base URI
   - SOAP Base URI

### **Step 3: Find Your SFMC Subdomain & MID**

Your subdomain is in the SFMC URL. For example:
- If your URL is: `https://mc.s11.exacttarget.com/cloud/...`
- Your API endpoints might be: `https://mcXXXXXX-XXXXX.auth.marketingcloudapis.com`

**To find your MID (Member ID):**
- In SFMC, go to **Setup** → **Settings** → **My Organization**
- Look for "MID" - it's usually a 9-10 digit number (e.g., `514006027`)

### **Step 4: Update `.env.local`**

Open `.env.local` and replace the SFMC values:

```env
# Keep these as-is
NEXT_PUBLIC_BASE_URL=http://localhost:3000
AUTH_DISABLED=true
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dera?schema=public

# 🔥 UPDATE THESE VALUES FROM STEP 2 & 3:
SFMC_CLIENT_ID=your_actual_client_id_from_installed_package
SFMC_CLIENT_SECRET=your_actual_client_secret_from_installed_package
SFMC_AUTH_BASE_URL=https://mcXXXXXX-XXXXX.auth.marketingcloudapis.com
SFMC_REST_BASE_URL=https://mcXXXXXX-XXXXX.rest.marketingcloudapis.com
SFMC_SOAP_BASE_URL=https://mcXXXXXX-XXXXX.soap.marketingcloudapis.com
SFMC_ACCOUNT_ID=514006027
```

**⚠️ Important:**
- Replace `mcXXXXXX-XXXXX` with your actual subdomain
- Replace the Client ID and Secret with your actual values
- Replace the Account ID with your actual MID

### **Step 5: Test Your Connection**

Run the test script to verify everything works:

```bash
node tools/test-sfmc-connection.js
```

**Expected output:**
```
✅ All required variables are set!
🔄 Testing SFMC connection...
✅ Token acquired successfully!
✅ REST API connection successful!
✅ SOAP API connection successful!
   Found 50+ Data Extensions

🎉 SFMC CONNECTION TEST SUCCESSFUL!
```

---

## ✨ View Your SFMC Data

Once the test passes, restart your dev server:

```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

Then open your browser to:
- **Data Extensions**: http://localhost:3000/des
- **Mind Map**: http://localhost:3000/mindmap

You should now see **your actual SFMC Data Extensions** instead of sample data! 🎉

---

## 🎯 What Gets Synced?

Your DERA app will now pull real data from SFMC:

| Feature | SFMC Source | What You Get |
|---------|-------------|--------------|
| **Data Extensions** | SOAP API | All DEs with fields and types |
| **Journeys** | REST API | Journey names and IDs |
| **Automations** | REST API | Automation activities |
| **Query Activities** | REST API | SQL queries and targets |
| **Cloud Pages** | Assets API | Web pages using DEs |
| **Imports** | REST API | Import definitions |
| **Exports** | REST API | Export activities |

---

## 🔍 How It Works

1. **On Page Load**: Your app calls `/api/de/inventory`
2. **API Route**: Calls `fetchDataExtensions()` from `sfmcClient.ts`
3. **SFMC Client**:
   - Checks if `SFMC_CLIENT_ID` is set
   - If **YES**: Fetches real data via SFMC APIs
   - If **NO**: Returns sample data
4. **PII Scanning**: Each field is scanned for PII (Email, Phone, DOB, etc.)
5. **Risk Scoring**: Computes risk score based on PII and usage
6. **Display**: Shows in the UI with risk scores and statuses

---

## 🛠️ Troubleshooting

### ❌ "SFMC env not configured"
**Solution**: Make sure `.env.local` exists and all `SFMC_*` variables are set

### ❌ "Token error 401: Unauthorized"  
**Solution**: 
- Verify your Client ID and Secret are correct
- Check that the Installed Package is enabled in SFMC
- Make sure you copied the values correctly (no extra spaces)

### ❌ "Token error 403: Forbidden"
**Solution**:
- Check API Integration permissions in SFMC
- Ensure "Data Extensions: Read" is checked
- Try adding "Write" permission as well

### ⚠️ Still seeing sample data after setup
**Solution**:
- Check browser console (F12) for errors
- Verify the test script passes
- Make sure you restarted the dev server after updating `.env.local`
- Check server logs for error messages

### 🔍 Can't find your subdomain?
**Solution**:
1. Log in to SFMC
2. Check the URL in your browser (e.g., `mc.s11.exacttarget.com`)
3. Or look in Setup → Installed Packages → Your API Integration
4. The full URLs are usually shown there

---

## 📚 Additional Resources

- **Full Setup Guide**: See `docs/SFMC_SETUP_GUIDE.md` for detailed instructions
- **SFMC API Docs**: https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/apis-overview.html
- **Test Script**: Run `node tools/test-sfmc-connection.js` anytime

---

## 🔒 Security Best Practices

- ✅ `.env.local` is already in `.gitignore` - never commit it!
- ✅ Keep your Client Secret secure
- ✅ Only grant minimum required API permissions
- ✅ Rotate credentials periodically
- ✅ Use environment-specific credentials (dev vs. prod)

---

## 🎉 Success!

Once setup is complete, your DERA app will:
- ✅ Display all your SFMC Data Extensions
- ✅ Show real field names and data types
- ✅ Calculate actual PII risk scores
- ✅ Generate lineage maps from real automations and journeys
- ✅ Identify orphaned Data Extensions
- ✅ Track data flow across your SFMC org

**You're all set!** 🚀
