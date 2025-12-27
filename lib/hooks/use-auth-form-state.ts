/**
 * Custom hook to manage auth form state using useReducer
 * This simplifies state management for the complex AuthForm component
 */

import { useReducer, useCallback } from 'react'

export interface AuthFormState {
  email: string
  isLoading: boolean
  isGoogleLoading: boolean
  emailError: string
  emailCheckStatus: {
    exists: boolean | null
    isMerchant: boolean | null
    shouldLogin: boolean
    shouldSignup: boolean
    message?: string
  } | null
  isCheckingEmail: boolean
  accountNotFound: boolean
  otpSent: boolean
  otp: string[]
  isVerifying: boolean
  otpError: string
  showOtp: boolean
  resendTimer: number
  canResend: boolean
}

type AuthFormAction =
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_GOOGLE_LOADING'; payload: boolean }
  | { type: 'SET_EMAIL_ERROR'; payload: string }
  | { type: 'SET_EMAIL_CHECK_STATUS'; payload: AuthFormState['emailCheckStatus'] }
  | { type: 'SET_CHECKING_EMAIL'; payload: boolean }
  | { type: 'SET_ACCOUNT_NOT_FOUND'; payload: boolean }
  | { type: 'SET_OTP_SENT'; payload: boolean }
  | { type: 'SET_OTP'; payload: string[] }
  | { type: 'SET_VERIFYING'; payload: boolean }
  | { type: 'SET_OTP_ERROR'; payload: string }
  | { type: 'SET_SHOW_OTP'; payload: boolean }
  | { type: 'SET_RESEND_TIMER'; payload: number }
  | { type: 'SET_CAN_RESEND'; payload: boolean }
  | { type: 'RESET_OTP' }
  | { type: 'RESET_FORM' }

const initialState: AuthFormState = {
  email: '',
  isLoading: false,
  isGoogleLoading: false,
  emailError: '',
  emailCheckStatus: null,
  isCheckingEmail: false,
  accountNotFound: false,
  otpSent: false,
  otp: ['', '', '', '', '', ''],
  isVerifying: false,
  otpError: '',
  showOtp: false,
  resendTimer: 0,
  canResend: false,
}

function authFormReducer(
  state: AuthFormState,
  action: AuthFormAction
): AuthFormState {
  switch (action.type) {
    case 'SET_EMAIL':
      return { ...state, email: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_GOOGLE_LOADING':
      return { ...state, isGoogleLoading: action.payload }
    case 'SET_EMAIL_ERROR':
      return { ...state, emailError: action.payload }
    case 'SET_EMAIL_CHECK_STATUS':
      return { ...state, emailCheckStatus: action.payload }
    case 'SET_CHECKING_EMAIL':
      return { ...state, isCheckingEmail: action.payload }
    case 'SET_ACCOUNT_NOT_FOUND':
      return { ...state, accountNotFound: action.payload }
    case 'SET_OTP_SENT':
      return { ...state, otpSent: action.payload }
    case 'SET_OTP':
      return { ...state, otp: action.payload }
    case 'SET_VERIFYING':
      return { ...state, isVerifying: action.payload }
    case 'SET_OTP_ERROR':
      return { ...state, otpError: action.payload }
    case 'SET_SHOW_OTP':
      return { ...state, showOtp: action.payload }
    case 'SET_RESEND_TIMER':
      return { ...state, resendTimer: action.payload }
    case 'SET_CAN_RESEND':
      return { ...state, canResend: action.payload }
    case 'RESET_OTP':
      return {
        ...state,
        otp: ['', '', '', '', '', ''],
        otpError: '',
        otpSent: false,
        showOtp: false,
      }
    case 'RESET_FORM':
      return initialState
    default:
      return state
  }
}

/**
 * Custom hook for managing auth form state
 * Provides state and actions for the AuthForm component
 */
export function useAuthFormState() {
  const [state, dispatch] = useReducer(authFormReducer, initialState)

  const actions = {
    setEmail: useCallback((email: string) => {
      dispatch({ type: 'SET_EMAIL', payload: email })
    }, []),
    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading })
    }, []),
    setGoogleLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_GOOGLE_LOADING', payload: loading })
    }, []),
    setEmailError: useCallback((error: string) => {
      dispatch({ type: 'SET_EMAIL_ERROR', payload: error })
    }, []),
    setEmailCheckStatus: useCallback((status: AuthFormState['emailCheckStatus']) => {
      dispatch({ type: 'SET_EMAIL_CHECK_STATUS', payload: status })
    }, []),
    setCheckingEmail: useCallback((checking: boolean) => {
      dispatch({ type: 'SET_CHECKING_EMAIL', payload: checking })
    }, []),
    setAccountNotFound: useCallback((notFound: boolean) => {
      dispatch({ type: 'SET_ACCOUNT_NOT_FOUND', payload: notFound })
    }, []),
    setOtpSent: useCallback((sent: boolean) => {
      dispatch({ type: 'SET_OTP_SENT', payload: sent })
    }, []),
    setOtp: useCallback((otp: string[]) => {
      dispatch({ type: 'SET_OTP', payload: otp })
    }, []),
    setVerifying: useCallback((verifying: boolean) => {
      dispatch({ type: 'SET_VERIFYING', payload: verifying })
    }, []),
    setOtpError: useCallback((error: string) => {
      dispatch({ type: 'SET_OTP_ERROR', payload: error })
    }, []),
    setShowOtp: useCallback((show: boolean) => {
      dispatch({ type: 'SET_SHOW_OTP', payload: show })
    }, []),
    setResendTimer: useCallback((timer: number) => {
      dispatch({ type: 'SET_RESEND_TIMER', payload: timer })
    }, []),
    setCanResend: useCallback((canResend: boolean) => {
      dispatch({ type: 'SET_CAN_RESEND', payload: canResend })
    }, []),
    resetOtp: useCallback(() => {
      dispatch({ type: 'RESET_OTP' })
    }, []),
    resetForm: useCallback(() => {
      dispatch({ type: 'RESET_FORM' })
    }, []),
  }

  return { state, actions }
}

