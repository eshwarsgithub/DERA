# 🔧 SFMC Permissions Issue - SOLUTION

## What's Happening

Your SFMC connection is working (✅ OAuth token acquired, ✅ REST API connected), but:
- ❌ SOAP API returning 500 error
- ❌ Data Extensions endpoints returning 404

This means your Installed Package **doesn't have the right permissions** to access Data Extensions.

## Quick Fix (5 minutes)

### Step 1: Go Back to SFMC Installed Package

1. Log in to SFMC
2. **Setup** → **Apps** → **Installed Packages**
3. Find your "DERA Lineage Tool" package
4. Click on it to edit

### Step 2: Update API Integration Component

1. Click on your **API Integration** component
2. Make sure these permissions are **ENABLED (checked)**:

#### ✅ Required Permissions:
- **Email**:
  - ☑ Read
- **Web**:
  - ☑ Read
- **Automations**:
  - ☑ Read
  - ☑ Write (if you want to analyze automation activities)
- **Journeys**:
  - ☑ Read
- **List and Subscribers**:
  - ☑ Read
- **Data Extensions**:
  - ☑ Read
  - ☑ Write
- **File Locations**:
  - ☑ Read (optional)
- **Webhooks**:
  - ☑ Read (optional)

### ⚠️ CRITICAL:
**Make sure "Data Extensions: Read" is CHECKED!** This is the most important one.

### Step 3: Save & Test

1. Save the changes
2. Wait 30 seconds for permissions to propagate
3. Run the test script again:

```bash
cd /Users/eshwar/Desktop/DERA
node tools/test-sfmc-connection.js
```

You should now see:
```
✅ SOAP API connection successful!
   Found 50+ Data Extensions
```

### Step 4: Restart Your App

```bash
# You may need to clear the token cache
rm -rf .next/cache 2>/dev/null
npm run dev
```

Then visit: http://localhost:3000/des

## Still Not Working?

If you still see sample data after updating permissions:

### Option A: Check SOAP Permissions Explicitly

Some SFMC orgs require explicit SOAP API access. Check with your SFMC admin if SOAP API needs to be enabled separately for your business unit.

### Option B: Use Alternative Approach

If SOAP simply isn't available in your org, I can modify the code to use **only REST API** endpoints, though you'll get less detailed field information.

Would you like me to implement the REST-only fallback?

## Common Permission Issues

| Error | Missing Permission | Fix |
|-------|-------------------|------|
| SOAP 500 | SOAP API not enabled | Contact SFMC admin |
| 403 Forbidden | Data Extensions: Read | Check in API Integration |
| 404 Not Found | Wrong endpoint/permissions |Verify API base URLs |
| Empty response | Write permission needed | Add "Write" to Data Extensions |

## Debug: Current Permissions

To see what permissions your package currently has:

1. SFMC → Setup → Installed Packages
2. Click your package
3. Click API Integration component
4. Screenshot the permissions list
5. Share with me if needed

---

**Next Steps**: Update the permissions and re-run the test!
