import { PersonaId } from './types';

const PERSONA_COOKIE_NAME = 'space-bio-persona';
const ONBOARDING_COOKIE_NAME = 'space-bio-onboarding-complete';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Set persona cookie (client-side)
 */
export function setPersonaCookie(personaId: PersonaId): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${PERSONA_COOKIE_NAME}=${personaId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

/**
 * Get persona cookie (client-side)
 */
export function getPersonaCookie(): PersonaId | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const personaCookie = cookies.find(c => c.trim().startsWith(`${PERSONA_COOKIE_NAME}=`));

  if (personaCookie) {
    const value = personaCookie.split('=')[1].trim() as PersonaId;
    return ['scientist', 'manager', 'architect', 'default'].includes(value) ? value : null;
  }

  return null;
}

/**
 * Set onboarding complete cookie (client-side)
 */
export function setOnboardingCookie(complete: boolean): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${ONBOARDING_COOKIE_NAME}=${complete}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

/**
 * Get onboarding complete status (client-side)
 */
export function getOnboardingCookie(): boolean {
  if (typeof document === 'undefined') return false;

  const cookies = document.cookie.split(';');
  const onboardingCookie = cookies.find(c => c.trim().startsWith(`${ONBOARDING_COOKIE_NAME}=`));

  return onboardingCookie?.split('=')[1].trim() === 'true';
}

/**
 * Clear all persona cookies
 */
export function clearPersonaCookies(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${PERSONA_COOKIE_NAME}=; path=/; max-age=0`;
    document.cookie = `${ONBOARDING_COOKIE_NAME}=; path=/; max-age=0`;
  }
}

/**
 * LocalStorage utilities (client-side persistence)
 */
export const personaStorage = {
  setPersona(personaId: PersonaId): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PERSONA_COOKIE_NAME, personaId);
    }
  },

  getPersona(): PersonaId | null {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(PERSONA_COOKIE_NAME) as PersonaId;
    return ['scientist', 'manager', 'architect', 'default'].includes(value) ? value : null;
  },

  setOnboarding(complete: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_COOKIE_NAME, String(complete));
    }
  },

  getOnboarding(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_COOKIE_NAME) === 'true';
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PERSONA_COOKIE_NAME);
      localStorage.removeItem(ONBOARDING_COOKIE_NAME);
    }
  }
};
