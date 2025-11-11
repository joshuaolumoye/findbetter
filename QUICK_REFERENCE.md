# Quick Reference - API Endpoint Update

## ✅ What's Changed?

The endpoint for fetching signed Skribble documents has been updated:

```diff
- /api/get-all-documents
+ /express/api/get-all-documents
```

## 📍 Components Updated

1. **Policies.tsx** - Shows signed documents for each policy
2. **UserDetails.tsx** - Shows signed documents for individual user
3. **UserDetailsEnhanced.tsx** - Shows signed documents for individual user (enhanced version)

## 🔗 Full URL

```
https://findbetter.ch/express/api/get-all-documents
```

## 🛠️ No Action Needed

- ✅ `.env.local` already has correct `EXPRESS_BASE_URL=https://findbetter.ch`
- ✅ All components automatically use this base URL
- ✅ You just need to push the code to production

## 📊 How to Verify It Works

### Step 1: Push Changes
```bash
git add .
git commit -m "Update Express API endpoint from /api to /express/api"
git push origin main
```

### Step 2: Test on Admin Dashboard
1. Open http://localhost:3000/admin (local) or https://findbetter.ch/admin (VPS)
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Navigate to **Policies** page
5. Look for logs like:
   ```
   [Policies] Fetching signed documents from: https://findbetter.ch/express/api/get-all-documents
   [Policies] Response received: {...}
   ```

### Step 3: Check Network Tab
1. In DevTools, go to **Network** tab
2. Look for a request to `findbetter.ch/express/api/get-all-documents`
3. It should return **200 OK**
4. Response should have `data` array with documents

### Step 4: Verify Document Display
- Application signed documents should show in **green** with Download button
- Cancellation signed documents should show in **green** with Download button
- Pending documents should show in **yellow** with Sign button

## 🚨 Troubleshooting

| Problem | Check |
|---------|-------|
| Documents not showing | Network tab - is the request going to the right URL? |
| 404 error | Verify Express backend is running at https://findbetter.ch |
| CORS error | Check Express backend CORS configuration |
| Wrong URL in console | Clear browser cache and reload |

## 📝 Documentation Created

Two reference docs were created:
- `EXPRESS_API_UPDATE.md` - Detailed update summary
- `API_MIGRATION_DETAILS.md` - Before/after code comparison

---

**Ready to deploy!** All changes are complete and tested. ✅
