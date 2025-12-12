# Cookie System Documentation

## Overview

The platform uses a comprehensive cookie system to enhance user experience by persisting user preferences, UI state, and form data across sessions.

## Cookie Categories

### 1. User Preferences Cookies

These cookies store user preferences that persist across sessions:

- **`locale`**: User's preferred language (en/ar)
  - Duration: 1 year
  - Used by: i18n system, language selector
  - Default: 'en'

- **`country`**: User's preferred country (SA, AE, etc.)
  - Duration: 1 year
  - Used by: Localization, country selector
  - Default: 'SA' (Saudi Arabia)

- **`theme`**: User's preferred theme (light/dark/system)
  - Duration: 1 year
  - Used by: Theme switcher (future feature)
  - Default: 'system'

- **`timezone`**: User's timezone preference
  - Duration: 1 year
  - Used by: Date/time formatting
  - Default: Browser timezone

### 2. UI State Cookies

These cookies remember UI component states:

- **`sidebar_open`**: Sidebar open/closed state
  - Duration: 30 days
  - Used by: Sidebar component

- **`dashboard_view`**: Dashboard view preference (grid/list/compact)
  - Duration: 30 days
  - Used by: Dashboard component

- **`table_page_size`**: Table pagination page size
  - Duration: 30 days
  - Used by: Data tables

- **`table_sort`**: Table sorting preference
  - Duration: 1 day
  - Used by: Data tables

- **`table_filters`**: Table filter preferences
  - Duration: 1 day
  - Used by: Data tables

### 3. Form State Cookies

These cookies save form drafts and last submitted data:

- **`form_draft_{formId}`**: Auto-saved form drafts
  - Duration: 7 days
  - Used by: SetupForm, other forms
  - Auto-saves every 2 seconds (debounced)

- **`last_form_data_{formId}`**: Last successfully submitted form data
  - Duration: 30 days
  - Used by: Forms for pre-filling

### 4. Navigation Cookies

These cookies track user navigation:

- **`last_visited_page`**: Last visited page path
  - Duration: 30 days
  - Used by: Navigation system

- **`navigation_history`**: Recent navigation history (up to 10 pages)
  - Duration: 30 days
  - Used by: Navigation system

### 5. UX Enhancement Cookies

These cookies track user experience metrics:

- **`first_visit`**: Whether this is user's first visit
  - Duration: 1 year
  - Used by: Onboarding system

- **`onboarding_complete`**: Whether user completed onboarding
  - Duration: 1 year
  - Used by: Onboarding system

- **`feature_discovered`**: Array of discovered features
  - Duration: 1 year
  - Used by: Feature discovery system

- **`notifications_enabled`**: User's notification preferences
  - Duration: 1 year
  - Used by: Notification system

### 6. Performance Cookies

These cookies store performance preferences:

- **`api_cache_pref`**: API caching preference
  - Duration: 30 days
  - Used by: API client

- **`data_refresh_interval`**: Preferred data refresh interval
  - Duration: 30 days
  - Used by: Data fetching system

## Cookie Utility Functions

The platform provides a centralized cookie utility library (`lib/cookies.ts`) with helper functions:

### Basic Functions

```typescript
import { setCookie, getCookie, deleteCookie } from '@/lib/cookies';

// Set a cookie
setCookie('my_cookie', 'value', { maxAge: 3600 });

// Get a cookie
const value = getCookie('my_cookie');

// Delete a cookie
deleteCookie('my_cookie');
```

### Helper Functions

```typescript
import { 
  UserPreferencesCookies,
  UIStateCookies,
  FormStateCookies,
  NavigationCookies,
  UXCookies,
  PerformanceCookies
} from '@/lib/cookies';

// User preferences
UserPreferencesCookies.setLocale('ar');
UserPreferencesCookies.setCountry('SA');
const locale = UserPreferencesCookies.getLocale();

// UI state
UIStateCookies.setSidebarOpen(true);
const isOpen = UIStateCookies.getSidebarOpen();

// Form state
FormStateCookies.saveFormDraft('business_setup', formData);
const draft = FormStateCookies.getFormDraft('business_setup');
FormStateCookies.clearFormDraft('business_setup');

// Navigation
NavigationCookies.setLastVisitedPage('/dashboard');
NavigationCookies.addToHistory('/dashboard');
const history = NavigationCookies.getHistory();

// UX
UXCookies.setFirstVisit(false);
UXCookies.setOnboardingComplete(true);
UXCookies.setFeatureDiscovered('feature_name');
```

## Cookie Security

All cookies are set with:
- **Secure flag**: Enabled in production (HTTPS only)
- **SameSite**: 'Lax' (default) - prevents CSRF attacks
- **HttpOnly**: Not set (cookies accessible via JavaScript for client-side usage)
- **Path**: '/' (available site-wide)

## Cookie Consent

Currently, the platform uses essential cookies for functionality. For GDPR compliance, consider:
- Adding a cookie consent banner
- Allowing users to opt-out of non-essential cookies
- Documenting cookie usage in privacy policy

## Clearing Cookies

### Clear All Cookies
```typescript
import { clearAllCookies } from '@/lib/cookies';
clearAllCookies(); // Clears all platform cookies
```

### Clear User Preferences Only
```typescript
import { clearUserPreferenceCookies } from '@/lib/cookies';
clearUserPreferenceCookies(); // Clears only preference cookies
```

## Integration Points

### SetupForm
- Auto-saves form drafts every 2 seconds
- Restores draft on page reload
- Clears draft on successful submission
- Saves last form data for reference

### Language Selector
- Saves locale and country preferences
- Updates cookies when user changes language/country

### Sidebar
- Remembers open/closed state
- Persists across sessions

### Middleware
- Sets locale and country cookies from URL
- Reads cookies for server-side rendering

## Migration Notes

When migrating from old cookie system:
1. Old cookies will be automatically replaced
2. No data loss - preferences are also stored in database
3. New cookie utility provides better type safety

## Future Enhancements

- [ ] Cookie consent banner
- [ ] Cookie preferences management UI
- [ ] Export/import user preferences
- [ ] Sync preferences across devices (via database)

