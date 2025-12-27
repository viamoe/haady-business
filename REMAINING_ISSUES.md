# Remaining Issues to Fix

**Date:** December 23, 2025  
**Status:** Medium Priority & Code Quality Improvements

---

## 🔧 Medium Priority Issues

### 1. Email Check Debouncing ⚡
**Location:** `app/auth/AuthForm.tsx` (line ~131-159)  
**Issue:** Email check API is called on every email change, causing unnecessary requests  
**Impact:** Performance, API costs, rate limiting  
**Fix:** Add debounce (300-500ms) to email check

**Priority:** Medium  
**Estimated Time:** 15 minutes

---

### 2. OTP Verification Promise Chain Simplification 🔄
**Location:** `app/auth/AuthForm.tsx` (line ~357-398)  
**Issue:** Uses promise chain (`.catch().then()`) instead of async/await  
**Impact:** Code readability, error handling clarity  
**Fix:** Convert to async/await pattern

**Priority:** Medium  
**Estimated Time:** 20 minutes

---

### 3. Auth Context Interval Frequency ⏱️
**Location:** `lib/auth/auth-context.tsx` (line ~262)  
**Issue:** 30-second interval for user existence check may be too frequent  
**Impact:** Unnecessary API calls, battery drain on mobile  
**Fix:** Increase to 60-120 seconds, or make it configurable

**Priority:** Low-Medium  
**Estimated Time:** 5 minutes

---

### 4. Onboarding Step Fetch Redundancy 🔄
**Location:** `app/onboarding/components/OnboardingWizard.tsx` (line ~146-211)  
**Issue:** Client-side fetch when server already redirects correctly  
**Impact:** Extra database query, loading delay  
**Fix:** Remove redundant client-side check or make it optional

**Priority:** Medium  
**Estimated Time:** 30 minutes

---

### 5. Hardcoded Transition Delays ⏱️
**Location:** `app/onboarding/components/OnboardingWizard.tsx` (line ~330-342)  
**Issue:** Hardcoded delays (800ms, 600ms) for transitions  
**Impact:** Inconsistent UX, not configurable  
**Fix:** Extract to constants, make configurable

**Priority:** Low  
**Estimated Time:** 10 minutes

---

### 6. useEffect Dependency Array Issue 🔄
**Location:** `app/auth/AuthForm.tsx` (line ~324-344)  
**Issue:** Dependency array includes `isVerifying` which may cause re-subscription  
**Impact:** Potential memory leaks, unnecessary re-renders  
**Fix:** Review dependencies, use refs where appropriate

**Priority:** Medium  
**Estimated Time:** 15 minutes

---

## 🎨 Code Quality Improvements

### 7. Split AuthForm Component 📦
**Location:** `app/auth/AuthForm.tsx` (1080+ lines)  
**Issue:** Component is too large, hard to maintain  
**Impact:** Code maintainability, testing difficulty  
**Fix:** Split into:
- `EmailInputStep.tsx` - Email input and validation
- `OtpInputStep.tsx` - OTP input component
- `AuthForm.tsx` - Main orchestrator (smaller)

**Priority:** Medium  
**Estimated Time:** 2-3 hours

---

### 8. Extract OTP Input Component 🧩
**Location:** `app/auth/AuthForm.tsx`  
**Issue:** OTP input logic embedded in large component  
**Impact:** Reusability, testability  
**Fix:** Create `components/auth/OtpInput.tsx`

**Priority:** Medium  
**Estimated Time:** 1 hour

---

### 9. Fix TODO in PersonalDetailsStep ✅
**Location:** `app/onboarding/components/steps/PersonalDetailsStep.tsx` (line 566)  
**Issue:** TODO comment to use constant from onboarding constants  
**Impact:** Code consistency  
**Fix:** Use `getOnboardingStepPath(ONBOARDING_STEPS.BUSINESS_SETUP)`

**Priority:** Low  
**Estimated Time:** 2 minutes

---

### 10. Multiple Auth State Checks 🔄
**Location:** `lib/auth/auth-context.tsx`, `app/onboarding/components/OnboardingWizard.tsx`  
**Issue:** Multiple `getUser()` calls and database queries  
**Impact:** Unnecessary network requests  
**Fix:** Cache auth state, reduce redundant checks

**Priority:** Medium  
**Estimated Time:** 30 minutes

---

### 11. Inconsistent Error Handling 🚨
**Location:** Multiple files  
**Issue:** Some errors caught and shown, others silently ignored  
**Impact:** User experience, debugging difficulty  
**Fix:** Standardize error handling pattern

**Priority:** Medium  
**Estimated Time:** 1 hour

---

### 12. Missing TypeScript Types 📝
**Location:** Some API responses  
**Issue:** `any` types used in some places  
**Impact:** Type safety, IDE support  
**Fix:** Define proper interfaces

**Priority:** Low-Medium  
**Estimated Time:** 30 minutes

---

## 📚 Documentation & Testing

### 13. Add JSDoc Comments 📖
**Location:** Complex functions across codebase  
**Issue:** Missing documentation for complex logic  
**Impact:** Developer experience, maintainability  
**Fix:** Add JSDoc comments to:
- `handleVerifyOtp`
- `checkEmailExists`
- `save_personal_details` RPC
- Complex useEffect hooks

**Priority:** Low  
**Estimated Time:** 1 hour

---

### 14. Add Unit Tests 🧪
**Location:** Auth and onboarding flows  
**Issue:** No visible test files  
**Impact:** Code reliability, regression prevention  
**Fix:** Add tests for:
- Rate limiting utility
- Email validation
- OTP verification flow
- Onboarding step navigation

**Priority:** Medium  
**Estimated Time:** 4-6 hours

---

### 15. Improve Accessibility ♿
**Location:** Form inputs, buttons  
**Issue:** Some inputs may need better ARIA labels, keyboard navigation  
**Impact:** Accessibility compliance, user experience  
**Fix:** 
- Add proper ARIA labels
- Improve keyboard navigation
- Add focus management

**Priority:** Low-Medium  
**Estimated Time:** 2 hours

---

## 📊 Summary

| Category | Count | Priority |
|----------|-------|----------|
| Medium Priority | 6 | ⚠️ |
| Code Quality | 6 | ⚠️ |
| Documentation | 1 | ℹ️ |
| Testing | 1 | ℹ️ |
| Accessibility | 1 | ℹ️ |
| **Total** | **15** | |

---

## 🎯 Recommended Fix Order

### Quick Wins (30 minutes total)
1. Fix TODO in PersonalDetailsStep (2 min)
2. Extract transition delays to constants (10 min)
3. Adjust auth context interval (5 min)
4. Add debounce to email check (15 min)

### Medium Effort (2-3 hours)
5. Simplify OTP verification promise chain (20 min)
6. Fix useEffect dependency array (15 min)
7. Remove redundant onboarding step fetch (30 min)
8. Extract OTP input component (1 hour)
9. Standardize error handling (1 hour)

### Larger Refactoring (4-6 hours)
10. Split AuthForm component (2-3 hours)
11. Cache auth state (30 min)
12. Add TypeScript types (30 min)
13. Add JSDoc comments (1 hour)

### Long-term (8+ hours)
14. Add unit tests (4-6 hours)
15. Improve accessibility (2 hours)

---

## 🚀 Next Steps

Would you like me to:
1. **Fix the quick wins first?** (30 minutes)
2. **Focus on medium priority issues?** (2-3 hours)
3. **Start with a specific issue?** (Tell me which one)

All issues are documented and ready to be addressed!

