# Creating merchant_user Record During Signup

## Overview

Currently, `merchant_user` records are created during the setup/onboarding process. This document outlines what's needed to create a `merchant_user` record immediately after signup.

## Current Flow

1. User signs up with email
2. OTP is verified
3. User is created in `auth.users`
4. System checks if `merchant_user` exists
5. If not, redirects to `/setup`
6. During setup, `merchant_user` is created via `create_merchant_onboarding` RPC function

## What's Available During Signup

### Available Data:
- ✅ `auth_user_id` - Available immediately after OTP verification
- ✅ `preferred_country` - Can be extracted from:
  - URL pathname (e.g., `/en-ae/login` → `AE`)
  - Cookies (`country` cookie)
  - Default: `AE` (UAE)
- ✅ `preferred_language` - Can be extracted from:
  - URL pathname (e.g., `/en-ae/login` → `en`)
  - Cookies (`locale` cookie)
  - Default: `en` (English)
- ❌ `merchant_id` - Not available (will be NULL until setup)
- ❌ `full_name` - Not collected during signup
- ❌ `phone` - Not collected during signup
- ❌ `role` - Can default to `'manager'` or `'owner'`
- ❌ `job_title` - Not collected during signup
- ❌ `is_primary_contact` - Can default to `true` for first user

## Required Fields for merchant_user

Based on the table schema:

| Field | Required | Available During Signup | Default Value |
|-------|----------|------------------------|---------------|
| `id` | ✅ | ✅ (auto-generated) | UUID |
| `merchant_id` | ❌ | ❌ | `NULL` |
| `auth_user_id` | ✅ | ✅ (after OTP) | User's auth ID |
| `role` | ❌ | ✅ (can default) | `'manager'` or `'owner'` |
| `created_at` | ❌ | ✅ (auto) | `now()` |
| `full_name` | ❌ | ❌ | `NULL` |
| `job_title` | ❌ | ❌ | `NULL` |
| `is_primary_contact` | ❌ | ✅ (can default) | `true` |
| `preferred_country` | ❌ | ✅ (from URL/cookies) | From context |
| `preferred_language` | ❌ | ✅ (from URL/cookies) | From context |
| `phone` | ❌ | ❌ | `NULL` |

## Implementation Options

### Option 1: Database Trigger (Recommended)
Create a trigger that automatically creates a `merchant_user` record when a new user signs up with `app_type: 'merchant'` in metadata.

**Pros:**
- Automatic, no code changes needed
- Consistent across all signup methods
- Atomic operation

**Cons:**
- Requires database access to create trigger
- Harder to debug

### Option 2: Client-Side After OTP Verification
Create `merchant_user` record in the OTP verification handler after successful verification.

**Pros:**
- Easy to implement
- Can access cookies/URL for country/language
- Easy to debug

**Cons:**
- Requires code changes
- Not atomic with user creation
- Could fail silently

### Option 3: Server-Side in Callback Route
Create `merchant_user` record in the OAuth/callback route.

**Pros:**
- Server-side, more secure
- Can access request context

**Cons:**
- Only works for OAuth flows
- Doesn't cover OTP signup

## Recommended Implementation: Database Trigger

Create a trigger function that:
1. Checks if user metadata has `app_type: 'merchant'`
2. Extracts country/language from user metadata or uses defaults
3. Creates `merchant_user` record with minimal data
4. Sets `merchant_id` to NULL (will be set during setup)

## Minimal merchant_user Record Structure

```sql
{
  id: uuid (auto-generated),
  merchant_id: NULL,
  auth_user_id: <user_id>,
  role: 'manager',
  created_at: now(),
  full_name: NULL,
  job_title: NULL,
  is_primary_contact: true,
  preferred_country: <from_metadata_or_default>,
  preferred_language: <from_metadata_or_default>,
  phone: NULL
}
```

## Next Steps

1. Decide on implementation approach (trigger vs client-side)
2. Create migration/function to create merchant_user on signup
3. Update signup flow to pass country/language in user metadata
4. Test that merchant_user is created correctly
5. Ensure setup flow still works (merchant_user exists but merchant_id is NULL)

