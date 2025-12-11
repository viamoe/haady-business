# Client-Side Approach: Creating merchant_user During Signup

## Alternative to Database Trigger

If you prefer not to use a database trigger, you can create the `merchant_user` record client-side after OTP verification.

## Implementation Location

Update `app/login/verify/OtpVerificationForm.tsx` to create `merchant_user` record after successful OTP verification.

## Code Example

```typescript
// After successful OTP verification
if (data?.session || data?.user) {
  const userId = data.user?.id || data.session?.user.id;
  
  // Check if merchant_user already exists
  const { data: existingMerchantUser } = await supabase
    .from('merchant_users')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  
  // If it doesn't exist and this is a new signup, create it
  if (!existingMerchantUser && isSignupMode) {
    // Get preferred country and language
    const urlCountry = parseLocaleCountry(window.location.pathname);
    const cookieCountry = getLocaleCountryFromCookies();
    const defaults = getDefaultLocaleCountry();
    
    const preferredCountry = urlCountry?.country || 
                             cookieCountry?.country || 
                             defaults.country;
    const preferredLanguage = urlCountry?.locale || 
                              cookieCountry?.locale || 
                              defaults.locale;
    
    // Create minimal merchant_user record
    const { error: createError } = await supabase
      .from('merchant_users')
      .insert({
        auth_user_id: userId,
        merchant_id: null,  // Will be set during setup
        role: 'manager',
        preferred_country: preferredCountry,
        preferred_language: preferredLanguage,
        is_primary_contact: true,
      });
    
    if (createError) {
      console.error('Error creating merchant_user:', createError);
      // Continue anyway - user can still proceed to setup
    }
  }
  
  // Continue with existing flow...
}
```

## Pros and Cons

**Pros:**
- Easy to implement and debug
- Can access browser context (cookies, URL)
- No database trigger needed

**Cons:**
- Not atomic with user creation
- Could fail silently
- Requires code changes
- Race conditions possible

## Recommendation

Use the **database trigger approach** (`create_merchant_user_on_signup.sql`) for:
- Atomicity
- Consistency
- No code changes needed
- Works for all signup methods (OTP, OAuth)

