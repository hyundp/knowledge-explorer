import { create } from 'zustand';

export interface FilterState {
  organisms: string[];
  tissues: string[];
  exposures: string[];
  durations: string[];
  assays: string[];
  yearRange: [number, number];
  minEvidenceStrength: number;
  minSampleSize: number;

  setOrganisms: (organisms: string[]) => void;
  setTissues: (tissues: string[]) => void;
  setExposures: (exposures: string[]) => void;
  setDurations: (durations: string[]) => void;
  setAssays: (assays: string[]) => void;
  setYearRange: (range: [number, number]) => void;
  setMinEvidenceStrength: (value: number) => void;
  setMinSampleSize: (value: number) => void;
  resetFilters: () => void;

  // Preset management
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  presets: Record<string, Partial<FilterState>>;
}

const defaultState = {
  organisms: [],
  tissues: [],
  exposures: [],
  durations: [],
  assays: [],
  yearRange: [2014, 2024] as [number, number],
  minEvidenceStrength: 0,
  minSampleSize: 0,
  presets: {
    'Mouse Muscle Studies': {
      organisms: ['Mus musculus'],
      tissues: ['Skeletal muscle tissue'],
    },
    'Long-Duration ISS': {
      exposures: ['microgravity'],
      durations: ['60d', '90d'],
    },
  },
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...defaultState,

  setOrganisms: (organisms) => set({ organisms }),
  setTissues: (tissues) => set({ tissues }),
  setExposures: (exposures) => set({ exposures }),
  setDurations: (durations) => set({ durations }),
  setAssays: (assays) => set({ assays }),
  setYearRange: (yearRange) => set({ yearRange }),
  setMinEvidenceStrength: (minEvidenceStrength) => set({ minEvidenceStrength }),
  setMinSampleSize: (minSampleSize) => set({ minSampleSize }),

  resetFilters: () => set(defaultState),

  savePreset: (name) => {
    const current = get();
    set({
      presets: {
        ...current.presets,
        [name]: {
          organisms: current.organisms,
          tissues: current.tissues,
          exposures: current.exposures,
          durations: current.durations,
          assays: current.assays,
          yearRange: current.yearRange,
          minEvidenceStrength: current.minEvidenceStrength,
          minSampleSize: current.minSampleSize,
        },
      },
    });
  },

  loadPreset: (name) => {
    const preset = get().presets[name];
    if (preset) {
      set(preset);
    }
  },
}));
