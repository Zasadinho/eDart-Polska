# 🔴 ACE Darts Arena - Security Issues Action Items

## CRITICAL ISSUES (Fix Today)

### 1. ⚠️ .env Credentials Exposed in Git
**Status:** 🔴 CRITICAL - Immediate action required
**Time to fix:** 1-2 hours

**Steps:**
```bash
# 1. Rotate credentials NOW
# Go to: https://app.supabase.com > Settings > API
# Create new Publishable Key and update locally

# 2. Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "security: add .env to gitignore"

# 3. Remove from git history
# This requires git-filter-repo - ask your team about this approach
git filter-repo --invert-paths --paths .env

# 4. Push changes
git push origin main
```

---

### 2. ⚠️ Add Security Headers to Vercel
**Status:** 🔴 CRITICAL
**Time to fix:** 30 minutes

**Edit [vercel.json](vercel.json)** - Add these headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {"key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload"},
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "X-XSS-Protection", "value": "1; mode=block"},
        {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}
      ]
    }
  ]
}
```

---

### 3. ⚠️ Fix XSS in Chrome Extension
**Status:** 🔴 CRITICAL  
**Time to fix:** 2-3 hours
**File:** [public/chrome-extension/popup.js](public/chrome-extension/popup.js)

**Quick fix - Replace all `innerHTML` with safe methods:**

```javascript
// BEFORE (UNSAFE):
container.innerHTML = logs.map((l) => 
  `<div class="log-entry">${l.text}</div>`
).join("");

// AFTER (SAFE):
container.innerHTML = '';
logs.forEach(l => {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.textContent = l.text;  // Automatically escapes
  container.appendChild(div);
});
```

Apply to all uses in popup.js, content.js, and inject-token.js

---

## HIGH PRIORITY ISSUES (Fix This Week)

### 4. 🔴 Weak Password Policy
**Status:** 🔴 HIGH
**Time to fix:** 1 hour
**Files:** [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx#L77), [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx)

**Change from:**
```typescript
if (password.length < 6) {
  // Error
}
```

**Change to:**
```typescript
if (password.length < 12) return "Min 12 characters";
if (!/[A-Z]/.test(password)) return "Needs uppercase";
if (!/[0-9]/.test(password)) return "Needs numbers";
if (!/[!@#$%^&*]/.test(password)) return "Needs special chars";
```

---

### 5. 🔴 Fix dangerouslySetInnerHTML
**Status:** 🔴 HIGH
**Time to fix:** 2-3 hours
**File:** [src/components/ui/chart.tsx](src/components/ui/chart.tsx#L70)

Replace with CSS variables instead of injecting HTML.

---

### 6. 🔴 Implement Token Expiration in Extension
**Status:** 🔴 HIGH
**Time to fix:** 3-4 hours
**Files:** [public/chrome-extension/content.js](public/chrome-extension/content.js), [public/chrome-extension/inject-token.js](public/chrome-extension/inject-token.js)

Don't store tokens in persistent storage. Use session storage only with 1-hour expiration.

---

### 7. 🔴 Add Real-time Authorization Checks
**Status:** 🔴 HIGH
**Time to fix:** 2-3 hours
**File:** [src/pages/AdminPage.tsx](src/pages/AdminPage.tsx#L42), [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

Add periodic role refresh and per-action authorization checks.

---

### 8. 🔴 Implement CSRF Protection
**Status:** 🔴 HIGH
**Time to fix:** 2-3 hours
**Files:** Supabase functions, vercel.json

Add origin validation and SameSite cookie attributes.

---

## MEDIUM PRIORITY ISSUES (Fix in 3-4 Weeks)

### 9. 🟠 Add Input Validation
- [ ] Create [src/lib/validation.ts](src/lib/validation.ts)
- [ ] Validate all form inputs (email, names, URLs)
- [ ] Sanitize string inputs
- Estimated time: 4-6 hours

### 10. 🟠 Restrict RLS Policies
- [ ] Review [supabase/migrations/20260308072259_ac70a521-0384-4fcf-b4e4-46a49732001f.sql](supabase/migrations/20260308072259_ac70a521-0384-4fcf-b4e4-46a49732001f.sql)
- [ ] Remove "Anyone can read" policies
- [ ] Add ownership checks for updates
- Estimated time: 3-4 hours

### 11. 🟠 Encrypt Gaming Platform IDs
- [ ] Create migration to encrypt autodarts_user_id, dartcounter_id, dartsmind_id
- [ ] Implement client-side encryption
- [ ] Update RLS policies
- Estimated time: 4-5 hours

---

## VERIFICATION CHECKLIST

After implementing fixes, verify:

```bash
# ✅ Check credentials are removed from git
git log --all --full-history -S "VITE_SUPABASE_PUBLISHABLE_KEY" -- .env

# ✅ Verify security headers
curl -I https://ace-darts.com | grep "Strict-Transport-Security"

# ✅ Test CORS restrictions
curl -H "Origin: https://malicious.com" -I https://ace-darts.com

# ✅ Verify XSS is fixed
# Try league name: <img src=x onerror="alert('XSS')">
# Result: Should be escaped or rejected

# ✅ Test authorization
# Logout and try accessing /admin
# Result: Should be redirected to login

# ✅ Test password complexity
# Try password: "abc"
# Result: Should be rejected
```

---

## TIMELINE

| Week | Tasks |
|------|-------|
| **This Week** | 1. Rotate credentials<br/>2. Add security headers<br/>3. Fix extension XSS<br/>4. Update password policy |
| **Next Week** | 5. Fix dangerouslySetInnerHTML<br/>6. Token expiration<br/>7. Authorization refactor<br/>8. CSRF protection |
| **Week 3-4** | 9. Input validation<br/>10. RLS policies<br/>11. Encrypt gaming IDs |
| **Month 2** | 12. Error handling improvements<br/>13. Security monitoring |

---

## Resources

- Full audit report: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- Supabase security best practices: https://supabase.com/docs/guides/security/auth
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---

## Questions?

Refer to specific line numbers and file locations in the main [SECURITY_AUDIT.md](SECURITY_AUDIT.md) report for detailed explanations and code examples.

**Status:** 🔴 **ACTION REQUIRED - CRITICAL ISSUES PRESENT**
