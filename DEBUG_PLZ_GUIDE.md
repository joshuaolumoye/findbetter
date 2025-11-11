# Postal Code (PLZ) Debugging Guide

## Changes Made

### 1. **Frontend Component (`components/PremiumCalculator.tsx`)**

#### Issue Fixed:
- Input field was showing city name instead of postal code, causing confusion

#### Changes:
```tsx
// BEFORE (Wrong)
value={regionData?.name ? regionData.name : form.plz}

// AFTER (Correct)
value={form.plz}
// And added confirmation message below input:
{regionData?.name && (
  <p className="mt-2 text-sm text-green-600 flex items-center">
    ✓ {regionData.name} ({form.plz})
  </p>
)}
```

#### Enhanced Error Handling in `fetchRegion()`:
- Now checks if API response is OK (200-299 status)
- Logs detailed error information
- Handles both array and object responses from the API
- Better null/undefined checks
- Validates data format before setting state

### 2. **Backend Route (`src/app/api/address/plz/[plz]/route.ts`)**

#### Improvements:
- Added comprehensive logging with `[PLZ API]` prefix for debugging
- Increased timeout from 10s to 15s (for VPS slowness)
- Added error text capture and logging
- Better error type handling
- Added Cache-Control headers (24-hour cache)
- More descriptive error messages

## Debugging Steps for VPS Issues

### Step 1: Check Browser Console Logs
1. Open your VPS site in browser
2. Press `F12` (Developer Tools)
3. Go to **Console** tab
4. Type a postal code (e.g., 8001)
5. Look for logs starting with:
   - `API Response:` - Shows what API returned
   - `Region data set:` - Shows the processed data
   - `API Error:` - Shows any errors

### Step 2: Check Server Logs (VPS)

Run these commands on your VPS:

```bash
# For PM2/Node.js processes
pm2 logs findbetter  # or your app name

# For Docker containers
docker logs <container-id> -f

# For systemd services
sudo journalctl -u <service-name> -f
```

Look for logs with `[PLZ API]` prefix to see what's happening.

### Step 3: Test the API Endpoint Directly

From your VPS terminal or local machine:

```bash
# Direct external API test
curl -v "https://compando-backend-dwl4f.ondigitalocean.app/api/address/plz/8001"

# Test your Next.js API endpoint
curl -v "https://yourvps.com/api/address/plz/8001"
```

### Step 4: Compare Responses

**Check what format the external API returns:**
```bash
curl "https://compando-backend-dwl4f.ondigitalocean.app/api/address/plz/8001" | json_pp
```

Expected response could be:
```json
{
  "name": "Zürich",
  "regionId": "...",
  "cantonId": "..."
}
```

Or (array format):
```json
[{
  "name": "Zürich",
  "regionId": "...",
  "cantonId": "..."
}]
```

### Step 5: Common Issues & Solutions

#### Issue: "Request timeout"
**Causes:**
- VPS network is slow
- External API is unreachable
- Firewall blocking request

**Solutions:**
```bash
# Check if you can reach the external API
ping compando-backend-dwl4f.ondigitalocean.app
nc -zv compando-backend-dwl4f.ondigitalocean.app 443

# Check DNS resolution
nslookup compando-backend-dwl4f.ondigitalocean.app
```

#### Issue: "No data returned"
**Cause:** External API might be down or URL changed

**Solution:**
Test external API directly:
```bash
curl -H "Content-Type: application/json" \
  "https://compando-backend-dwl4f.ondigitalocean.app/api/address/plz/8001"
```

#### Issue: Wrong region data
**Cause:** API response format differs from expected

**Solution:**
Check the exact response format and adjust in `fetchRegion()`:
```tsx
const regionData = Array.isArray(data) ? data[0] : data;
// This handles both array and object responses
```

### Step 6: Environment Configuration

Ensure your `.env.local` has correct settings:

```env
# Should be accessible from VPS
NEXT_PUBLIC_BASE_URL=https://yourvps.com

# External API URL should be reachable
# (no env var needed, it's hardcoded in route.ts)
```

## Real-time Debugging on VPS

### Enable More Verbose Logging

Edit `src/app/api/address/plz/[plz]/route.ts` and temporarily add:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plz: string }> }
) {
  // ... existing code ...
  
  console.log('[PLZ API] Full request details:', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    host: request.headers.get('host'),
  });
  
  // ... rest of code ...
}
```

### Monitor Real-time Logs

```bash
# Watch server logs in real-time
pm2 logs findbetter --lines 100

# Or with Docker
docker logs <container-id> -f --tail 100
```

## Quick Test Postal Codes

Use these Swiss postal codes to test:

| PLZ  | City        | Canton |
|------|-------------|--------|
| 8001 | Zürich      | ZH     |
| 3011 | Bern        | BE     |
| 1201 | Genève      | GE     |
| 6900 | Lugano      | TI     |

## Performance Optimization

If the API is slow on VPS:

1. **Enable response caching** (already added in updated code)
2. **Use CDN** for region data lookup
3. **Cache in Redis** on VPS:
   ```typescript
   // Example (optional enhancement)
   const cachedData = await redis.get(`plz:${plz}`);
   if (cachedData) return JSON.parse(cachedData);
   ```

## Verification Checklist

- [ ] Frontend input shows postal code (not city name)
- [ ] Green confirmation message appears after loading
- [ ] Browser console shows `API Response:` log
- [ ] Server logs show `[PLZ API]` entries
- [ ] Multiple postal codes work (8001, 3011, 1201)
- [ ] Invalid postal codes show error
- [ ] Loading spinner appears while fetching

## Still Having Issues?

1. **Share browser console logs** - Screenshot the Console tab
2. **Share server logs** - Run `pm2 logs findbetter > logs.txt` for 1 minute while testing
3. **Check external API status** - Verify compando-backend is online
4. **Test on local first** - Confirm it works locally before comparing to VPS

---

Last updated: November 11, 2025
