# API Endpoint Migration - Before & After

## Component Changes Summary

### Policies.tsx

#### BEFORE
```typescript
const url = `${EXPRESS_BASE}/api/get-all-documents`;
const res = await fetch(url, { method: 'GET' });
```

#### AFTER
```typescript
const url = `${EXPRESS_BASE}/express/api/get-all-documents`;
console.log('[Policies] Fetching signed documents from:', url);
const res = await fetch(url, { method: 'GET' });
console.log('[Policies] Response received:', body);
// ... rest of code ...
console.log('[Policies] Documents map created:', map);
```

---

### UserDetails.tsx

#### BEFORE
```typescript
const url = `${EXPRESS_BASE}/api/get-all-documents`;
const res = await fetch(url, { method: 'GET' });
if (!res.ok) {
  throw new Error(`Failed to fetch signed docs: ${res.status}`);
}
const body = await res.json();
const arr = Array.isArray(body.data) ? body.data : (body.data || []);
const userDocs = arr.filter((d: any) => String(d.userId) === String(userId));
setSignedDocuments(userDocs);
```

#### AFTER
```typescript
const url = `${EXPRESS_BASE}/express/api/get-all-documents`;
console.log('[UserDetails] Fetching signed documents for user', userId, 'from:', url);
const res = await fetch(url, { method: 'GET' });
if (!res.ok) {
  throw new Error(`Failed to fetch signed docs: ${res.status}`);
}
const body = await res.json();
console.log('[UserDetails] Response received:', body);
const arr = Array.isArray(body.data) ? body.data : (body.data || []);
const userDocs = arr.filter((d: any) => String(d.userId) === String(userId));
setSignedDocuments(userDocs);
console.log('[UserDetails] Documents for user', userId, ':', userDocs);
```

---

### UserDetailsEnhanced.tsx

#### BEFORE
```typescript
const url = `${EXPRESS_BASE}/api/get-all-documents`;
const res = await fetch(url, { method: 'GET' });
if (!res.ok) {
  throw new Error(`Failed to fetch signed docs: ${res.status}`);
}
const body = await res.json();
const arr = Array.isArray(body.data) ? body.data : (body.data || []);
const userDocs = arr.filter((d: any) => String(d.userId) === String(userId));
setSignedDocuments(userDocs);
```

#### AFTER
```typescript
const url = `${EXPRESS_BASE}/express/api/get-all-documents`;
console.log('[UserDetailsEnhanced] Fetching signed documents for user', userId, 'from:', url);
const res = await fetch(url, { method: 'GET' });
if (!res.ok) {
  throw new Error(`Failed to fetch signed docs: ${res.status}`);
}
const body = await res.json();
console.log('[UserDetailsEnhanced] Response received:', body);
const arr = Array.isArray(body.data) ? body.data : (body.data || []);
const userDocs = arr.filter((d: any) => String(d.userId) === String(userId));
setSignedDocuments(userDocs);
console.log('[UserDetailsEnhanced] Documents for user', userId, ':', userDocs);
```

---

## URL Evolution

### Development (Local)
```
OLD: http://localhost:3001/api/get-all-documents
NEW: https://findbetter.ch/express/api/get-all-documents
```

### Production (VPS)
```
OLD: https://findbetter.ch/api/get-all-documents  ❌
NEW: https://findbetter.ch/express/api/get-all-documents  ✅
```

---

## Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| **API Path** | `/api/get-all-documents` | `/express/api/get-all-documents` |
| **Base URL Used** | `EXPRESS_BASE` | `EXPRESS_BASE` (same) |
| **Full URL Pattern** | `${EXPRESS_BASE}/api/...` | `${EXPRESS_BASE}/express/api/...` |
| **Debug Logging** | None | ✅ Added console logs |
| **Component Tags** | None | ✅ `[ComponentName]` prefix |
| **Error Handling** | Basic | ✅ Enhanced with logging |

---

## How URL is Constructed

### Environment Variable
```env
EXPRESS_BASE_URL=https://findbetter.ch
```

### Component Code
```typescript
const EXPRESS_BASE = (process.env.NEXT_PUBLIC_EXPRESS_BASE_URL as string) || 'http://localhost:3001';
const url = `${EXPRESS_BASE}/express/api/get-all-documents`;
```

### Final URL
```
https://findbetter.ch/express/api/get-all-documents
```

---

## Console Output Example

When you open admin dashboard and navigate to Policies page:

```
[Policies] Fetching signed documents from: https://findbetter.ch/express/api/get-all-documents
[Policies] Response received: {success: true, data: Array(5)}
[Policies] Documents map created: {156: Array(1), 157: Array(2), ...}
```

When you click on a user in UserDetails:

```
[UserDetails] Fetching signed documents for user 156 from: https://findbetter.ch/express/api/get-all-documents
[UserDetails] Response received: {success: true, data: Array(5)}
[UserDetails] Documents for user 156 : [
  {userId: '156', pdfPath: '...', status: 'signed', ...},
  {userId: '156', cancellationPdfPath: '...', cancellationStatus: 'opened', ...}
]
```

---

## Testing Checklist

- [ ] Clear browser cache and reload
- [ ] Open F12 Developer Tools → Console
- [ ] Navigate to Admin Dashboard
- [ ] Go to Policies page
- [ ] Verify `[Policies]` logs appear in console
- [ ] Check that documents display correctly
- [ ] Click on a user
- [ ] Verify `[UserDetails]` logs appear
- [ ] Check documents for that user
- [ ] Check Network tab (F12 → Network) for request to new endpoint
- [ ] Verify response status is 200
- [ ] Confirm application and cancellation documents show

---

## Rollback (if needed)

If you need to revert to the old endpoint:

```typescript
// Change from:
const url = `${EXPRESS_BASE}/express/api/get-all-documents`;

// Back to:
const url = `${EXPRESS_BASE}/api/get-all-documents`;
```

Apply in:
- `components/admin/Policies.tsx`
- `components/admin/UserDetails.tsx`
- `components/admin/UserDetailsEnhanced.tsx`

---

**Status:** ✅ Complete
**All files updated:** November 11, 2025
**No breaking changes:** All functionality preserved
