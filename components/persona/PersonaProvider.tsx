"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersona } from "@/lib/hooks/usePersona";
import { PersonaSelectorModal } from "./PersonaSelectorModal";
import { PersonaId } from "@/lib/persona/types";

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const { isOnboardingComplete, setPersona, setOnboardingComplete } = usePersona();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Only run on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if we should show onboarding
  useEffect(() => {
    if (isClient && !isOnboardingComplete) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isClient, isOnboardingComplete]);

  const handlePersonaSelect = (personaId: PersonaId) => {
    setPersona(personaId);
    setOnboardingComplete(true);
    setShowOnboarding(false);

    // Navigate to persona page
    const routes: Record<PersonaId, string> = {
      scientist: '/scientist',
      manager: '/manager',
      architect: '/architect',
      default: '/'
    };

    const route = routes[personaId] || '/';
    router.push(route);
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      {isClient && (
        <PersonaSelectorModal
          open={showOnboarding}
          onSelect={handlePersonaSelect}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}
