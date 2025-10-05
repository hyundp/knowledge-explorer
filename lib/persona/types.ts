import { FilterState } from "@/lib/store/filterStore";

/**
 * Persona identifier types
 */
export type PersonaId = 'scientist' | 'manager' | 'architect' | 'default';

/**
 * Persona configuration interface
 */
export interface PersonaPreset {
  id: PersonaId;
  label: string;
  icon: string;
  emoji: string; // For display
  color: string; // CSS variable name
  glowColor: string; // CSS variable for glow effect
  description: string;
  tagline: string;
  keyFeatures: string[];
  enabledAddons: string[];
  defaultFilters?: Partial<FilterState>;
}

/**
 * Addon metadata interface
 */
export interface AddonMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'analysis' | 'visualization' | 'planning' | 'risk';
  personaId: PersonaId;
  enabled: boolean;
}

/**
 * Persona state interface
 */
export interface PersonaState {
  currentPersona: PersonaId;
  isOnboardingComplete: boolean;
  visibleAddons: string[];
  setPersona: (id: PersonaId) => void;
  setOnboardingComplete: (complete: boolean) => void;
  toggleAddon: (addonId: string) => void;
  resetPersona: () => void;
}
