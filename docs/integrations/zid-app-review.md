# Zid App Review Process

## Overview

All Zid apps must be reviewed and approved by the Zid team before they can be published and used by Zid merchants in production.

## Why Review is Required

- **Security**: Ensures apps follow security best practices
- **Compliance**: Verifies apps comply with Zid's policies and terms
- **Quality**: Maintains quality standards for the Zid marketplace
- **User Protection**: Protects Zid merchants from malicious or poorly built apps

## App Statuses

### 📝 Draft
- App is created but not yet submitted
- Can only be tested by the app owner
- Not visible to other Zid merchants

### ⏳ Pending Review
- App has been submitted for review
- Zid team is evaluating the app
- Typically takes 3-7 business days
- Still can only be tested by app owner

### ✅ Published/Approved
- App has been approved by Zid team
- Available to all Zid merchants
- Can be installed and used in production
- OAuth flow works for all users

### ❌ Rejected
- App did not meet Zid's requirements
- Review feedback provided
- Must fix issues and resubmit

## Before Submitting for Review

### 1. Complete App Information

Ensure all required fields in Zid Partner Dashboard are filled:

- ✅ App name and description
- ✅ App icon/logo
- ✅ Privacy policy URL
- ✅ Terms of service URL
- ✅ Support contact information
- ✅ App screenshots or demo video

### 2. Configure OAuth Settings

- ✅ Set correct redirect URIs (development and production)
- ✅ Configure OAuth scopes (only request what you need)
- ✅ Test OAuth flow thoroughly
- ✅ Verify token exchange works

### 3. Test Your Integration

- ✅ Test OAuth authorization flow
- ✅ Test API endpoints with real Zid store
- ✅ Verify error handling
- ✅ Test with different scenarios (success, failure, edge cases)

### 4. Prepare Documentation

Have ready:
- Clear description of what your app does
- Justification for each requested scope
- Privacy policy explaining data usage
- Terms of service
- Support contact information

## Submission Checklist

Before clicking "Submit for Review":

- [ ] All app information fields completed
- [ ] Redirect URIs configured correctly
- [ ] OAuth scopes are minimal and justified
- [ ] OAuth flow tested and working
- [ ] API endpoints tested
- [ ] Privacy policy and terms of service URLs provided
- [ ] Support contact information provided
- [ ] App screenshots/demo available
- [ ] No security vulnerabilities
- [ ] Error handling implemented

## What Zid Team Reviews

### Security
- OAuth implementation correctness
- Token storage and handling
- API request security
- Data protection measures

### Functionality
- OAuth flow works correctly
- API endpoints function as expected
- Error handling is appropriate
- App performs stated functions

### Compliance
- Scopes requested are justified
- Privacy policy is clear and complete
- Terms of service are provided
- App follows Zid's policies

### User Experience
- Clear app description
- Easy to understand purpose
- Proper error messages
- Good user flow

## Common Rejection Reasons

1. **Missing Information**
   - Incomplete app details
   - Missing privacy policy or terms
   - No support contact

2. **OAuth Issues**
   - Incorrect redirect URIs
   - OAuth flow doesn't work
   - Token handling issues

3. **Scope Problems**
   - Requesting unnecessary scopes
   - Can't justify scope requirements
   - Scope format incorrect

4. **Security Concerns**
   - Vulnerable code
   - Poor token storage
   - Insecure API calls

5. **Policy Violations**
   - Doesn't comply with Zid policies
   - Privacy concerns
   - Terms violations

## After Submission

### Timeline
- **Review Time**: Typically 3-7 business days
- **Notification**: You'll receive email when review is complete
- **Status Update**: Check Partner Dashboard for status changes

### During Review
- You can still test with your own store
- Don't make major changes (wait for feedback)
- Check dashboard regularly for updates

### If Approved
- ✅ App status changes to "Published"
- ✅ Available to all Zid merchants
- ✅ Can start onboarding users
- ✅ OAuth works for everyone

### If Rejected
- 📧 Review feedback provided
- 🔍 Review feedback carefully
- 🔧 Fix identified issues
- 📤 Resubmit for review

## Resubmission Process

If your app is rejected:

1. **Read Feedback Carefully**
   - Understand what needs to be fixed
   - Contact Zid support if unclear

2. **Make Required Changes**
   - Fix all identified issues
   - Test thoroughly after changes

3. **Update App Information**
   - Update any changed details
   - Add any requested documentation

4. **Resubmit**
   - Click "Submit for Review" again
   - Wait for new review (typically faster)

## Development vs Production

### Development (Before Approval)
- ✅ Can test with your own Zid store
- ✅ OAuth works for app owner only
- ✅ Good for development and testing
- ❌ Other merchants cannot use the app

### Production (After Approval)
- ✅ Available to all Zid merchants
- ✅ OAuth works for everyone
- ✅ Can onboard users publicly
- ✅ App is published in Zid marketplace

## Tips for Faster Approval

1. **Be Thorough**: Complete all fields accurately
2. **Test Everything**: Ensure all functionality works
3. **Justify Scopes**: Explain why you need each scope
4. **Clear Documentation**: Make it easy to understand your app
5. **Follow Guidelines**: Read and follow Zid's app guidelines
6. **Security First**: Implement security best practices
7. **Respond Quickly**: If Zid asks questions, respond promptly

## Support

If you have questions about the review process:

- 📧 Contact Zid Partner Support
- 📚 Check Zid Partner Documentation
- 💬 Reach out in Zid Partner Community
- 🔍 Review rejection feedback carefully

## Current Status

To check your app's review status:

1. Go to [Zid Partner Dashboard](https://partner.zid.sa)
2. Navigate to your app
3. Check the status badge:
   - 📝 Draft
   - ⏳ Pending Review
   - ✅ Published
   - ❌ Rejected

## Next Steps

1. ✅ Complete all app information
2. ✅ Test OAuth flow thoroughly
3. ✅ Prepare all documentation
4. ✅ Submit for review
5. ⏳ Wait for Zid team approval
6. ✅ Start onboarding users after approval

---

**Remember**: The review process ensures quality and security for all Zid merchants. Take time to prepare your submission properly for the best chance of approval.

