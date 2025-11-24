# ✅ SFMC Sync Setup Checklist

Use this checklist to track your progress setting up SFMC sync.

---

## 📋 Pre-Setup

- [ ] I have admin/elevated access to Salesforce Marketing Cloud
- [ ] I know my SFMC login URL (e.g., `https://mc.s11.exacttarget.com/...`)
- [ ] My dev environment is running (`npm run dev` works)
- [ ] I can see sample data at http://localhost:3000/des

---

## 🔧 SFMC Configuration

### Step 1: Create Installed Package

- [ ] Logged into SFMC
- [ ] Navigated to **Setup → Apps → Installed Packages**
- [ ] Clicked **"New"** to create a package
- [ ] Named it: `DERA Lineage Tool` (or similar)
- [ ] Added description

### Step  2: Add API Integration Component

- [ ] Clicked **"Add Component"**
- [ ] Selected **"API Integration"**
- [ ] Chose **"Server-to-Server"** integration type
- [ ] Checked the following permissions:
  - [ ] **Data Extensions** → Read
  - [ ] **Data Extensions** → Write (optional but recommended)
  - [ ] **Automation** → Read
  - [ ] **Journeys** → Read
  - [ ] **Assets** → Read
  - [ ] **Webhooks** → Read (optional)
- [ ] Saved the component

### Step 3: Copy Credentials

- [ ] Copied **Client ID** to a secure location
- [ ] Copied **Client Secret** to a secure location
- [ ] Noted down **Authentication Base URI**
- [ ] Noted down **REST Base URI**
- [ ] Noted down **SOAP Base URI**

### Step 4: Find Additional Info

- [ ] Found my **MID (Member ID)** in SFMC
  - Location: **Setup → Settings → My Organization**
  - Usually a 9-10 digit number
- [ ] Confirmed my SFMC subdomain from the URL

---

## 💻 Local Environment Setup

### Step 5: Create Environment File

- [ ] Opened terminal in project directory: `/Users/eshwar/Desktop/DERA`
- [ ] Created `.env.local` file:
  ```bash
  cp .env.example .env.local
  ```

### Step 6: Update Environment Variables

Open `.env.local` and verify these are set:

- [ ] `SFMC_CLIENT_ID` = (paste your Client ID)
- [ ] `SFMC_CLIENT_SECRET` = (paste your Client Secret)
- [ ] `SFMC_AUTH_BASE_URL` = `https://[YOUR_SUBDOMAIN].auth.marketingcloudapis.com`
- [ ] `SFMC_REST_BASE_URL` = `https://[YOUR_SUBDOMAIN].rest.marketingcloudapis.com`
- [ ] `SFMC_SOAP_BASE_URL` = `https://[YOUR_SUBDOMAIN].soap.marketingcloudapis.com`
- [ ] `SFMC_ACCOUNT_ID` = (your MID number)

---

## 🧪 Testing & Validation

### Step 7: Run Connection Test

- [ ] Ran test script:
  ```bash
  node tools/test-sfmc-connection.js
  ```

#### Expected Results:
- [ ] ✅ All required variables are set
- [ ] ✅ Token acquired successfully
- [ ] ✅ REST API connection successful
- [ ] ✅ SOAP API connection successful
- [ ] ✅ Found Data Extensions (count displayed)
- [ ] ✅ Sample DE names shown

#### If Test Failed:
- [ ] Checked error message in terminal
- [ ] Verified all credentials are correct (no typos)
- [ ] Confirmed Installed Package is **enabled** in SFMC
- [ ] Double-checked subdomain URLs match my SFMC instance
- [ ] Consulted troubleshooting section in `SFMC_SYNC_QUICKSTART.md`

### Step 8: Restart Dev Server

- [ ] Stopped current dev server (Ctrl+C)
- [ ] Started fresh:
  ```bash
  npm run dev
  ```
- [ ] Confirmed server started successfully

### Step 9: Verify in Browser

- [ ] Opened http://localhost:3000/des
- [ ] Confirmed I see **real SFMC Data Extensions** (not just "Contacts" and "Leads_Archive" sample data)
- [ ] Verified DE names match what I see in SFMC
- [ ] Checked that field counts/types look correct
- [ ] Risk scores are calculated and displayed

---

## 🎯 Feature Validation

### Data Extensions Page (`/des`)
- [ ] Can see all my SFMC Data Extensions
- [ ] Search functionality works
- [ ] Sorting works (by name, by risk score)
- [ ] Risk scores display correctly
- [ ] PII detection works (Email, Phone, etc.)
- [ ] "Analyze" button works

### Mind Map Page (`/mindmap`)
- [ ] Can select a Data Extension
- [ ] Mind map generates successfully
- [ ] See upstream sources (imports, queries)
- [ ] See downstream consumers (journeys, automations)
- [ ] Graph is interactive (can zoom, pan)
- [ ] Nodes show correct relationships

### Lineage View
- [ ] Lineage data pulls from real SFMC
- [ ] Journey connections appear
- [ ] Automation relationships shown
- [ ] Query activities linked

---

## 🔒 Security Verification

- [ ] `.env.local` is in `.gitignore` (verify: `cat .gitignore | grep env.local`)
- [ ] NOT committing `.env.local` to Git
- [ ] Client Secret is kept secure
- [ ] Only granted minimum required permissions in SFMC
- [ ] Understood that credentials are server-side only (never sent to browser)

---

## 📊 Success Criteria

### ✅ You're done when:

- [x] Test script passes all checks
- [x] Real SFMC Data Extensions appear in UI
- [x] Mind map generates with real data
- [x] Risk scores reflect actual PII in fields
- [x] Can search and filter DEs
- [x] Lineage shows real automations/journeys

### 🎉 Congratulations!

If all boxes are checked, your SFMC account is now fully synced with DERA!

---

## 📝 Notes & Issues

Use this space to track any issues or notes during setup:

```
Date: _______________

Issues encountered:


Solutions applied:


Additional notes:


```

---

## 🆘 Need Help?

If you're stuck, consult these resources:

1. **Quick Start**: `SFMC_SYNC_QUICKSTART.md`
2. **Architecture**: `docs/SFMC_ARCHITECTURE.md`
3. **Detailed Guide**: `docs/SFMC_SETUP_GUIDE.md`
4. **Test Script**: `node tools/test-sfmc-connection.js`

Common issues:
- **401 error**: Check Client ID/Secret
- **403 error**: Check API permissions
- **Sample data still showing**: Restart dev server, check `.env.local` exists
- **Empty DE list**: Check SOAP permissions, verify MID is correct

---

**Last Updated**: `date +%Y-%m-%d`
