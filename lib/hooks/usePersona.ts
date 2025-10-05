import { useEffect } from 'react';
import { usePersonaStore, initializePersonaFromStorage } from '@/lib/store/personaStore';
import { getPersonaPreset } from '@/lib/persona/presets';
import { PersonaPreset } from '@/lib/persona/types';

/**
 * Custom hook for accessing persona state and utilities
 */
export function usePersona() {
  const {
    currentPersona,
    isOnboardingComplete,
    visibleAddons,
    setPersona,
    setOnboardingComplete,
    toggleAddon,
    resetPersona
  } = usePersonaStore();

  // Initialize from storage on mount (client-side only)
  useEffect(() => {
    initializePersonaFromStorage();
  }, []);

  // Get current persona preset
  const preset: PersonaPreset = getPersonaPreset(currentPersona);

  return {
    // State
    currentPersona,
    isOnboardingComplete,
    visibleAddons,
    preset,

    // Actions
    setPersona,
    setOnboardingComplete,
    toggleAddon,
    resetPersona,

    // Utilities
    isPersonaActive: (personaId: string) => currentPersona === personaId,
    isAddonVisible: (addonId: string) => visibleAddons.includes(addonId),
  };
}
