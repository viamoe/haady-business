# RTL (Right-to-Left) Support Checklist

## ✅ Current RTL Implementation

### Onboarding Components

#### 1. **OnboardingWizard** (`app/onboarding/components/OnboardingWizard.tsx`)
- ✅ Main container has `dir={isRTL ? 'rtl' : 'ltr'}`
- ✅ Content area has `dir={isRTL ? 'rtl' : 'ltr'}`
- ✅ Title and description display Arabic when locale is 'ar'

#### 2. **PersonalDetailsStep** (`app/onboarding/components/steps/PersonalDetailsStep.tsx`)
- ✅ Form has RTL support
- ✅ All input fields have `dir={isRTL ? 'rtl' : 'ltr'}`
- ✅ Phone number field has special RTL handling

#### 3. **BusinessSetupStep** (`app/onboarding/components/steps/BusinessSetupStep.tsx`)
- ✅ **Form container** has `dir={isRTL ? 'rtl' : 'ltr'}` (line 817)
- ✅ **Store Name input** has `dir={isRTL ? 'rtl' : 'ltr'}` (line 1031)
- ✅ **Category dropdown** shows Arabic names when locale is 'ar'
- ✅ All text automatically inherits RTL direction from form

### What's Automatically Handled

When you add `dir="rtl"` to a container, the following automatically adjust:
- ✅ Text alignment (right-aligned)
- ✅ Padding/margins (flipped)
- ✅ Flex direction (reversed)
- ✅ Icons and chevrons (flipped)
- ✅ Dropdown positioning

## 🎯 RTL Best Practices

### 1. **Always Use `isRTL` from `useLocale()`**
```typescript
const { locale, isRTL } = useLocale()
```

### 2. **Add `dir` Attribute to Form Containers**
```typescript
<form dir={isRTL ? 'rtl' : 'ltr'}>
  {/* All child elements inherit RTL */}
</form>
```

### 3. **Add `dir` to Input Fields for Explicit Control**
```typescript
<Input
  dir={isRTL ? 'rtl' : 'ltr'}
  className="..."
/>
```

### 4. **Use Conditional Text for Labels/Buttons**
```typescript
{locale === 'ar' ? 'حفظ' : 'Save'}
```

### 5. **Category/Dropdown Names**
```typescript
{locale === 'ar' && item.name_ar ? item.name_ar : item.name}
```

## 📋 Components That Need RTL Support

### Required in Every Component:
1. ✅ Import `useLocale` hook
2. ✅ Destructure `{ locale, isRTL }`
3. ✅ Add `dir={isRTL ? 'rtl' : 'ltr'}` to main container/form
4. ✅ Use locale-aware text for all UI elements
5. ✅ Fetch and display Arabic database fields (name_ar, description_ar, etc.)

## 🔍 Testing RTL

### Manual Testing Steps:
1. **Switch Language**: Click language toggle (EN ↔ AR)
2. **Check Alignment**: 
   - Text should align to the right
   - Icons should flip (chevrons, arrows)
   - Forms should flow right-to-left
3. **Check Content**:
   - Arabic names display for categories
   - Arabic descriptions display
   - Buttons show Arabic text
4. **Check Input**:
   - Typing should start from right
   - Cursor position correct
   - Placeholder text aligned right

### Quick Test Checklist:
- [ ] Form elements align right in Arabic
- [ ] Dropdowns open correctly
- [ ] Category names show in Arabic
- [ ] Buttons have Arabic labels
- [ ] Error messages align properly
- [ ] Icons/chevrons flip direction
- [ ] Input fields type right-to-left

## 🌍 Database Fields for Localization

### Categories Table:
```sql
categories (
  name TEXT,           -- English name
  name_ar TEXT,        -- Arabic name ✅
  description TEXT,    -- English description
  description_ar TEXT  -- Arabic description ✅
)
```

### Other Tables to Add:
Consider adding `*_ar` fields to:
- `business_types` (if exists)
- `business_profile` (business_name_ar, description_ar)
- `products` (name_ar, description_ar)
- Any other user-facing content

## 🚀 Future Enhancements

### Planned:
- [ ] Add RTL support to dashboard
- [ ] Add RTL to product listings
- [ ] Add RTL to store pages
- [ ] Test with screen readers (accessibility)
- [ ] Add RTL CSS utilities if needed

### Nice to Have:
- [ ] Automatic font switching (Arabic fonts for Arabic text)
- [ ] Number formatting (Arabic numerals vs Western)
- [ ] Date/time formatting (Islamic calendar option)

## 📝 Common RTL Issues & Solutions

### Issue 1: Text Not Aligning Right
**Solution**: Ensure parent container has `dir="rtl"`

### Issue 2: Dropdown Opens Wrong Direction
**Solution**: Add `dir="rtl"` to dropdown container

### Issue 3: English Words in Arabic Text
**Solution**: Use proper fallback:
```typescript
{locale === 'ar' && arabicField ? arabicField : englishField}
```

### Issue 4: Icons Not Flipping
**Solution**: Most icons auto-flip with RTL. For custom icons:
```typescript
className={isRTL ? 'transform scale-x-[-1]' : ''}
```

## ✅ Summary

The onboarding flow now has **full RTL support**:
- ✅ Forms align to the right in Arabic
- ✅ Text displays in Arabic when available
- ✅ Categories show Arabic names
- ✅ All inputs work correctly in RTL mode
- ✅ Layout automatically adjusts

**Test it**: Switch to Arabic (AR) and verify everything aligns right! 🎯

