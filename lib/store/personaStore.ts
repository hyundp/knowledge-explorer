import { create } from 'zustand';
import { PersonaState, PersonaId } from '@/lib/persona/types';
import { getPersonaPreset } from '@/lib/persona/presets';
import { setPersonaCookie, getPersonaCookie, setOnboardingCookie, getOnboardingCookie, personaStorage } from '@/lib/persona/cookies';

/**
 * Persona store using Zustand
 * Manages persona state with cookie and localStorage persistence
 */
export const usePersonaStore = create<PersonaState>((set, get) => ({
  // Initial state - try to load from cookie/localStorage
  currentPersona: 'default',
  isOnboardingComplete: false,
  visibleAddons: [],

  /**
   * Set active persona
   */
  setPersona: (id: PersonaId) => {
    const preset = getPersonaPreset(id);

    // Update state
    set({
      currentPersona: id,
      visibleAddons: preset.enabledAddons
    });

    // Persist to cookie and localStorage
    setPersonaCookie(id);
    personaStorage.setPersona(id);

    // Log for debugging
    if (typeof window !== 'undefined') {
      console.log(`[Persona] Switched to: ${preset.label} (${id})`);
    }
  },

  /**
   * Mark onboarding as complete
   */
  setOnboardingComplete: (complete: boolean) => {
    set({ isOnboardingComplete: complete });
    setOnboardingCookie(complete);
    personaStorage.setOnboarding(complete);
  },

  /**
   * Toggle addon visibility
   */
  toggleAddon: (addonId: string) => {
    const { visibleAddons } = get();
    const newAddons = visibleAddons.includes(addonId)
      ? visibleAddons.filter(id => id !== addonId)
      : [...visibleAddons, addonId];

    set({ visibleAddons: newAddons });
  },

  /**
   * Reset to default persona
   */
  resetPersona: () => {
    set({
      currentPersona: 'default',
      isOnboardingComplete: false,
      visibleAddons: []
    });
    setPersonaCookie('default');
    setOnboardingCookie(false);
    personaStorage.clear();
  }
}));

/**
 * Initialize persona state from cookies/localStorage (client-side only)
 */
export function initializePersonaFromStorage() {
  if (typeof window === 'undefined') return;

  // Try cookie first, then localStorage
  const savedPersona = getPersonaCookie() || personaStorage.getPersona();
  const onboardingComplete = getOnboardingCookie() || personaStorage.getOnboarding();

  if (savedPersona) {
    const preset = getPersonaPreset(savedPersona);
    usePersonaStore.setState({
      currentPersona: savedPersona,
      isOnboardingComplete: onboardingComplete,
      visibleAddons: preset.enabledAddons
    });

    console.log(`[Persona] Restored from storage: ${preset.label}`);
  }
}
