# 🎯 SFMC Sync Complete Guide

## What You're Setting Up

You're connecting your **DERA (Data Extension Relationship Analyzer)** application to your **Salesforce Marketing Cloud (SFMC)** account to:

✅ Pull **real** Data Extensions from SFMC
✅ Analyze **actual** fields and data types  
✅ Calculate **real** PII risk scores
✅ Map **actual** lineage (Journeys, Automations, Queries)
✅ Identify **real** orphaned Data Extensions

Currently, your app shows **sample data**. After this setup, it will show **your live SFMC data**!

---

## 📸 What You Showed Me

Based on your screenshots:

**SFMC Account (Screenshot 1)**
- You have access to an SFMC instance
- Multiple Data Extensions visible (ActEZ, AuditFilter, BonT, Columns, etc.)
- You can see the Data Extensions interface in SFMC

**DERA App (Screenshot 2)**  
- Currently showing only 2 sample DEs: "Contacts" and "Leads_Archive"
- Risk scores are placeholder values (84, 60)
- Status shows "Active" for both

**Your Goal**: Sync the real DEs from Screenshot 1 into the app shown in Screenshot 2!

---

## 🗺️ Roadmap (Choose Your Path)

### Path A: "Just Tell Me What To Do" ⚡
**Follow this file**: `SFMC_SYNC_QUICKSTART.md`
- 5 simple steps
- No technical details
- Get it done in ~15 minutes

### Path B: "I Want to Understand Everything" 🧠
1. Read `docs/SFMC_ARCHITECTURE.md` - See how it works
2. Follow `docs/SFMC_SETUP_GUIDE.md` - Detailed walkthrough  
3. Use `SFMC_SETUP_CHECKLIST.md` - Track progress

### Path C: "I'm Having Issues" 🔧
1. Run `node tools/test-sfmc-connection.js`
2. Check error messages
3. Consult troubleshooting in any of the guides

---

## 📁 File Reference

Your repo now has these helpful files:

```
DERA/
├── README.md                          # Updated with SFMC sync info
├── SFMC_SYNC_QUICKSTART.md           # ⭐ START HERE - Quick setup
├── SFMC_SETUP_CHECKLIST.md           # Track your progress
├── .env.example                       # Template for env variables
├── .env.local                         # ⚠️ YOU CREATE THIS (gitignored)
│
├── docs/
│   ├── SFMC_SETUP_GUIDE.md           # Detailed setup instructions
│   └── SFMC_ARCHITECTURE.md          # How the sync works
│
├── tools/
│   └── test-sfmc-connection.js       # Test your SFMC credentials
│
└── src/lib/
    └── sfmcClient.ts                  # The actual SFMC API client
```

---

## 🎬 What Happens After Setup

### Before (Now)
```
/des page
  └── Shows: "Contacts", "Leads_Archive" (sample)
  └── Risk scores: Fake/demo values
  └── Fields: Made up examples
```

### After (Once Configured)
```
/des page
  └── Shows: ALL your real SFMC Data Extensions
              (ActEZ, AuditFilter, BonT, Columns, ClickSales, 
               Copy_of_Northersern, CoppeCommari, etc.)
  └── Risk scores: Calculated from YOUR actual fields
  └── Fields: Real field names/types from SFMC
  └── PII detection: Based on YOUR actual data
  └── Lineage: Maps YOUR automations and journeys
```

---

## 🔐 What You'll Need from SFMC

To complete this setup, you'll create an **Installed Package** in SFMC and get:

1. **Client ID** (like `abc123xyz456...`)
2. **Client Secret** (keep this secure!)
3. **Authentication Base URL** (like `https://mcXXXX.auth.marketingcloudapis.com`)
4. **REST Base URL** (like `https://mcXXXX.rest.marketingcloudapis.com`)
5. **SOAP Base URL** (like `https://mcXXXX.soap.marketingcloudapis.com`)
6. **Account ID / MID** (your Member ID, usually 9-10 digits)

---

## ⏱️ Time Estimates

| Task | Time Required |
|------|--------------|
| Create SFMC Installed Package | 5-10 minutes |
| Copy credentials & find URLs | 5 minutes |
| Create `.env.local` file | 2 minutes |
| Test connection | 1 minute |
| Restart dev server | 30 seconds |
| **Total** | **~15-20 minutes** |

---

## 🚨 Common Pitfalls (Avoid These!)

❌ **Don't commit `.env.local` to Git** - It's already in `.gitignore`, keep it that way!
❌ **Don't use `.env`** - Use `.env.local` specifically (Next.js convention)
❌ **Don't forget to restart** - Changes to `.env.local` require a server restart
❌ **Don't use placeholder values** - Replace ALL the `your_*` values
❌ **Don't skip permissions** - Make sure to check "Data Extensions: Read" at minimum

---

## 🎓 Understanding the Architecture (Optional)

If you're curious how this works:

```
Your Browser
    ↓ (visits /des)
Next.js Server (DERA)
    ↓ (calls /api/de/inventory)
sfmcClient.ts
    ↓ (OAuth 2.0 authentication)
SFMC Auth Server
    ↓ (returns access token)
sfmcClient.ts
    ↓ (uses token to call SOAP API)
SFMC SOAP Service
    ↓ (returns Data Extension metadata)
PII Scanner + Risk Engine
    ↓ (analyzes fields, computes scores)
JSON Response
    ↓
Your Browser (shows table)
```

For the full architecture, see `docs/SFMC_ARCHITECTURE.md`.

---

## ✅ Success Criteria

You'll know you're successful when:

1. ✅ Test script passes: `node tools/test-sfmc-connection.js`
2. ✅ Real SFMC DEs appear at http://localhost:3000/des
3. ✅ DE count matches (or is close to) what you see in SFMC
4. ✅ Field names/types are accurate
5. ✅ Risk scores are calculated from real PII
6. ✅ Mind map shows real automations/journeys

---

## 🆘 Get Help

### If You're Stuck

**First**: Run the test script
```bash
node tools/test-sfmc-connection.js
```

**Read the error message carefully** - it usually tells you exactly what's wrong!

**Common Errors**:

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `.env.local` not found | File doesn't exist | Create it: `cp .env.example .env.local` |
| 401 Unauthorized | Wrong Client ID/Secret | Double-check credentials |
| 403 Forbidden | Missing permissions | Add "Data Extensions: Read" in SFMC |
| Connection refused | Wrong URL | Verify subdomain matches your SFMC |
| Still seeing sample data | Server not restarted | Restart: `npm run dev` |

---

## 🎉 Next Steps After Setup

Once SFMC is synced, you can:

1. **Explore Data Extensions** (`/des`)
   - Search and filter your DEs
   - Sort by name or risk score
   - See PII summary for each

2. **Generate Lineage Maps** (`/mindmap`)
   - Pick any DE
   - See upstream sources (imports, queries)
   - See downstream usage (journeys, automations)

3. **Analyze Risk** 
   - View risk scores
   - Identify high-risk DEs
   - Find orphaned Data Extensions

4. **Export Data**
   - Download lineage as JSON
   - Export for documentation
   - Integrate with other tools

---

## 📞 Support

- **Documentation**: All guides are in `docs/`
- **Test Tool**: `tools/test-sfmc-connection.js`
- **Architecture**: `docs/SFMC_ARCHITECTURE.md`
- **Checklist**: `SFMC_SETUP_CHECKLIST.md`

---

## 🚀 Ready to Start?

**Begin with**: [`SFMC_SYNC_QUICKSTART.md`](./SFMC_SYNC_QUICKSTART.md)

It has everything you need in a simple 5-step format!

---

**Good luck! You've got this!** 💪
