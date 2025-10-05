"use client";

import { usePersona } from "@/lib/hooks/usePersona";
import { PERSONA_PRESETS } from "@/lib/persona/presets";
import { PersonaId } from "@/lib/persona/types";
import { Microscope, LayoutDashboard, Rocket, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

const PERSONA_ICONS = {
  scientist: Microscope,
  manager: LayoutDashboard,
  architect: Rocket,
  default: Microscope,
};

interface PersonaSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export function PersonaSwitcher({ open, onClose }: PersonaSwitcherProps) {
  const { currentPersona, setPersona } = usePersona();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const personas = [
    PERSONA_PRESETS.scientist,
    PERSONA_PRESETS.manager,
    PERSONA_PRESETS.architect,
  ];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  const handleSwitch = (personaId: PersonaId) => {
    setPersona(personaId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed top-20 right-8 z-50 w-80 animate-in slide-in-from-top-5 fade-in-0 duration-200"
      >
        <div className="bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] border-2 border-[rgba(0,180,216,0.3)] rounded-lg shadow-[0_0_30px_rgba(0,180,216,0.2)] p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(0,180,216,0.2)]">
            <h3 className="text-sm font-bold tracking-wider text-[var(--earth-blue)]">
              SWITCH MODE
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[rgba(0,180,216,0.1)] transition-colors"
              aria-label="Close switcher"
            >
              <X className="w-4 h-4 text-[var(--lunar-gray)]" />
            </button>
          </div>

          {/* Persona Options */}
          <div className="space-y-2">
            {personas.map((persona) => {
              const Icon = PERSONA_ICONS[persona.id];
              const isActive = currentPersona === persona.id;

              return (
                <button
                  key={persona.id}
                  onClick={() => handleSwitch(persona.id)}
                  className={`
                    group w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                    ${isActive
                      ? 'border-current shadow-[0_0_15px_var(--glow-color)]'
                      : 'border-transparent hover:border-[rgba(0,180,216,0.3)] hover:bg-[rgba(0,180,216,0.05)]'
                    }
                  `}
                  style={{
                    color: persona.color,
                    // @ts-ignore
                    '--glow-color': persona.glowColor
                  }}
                >
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                    style={{
                      background: `radial-gradient(circle, ${persona.color}20 0%, transparent 70%)`
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: persona.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold" style={{ color: persona.color }}>
                      {persona.emoji} {persona.label}
                    </div>
                    <div className="text-xs text-[var(--lunar-gray)] mt-0.5">
                      {persona.tagline}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)]">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer tip */}
          <div className="mt-4 pt-3 border-t border-[rgba(0,180,216,0.2)]">
            <p className="text-xs text-[var(--lunar-gray)] text-center font-mono">
              Your mode adapts tools & filters to your needs
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
