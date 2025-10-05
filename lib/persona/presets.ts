import { PersonaPreset, AddonMetadata } from './types';

/**
 * Persona preset configurations
 */
export const PERSONA_PRESETS: Record<string, PersonaPreset> = {
  scientist: {
    id: 'scientist',
    label: 'Scientist',
    icon: 'Microscope',
    emoji: '🧬',
    color: 'var(--earth-blue)',
    glowColor: 'var(--glow-blue)',
    description: 'Dive into experimental findings and evidence',
    tagline: 'Evidence-First Research',
    keyFeatures: [
      'Assay-specific analysis tools',
      'Effect consistency tracking',
      'Detailed methodology review',
      'Publication quality metrics'
    ],
    enabledAddons: ['assay-lens', 'effect-consistency'],
    defaultFilters: {
      minEvidenceStrength: 0.7,
      assays: ['RNA-seq', 'qPCR'],
    }
  },
  manager: {
    id: 'manager',
    label: 'Program Manager',
    icon: 'LayoutDashboard',
    emoji: '🧩',
    color: 'var(--solar-gold)',
    glowColor: 'var(--glow-gold)',
    description: 'Identify research gaps and funding priorities',
    tagline: 'Strategic Oversight',
    keyFeatures: [
      'Coverage & gap analysis',
      'ROI estimation tools',
      'Resource allocation insights',
      'Priority recommendations'
    ],
    enabledAddons: ['coverage-map', 'gap-roi'],
    defaultFilters: {
      minSampleSize: 10,
      yearRange: [2020, 2024] as [number, number],
    }
  },
  architect: {
    id: 'architect',
    label: 'Mission Architect',
    icon: 'Rocket',
    emoji: '🚀',
    color: 'var(--mars-red)',
    glowColor: 'var(--glow-red)',
    description: 'Assess mission risks and design countermeasures',
    tagline: 'Mission-Critical Planning',
    keyFeatures: [
      'Risk assessment dashboard',
      'Countermeasure mapping',
      'Timeline simulations',
      'What-if scenario planning'
    ],
    enabledAddons: ['risk-readiness', 'countermeasure-map', 'what-if-simulation'],
    defaultFilters: {
      exposures: ['microgravity', 'radiation'],
      durations: ['60d', '90d'],
    }
  },
  default: {
    id: 'default',
    label: 'Explorer',
    icon: 'Compass',
    emoji: '🔍',
    color: 'var(--lunar-gray)',
    glowColor: 'var(--glow-subtle)',
    description: 'General exploration mode',
    tagline: 'Free Exploration',
    keyFeatures: [
      'All features available',
      'No preset filters',
      'Flexible analysis',
      'Custom workflows'
    ],
    enabledAddons: [],
    defaultFilters: {}
  }
};

/**
 * Addon metadata registry
 */
export const ADDON_REGISTRY: Record<string, AddonMetadata> = {
  // Scientist addons
  'assay-lens': {
    id: 'assay-lens',
    name: 'Assay Lens',
    description: 'Deep dive into assay-specific findings and methodologies',
    icon: 'TestTube',
    category: 'analysis',
    personaId: 'scientist',
    enabled: true
  },
  'effect-consistency': {
    id: 'effect-consistency',
    name: 'Effect Consistency Meter',
    description: 'Track consistency of effects across studies',
    icon: 'Activity',
    category: 'analysis',
    personaId: 'scientist',
    enabled: true
  },

  // Manager addons
  'coverage-map': {
    id: 'coverage-map',
    name: 'Coverage × Priority Map',
    description: 'Visual heatmap of research coverage vs priority areas',
    icon: 'Map',
    category: 'planning',
    personaId: 'manager',
    enabled: true
  },
  'gap-roi': {
    id: 'gap-roi',
    name: 'Gap ROI Estimator',
    description: 'Estimate return on investment for filling research gaps',
    icon: 'TrendingUp',
    category: 'planning',
    personaId: 'manager',
    enabled: true
  },

  // Architect addons
  'risk-readiness': {
    id: 'risk-readiness',
    name: 'Risk Readiness Level',
    description: 'Assess mission readiness based on research maturity',
    icon: 'Shield',
    category: 'risk',
    personaId: 'architect',
    enabled: true
  },
  'countermeasure-map': {
    id: 'countermeasure-map',
    name: 'Countermeasure Map',
    description: 'Map potential countermeasures to identified risks',
    icon: 'Network',
    category: 'risk',
    personaId: 'architect',
    enabled: true
  },
  'what-if-simulation': {
    id: 'what-if-simulation',
    name: 'What-If Simulation',
    description: 'Run scenario simulations for mission planning',
    icon: 'Play',
    category: 'planning',
    personaId: 'architect',
    enabled: true
  }
};

/**
 * Get preset by persona ID
 */
export function getPersonaPreset(personaId: string): PersonaPreset {
  return PERSONA_PRESETS[personaId] || PERSONA_PRESETS.default;
}

/**
 * Get addons for a specific persona
 */
export function getPersonaAddons(personaId: string): AddonMetadata[] {
  const preset = getPersonaPreset(personaId);
  return preset.enabledAddons
    .map(addonId => ADDON_REGISTRY[addonId])
    .filter(Boolean);
}
