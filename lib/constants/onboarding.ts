/**
 * Onboarding step constants
 * Centralized definitions to avoid duplication and magic strings
 */

/**
 * Onboarding step IDs
 */
export const ONBOARDING_STEPS = {
  PERSONAL_DETAILS: 'personal-details',
  BUSINESS_SETUP: 'business-setup',
  SUMMARY: 'summary',
} as const;

/**
 * Type for onboarding step ID
 */
export type OnboardingStepId = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

/**
 * Array of valid step IDs in order
 */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStepId[] = [
  ONBOARDING_STEPS.PERSONAL_DETAILS,
  ONBOARDING_STEPS.BUSINESS_SETUP,
  ONBOARDING_STEPS.SUMMARY,
] as const;

/**
 * Step mapping for database onboarding_step values
 * Maps database values to step IDs
 */
export const ONBOARDING_STEP_MAPPING: Record<string, OnboardingStepId> = {
  [ONBOARDING_STEPS.PERSONAL_DETAILS]: ONBOARDING_STEPS.PERSONAL_DETAILS,
  [ONBOARDING_STEPS.BUSINESS_SETUP]: ONBOARDING_STEPS.BUSINESS_SETUP,
  [ONBOARDING_STEPS.SUMMARY]: ONBOARDING_STEPS.SUMMARY,
} as const;

/**
 * Get the default step (first step)
 */
export const DEFAULT_ONBOARDING_STEP: OnboardingStepId = ONBOARDING_STEPS.PERSONAL_DETAILS;

/**
 * Get step index from step ID
 */
export function getStepIndex(stepId: OnboardingStepId): number {
  return ONBOARDING_STEP_ORDER.indexOf(stepId);
}

/**
 * Get step ID from index
 */
export function getStepId(index: number): OnboardingStepId | null {
  return ONBOARDING_STEP_ORDER[index] || null;
}

/**
 * Get next step ID
 */
export function getNextStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_STEP_ORDER.length - 1) {
    return null;
  }
  return ONBOARDING_STEP_ORDER[currentIndex + 1];
}

/**
 * Get previous step ID
 */
export function getPreviousStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_STEP_ORDER[currentIndex - 1];
}

/**
 * Check if step ID is valid
 */
export function isValidStep(stepId: string): stepId is OnboardingStepId {
  return ONBOARDING_STEP_ORDER.includes(stepId as OnboardingStepId);
}

/**
 * Get onboarding URL path for a step
 */
export function getOnboardingStepPath(stepId: OnboardingStepId): string {
  return `/onboarding/${stepId}`;
}

