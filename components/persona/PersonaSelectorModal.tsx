"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PERSONA_PRESETS } from "@/lib/persona/presets";
import { PersonaId } from "@/lib/persona/types";
import { Microscope, LayoutDashboard, Rocket, Check } from "lucide-react";

interface PersonaSelectorModalProps {
  open: boolean;
  onSelect: (personaId: PersonaId) => void;
  onSkip?: () => void;
}

const PERSONA_ICONS = {
  scientist: Microscope,
  manager: LayoutDashboard,
  architect: Rocket,
  default: Microscope,
};

export function PersonaSelectorModal({ open, onSelect, onSkip }: PersonaSelectorModalProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(null);
  const [hoveredPersona, setHoveredPersona] = useState<PersonaId | null>(null);

  const personas = [
    PERSONA_PRESETS.scientist,
    PERSONA_PRESETS.manager,
    PERSONA_PRESETS.architect,
  ];

  const handleSelect = () => {
    if (selectedPersona) {
      onSelect(selectedPersona);
    }
  };

  const handleSkip = () => {
    onSelect('scientist'); // Default to scientist
    onSkip?.();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-6xl p-8" onClose={handleSkip}>
        <DialogHeader className="mb-8">
          <DialogTitle className="text-4xl font-bold tracking-wider text-center bg-gradient-to-r from-[var(--earth-blue)] to-[var(--solar-gold)] bg-clip-text text-transparent">
            WELCOME TO SPACE BIOLOGY KNOWLEDGE EXPLORER
          </DialogTitle>
          <DialogDescription className="text-center text-lg mt-4 text-[var(--lunar-gray)]">
            Choose your exploration mode to customize your experience
          </DialogDescription>
        </DialogHeader>

        {/* Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {personas.map((persona) => {
            const Icon = PERSONA_ICONS[persona.id];
            const isSelected = selectedPersona === persona.id;
            const isHovered = hoveredPersona === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona.id)}
                onMouseEnter={() => setHoveredPersona(persona.id)}
                onMouseLeave={() => setHoveredPersona(null)}
                className={`
                  group relative p-6 rounded-lg border-2 transition-all duration-150
                  ${isSelected
                    ? 'border-current scale-105 shadow-[0_0_30px_var(--glow-color)]'
                    : 'border-[rgba(0,180,216,0.3)] hover:scale-105 hover:border-current hover:shadow-[0_0_20px_var(--glow-color)]'
                  }
                  bg-gradient-to-b from-[rgba(11,14,19,0.95)] to-[rgba(6,8,16,0.98)]
                `}
                style={{
                  color: persona.color,
                  // @ts-ignore
                  '--glow-color': persona.glowColor
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] flex items-center justify-center animate-in zoom-in-0 duration-200">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Icon and Emoji */}
                <div className="flex items-center justify-center mb-4">
                  <div className={`
                    relative w-20 h-20 rounded-full flex items-center justify-center
                    ${isSelected || isHovered ? 'animate-pulse' : ''}
                  `}
                  style={{
                    background: `radial-gradient(circle, ${persona.color}20 0%, transparent 70%)`
                  }}>
                    <Icon className="w-10 h-10" style={{ color: persona.color }} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center mb-2" style={{ color: persona.color }}>
                  {persona.emoji} {persona.label}
                </h3>

                {/* Tagline */}
                <p className="text-sm text-center text-[var(--lunar-gray)] mb-4 font-mono">
                  {persona.tagline}
                </p>

                {/* Description */}
                <p className="text-sm text-center text-[var(--foreground)] mb-4">
                  {persona.description}
                </p>

                {/* Key Features */}
                <div className="space-y-2">
                  {persona.keyFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs text-[var(--lunar-gray)]"
                    >
                      <span className="mt-0.5" style={{ color: persona.color }}>▸</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Hover effect overlay */}
                <div className={`
                  absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-150
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                  background: `linear-gradient(135deg, ${persona.color}05 0%, transparent 50%)`
                }} />
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[rgba(0,180,216,0.2)]">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="text-[var(--lunar-gray)] border-[var(--lunar-gray)] hover:bg-[rgba(167,168,170,0.1)]"
          >
            Skip for now
          </Button>

          <Button
            onClick={handleSelect}
            disabled={!selectedPersona}
            className={`
              px-8 py-2 font-bold tracking-wider transition-all
              ${selectedPersona
                ? 'bg-gradient-to-r from-[var(--earth-blue)] to-[var(--nasa-blue)] text-white hover:shadow-[var(--glow-blue)] hover:scale-105'
                : 'bg-[rgba(11,61,145,0.3)] text-[var(--lunar-gray)] cursor-not-allowed'
              }
            `}
          >
            {selectedPersona ? `START AS ${PERSONA_PRESETS[selectedPersona].label.toUpperCase()}` : 'SELECT A MODE'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
