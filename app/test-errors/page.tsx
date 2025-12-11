'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { handleError, safeFetch, ErrorType } from '@/lib/error-handler'
import { useErrorHandler } from '@/lib/error-handler-hook'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import { useTranslations } from '@/lib/translations'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function TestErrorsPage() {
  const { handleError: handleErrorHook, handleNetworkError, handleApiError } = useErrorHandler()
  const { locale } = useLocale()
  const { t } = useTranslations()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Test 1: Network Error (Failed to fetch)
  const testNetworkError = async () => {
    try {
      addResult('Testing network error...')
      await safeFetch(
        'https://invalid-domain-that-does-not-exist-12345.com/api',
        {},
        { context: locale === 'ar' ? 'اختبار الشبكة' : 'Network test', locale }
      )
    } catch (error: any) {
      addResult(`Network error handled: ${error.type} - ${error.message}`)
    }
  }

  // Test 2: API Error (404 Not Found)
  const testNotFoundError = async () => {
    try {
      addResult('Testing 404 error...')
      await safeFetch(
        '/api/non-existent-endpoint',
        {},
        { context: locale === 'ar' ? 'اختبار غير موجود' : 'Not found test', locale }
      )
    } catch (error: any) {
      addResult(`404 error handled: ${error.type} - ${error.message}`)
    }
  }

  // Test 3: API Error (500 Server Error)
  const testServerError = async () => {
    try {
      addResult('Testing server error...')
      // This will fail because the endpoint doesn't exist, simulating a server error
      const response = await fetch('/api/test-server-error')
      if (!response.ok) {
        throw { status: 500, error: 'Internal server error' }
      }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار خطأ الخادم' : 'Server error test',
        showToast: true,
        locale
      })
      addResult(`Server error handled: ${error.type || 'UNKNOWN'} - ${error.message || error.error}`)
    }
  }

  // Test 4: Validation Error
  const testValidationError = () => {
    try {
      addResult('Testing validation error...')
      throw {
        message: 'Validation failed: email is required',
        code: 'VALIDATION_ERROR'
      }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار التحقق' : 'Validation test',
        showToast: true,
        locale
      })
      addResult(`Validation error handled: ${error.type || 'UNKNOWN'} - ${error.message}`)
    }
  }

  // Test 5: Auth Error (401)
  const testAuthError = async () => {
    try {
      addResult('Testing auth error...')
      const response = await fetch('/api/test-auth-error')
      if (!response.ok) {
        throw { status: 401, error: 'Unauthorized' }
      }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار المصادقة' : 'Auth test',
        showToast: true,
        locale
      })
      addResult(`Auth error handled: ${error.type || 'UNKNOWN'} - ${error.message || error.error}`)
    }
  }

  // Test 6: Permission Error (403)
  const testPermissionError = async () => {
    try {
      addResult('Testing permission error...')
      const response = await fetch('/api/test-permission-error')
      if (!response.ok) {
        throw { status: 403, error: 'Forbidden' }
      }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار الصلاحية' : 'Permission test',
        showToast: true,
        locale
      })
      addResult(`Permission error handled: ${error.type || 'UNKNOWN'} - ${error.message || error.error}`)
    }
  }

  // Test 7: Unknown Error
  const testUnknownError = () => {
    try {
      addResult('Testing unknown error...')
      throw new Error('This is a custom error message')
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار خطأ غير معروف' : 'Unknown error test',
        showToast: true,
        locale
      })
      addResult(`Unknown error handled: ${error.type || 'UNKNOWN'} - ${error.message}`)
    }
  }

  // Test 8: Silent Error (No Toast)
  const testSilentError = () => {
    try {
      addResult('Testing silent error (no toast)...')
      throw new Error('This error is logged but not shown to user')
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار خطأ صامت' : 'Silent error test',
        showToast: false,
        logError: true,
        locale
      })
      addResult(`Silent error handled: ${error.type || 'UNKNOWN'} - ${error.message}`)
    }
  }

  // Test 9: Using the Hook
  const testHookError = () => {
    try {
      addResult('Testing error handler hook...')
      throw new Error('Error from hook')
    } catch (error: any) {
      handleErrorHook(error, {
        context: locale === 'ar' ? 'اختبار الخطاف' : 'Hook test',
        showToast: true
      })
      addResult(`Hook error handled: ${error.type || 'UNKNOWN'} - ${error.message}`)
    }
  }

  // Test 10: Supabase-like Error
  const testSupabaseError = () => {
    try {
      addResult('Testing Supabase error...')
      throw {
        code: 'PGRST116',
        message: 'The requested record was not found',
        details: 'Record with id=123 does not exist'
      }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار Supabase' : 'Supabase test',
        showToast: true,
        locale
      })
      addResult(`Supabase error handled: ${error.type || 'UNKNOWN'} - ${error.message}`)
    }
  }

  // Test 11: Success Toast
  const testSuccessToast = () => {
    addResult(locale === 'ar' ? 'اختبار رسالة النجاح...' : 'Testing success toast...')
    toast.success(t.toast.success.syncCompleted, {
      description: t.toast.success.productsUpdated
    })
    addResult(locale === 'ar' ? 'تم عرض رسالة النجاح' : 'Success toast displayed')
  }

  // Test 12: Retry Action
  const testRetryAction = () => {
    let retryCount = 0
    const retryFunction = async () => {
      retryCount++
      addResult(`Retry attempt ${retryCount}...`)
      // Simulate a retryable error
      if (retryCount < 3) {
        throw { status: 500, error: 'Temporary server error' }
      } else {
        addResult('Retry succeeded!')
        toast.success(t.toast.success.retrySuccessful, {
          description: t.toast.success.operationCompleted
        })
      }
    }
    
    try {
      addResult('Testing retry action...')
      throw { status: 500, error: 'Temporary server error' }
    } catch (error: any) {
      handleError(error, {
        context: locale === 'ar' ? 'اختبار إعادة المحاولة' : 'Retry test',
        showToast: true,
        onRetry: retryFunction,
        locale
      })
      addResult(`Retry error handled: ${error.type || 'UNKNOWN'} - ${error.error}`)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>
              {locale === 'ar' ? 'صفحة اختبار معالج الأخطاء' : 'Error Handler Test Page'}
            </CardTitle>
            <LanguageSwitcher />
          </div>
          <CardDescription>
            {locale === 'ar' 
              ? 'اختبر سيناريوهات الأخطاء المختلفة للتحقق من عمل معالج الأخطاء الشامل بشكل صحيح. تحقق من وحدة التحكم للحصول على سجلات الأخطاء التفصيلية وشاهد إشعارات الرسائل.'
              : 'Test different error scenarios to verify the universal error handler is working correctly. Check the console for detailed error logs and watch for toast notifications.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Test Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button onClick={testNetworkError} variant="outline">
                Test Network Error
              </Button>
              <Button onClick={testNotFoundError} variant="outline">
                Test 404 Error
              </Button>
              <Button onClick={testServerError} variant="outline">
                Test Server Error
              </Button>
              <Button onClick={testValidationError} variant="outline">
                Test Validation Error
              </Button>
              <Button onClick={testAuthError} variant="outline">
                Test Auth Error
              </Button>
              <Button onClick={testPermissionError} variant="outline">
                Test Permission Error
              </Button>
              <Button onClick={testUnknownError} variant="outline">
                Test Unknown Error
              </Button>
              <Button onClick={testSilentError} variant="outline">
                Test Silent Error
              </Button>
              <Button onClick={testHookError} variant="outline">
                Test Hook Error
              </Button>
              <Button onClick={testSupabaseError} variant="outline">
                Test Supabase Error
              </Button>
              <Button onClick={testSuccessToast} variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
                Test Success Toast
              </Button>
              <Button onClick={testRetryAction} variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                Test Retry Action
              </Button>
              <Button 
                onClick={() => setTestResults([])} 
                variant="destructive"
                className="col-span-full"
              >
                Clear Results
              </Button>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="text-xs font-mono bg-gray-50 p-2 rounded border"
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">How to Test</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>1. Network Error:</strong> Click "Test Network Error" - Should show "Network connection failed" toast</p>
                <p><strong>2. 404 Error:</strong> Click "Test 404 Error" - Should show "The requested resource was not found" toast</p>
                <p><strong>3. Server Error:</strong> Click "Test Server Error" - Should show "Server error occurred" toast</p>
                <p><strong>4. Validation Error:</strong> Click "Test Validation Error" - Should show validation message toast</p>
                <p><strong>5. Auth Error:</strong> Click "Test Auth Error" - Should show "Authentication failed" toast</p>
                <p><strong>6. Permission Error:</strong> Click "Test Permission Error" - Should show "You don't have permission" toast</p>
                <p><strong>7. Silent Error:</strong> Click "Test Silent Error" - Should log to console but NOT show toast</p>
                <p><strong>8. Success Toast:</strong> Click "Test Success Toast" - Should show success toast with animated check icon</p>
                <p><strong>9. Action Buttons:</strong> Network errors show "Refresh", Auth errors show "Login", Server errors show "Retry/Refresh", Permission errors show "Contact Support"</p>
                <p><strong>10. Retry Action:</strong> Click "Test Retry Action" - Should show a retryable server error with "Retry" button</p>
                <p><strong>11. Check Console:</strong> Open browser DevTools to see detailed error logs</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

