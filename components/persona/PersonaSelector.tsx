"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePersona } from "@/lib/hooks/usePersona";
import { ChevronDown } from "lucide-react";
import { PERSONA_PRESETS } from "@/lib/persona/presets";

export function PersonaSelector() {
  const { currentPersona, setPersona, preset } = usePersona();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSelect = (personaId: string) => {
    setPersona(personaId as any);
    setIsOpen(false);

    // Navigate to persona page
    const routes: Record<string, string> = {
      scientist: '/scientist',
      manager: '/manager',
      architect: '/architect',
      default: '/'
    };

    const route = routes[personaId] || '/';
    router.push(route);
  };

  return (
    <div className="border-b border-[rgba(0,180,216,0.2)] px-4 py-3 relative">
      <div className="text-xs text-muted-foreground mb-2 tracking-wider">PERSONA MODE</div>

      {/* Current Persona Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[rgba(0,180,216,0.1)] hover:bg-[rgba(0,180,216,0.15)] border border-[rgba(0,180,216,0.3)] rounded px-3 py-2 transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{preset?.emoji || '🔲'}</span>
          <span className="text-xs font-semibold text-white tracking-wider">
            {preset?.label || 'DEFAULT MODE'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-[var(--earth-blue)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-4 right-4 mt-2 bg-[rgba(11,14,19,0.98)] border border-[rgba(0,180,216,0.3)] rounded shadow-lg z-30 overflow-hidden">
            {Object.values(PERSONA_PRESETS).map((persona) => (
              <button
                key={persona.id}
                onClick={() => handleSelect(persona.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                  currentPersona === persona.id
                    ? 'bg-[rgba(0,180,216,0.2)] border-l-2 border-[var(--earth-blue)]'
                    : 'hover:bg-[rgba(0,180,216,0.1)]'
                }`}
              >
                <span className="text-lg">{persona.emoji}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white tracking-wider">
                    {persona.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {persona.tagline}
                  </div>
                </div>
                {currentPersona === persona.id && (
                  <span className="led-status active" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
