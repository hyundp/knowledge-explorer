import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

interface EvidenceBadgeProps {
  strength: number; // 0-1
  sampleSize?: number;
  className?: string;
  showLabel?: boolean;
}

export function EvidenceBadge({
  strength,
  sampleSize,
  className,
  showLabel = true,
}: EvidenceBadgeProps) {
  const getQualityLevel = () => {
    if (strength >= 0.8) return {
      label: "HIGH",
      color: "text-[var(--solar-gold)]",
      bgColor: "bg-[var(--solar-gold)]",
      icon: CheckCircle2
    };
    if (strength >= 0.6) return {
      label: "MEDIUM",
      color: "text-[var(--earth-blue)]",
      bgColor: "bg-[var(--earth-blue)]",
      icon: AlertCircle
    };
    return {
      label: "LOW",
      color: "text-[var(--mars-red)]",
      bgColor: "bg-[var(--mars-red)]",
      icon: HelpCircle
    };
  };

  const quality = getQualityLevel();
  const Icon = quality.icon;

  return (
    <div className={cn("inline-flex items-center gap-2 rounded px-2 py-1", quality.bgColor, "bg-opacity-20", className)}>
      <Icon className={cn("h-4 w-4", quality.color)} />
      {showLabel && (
        <>
          <span className={cn("text-xs font-bold uppercase tracking-wider", quality.color)}>
            {quality.label} ({(strength * 100).toFixed(0)}%)
          </span>
          {sampleSize !== undefined && (
            <span className="ml-1 text-xs font-bold text-white">
              N={sampleSize}
            </span>
          )}
        </>
      )}
    </div>
  );
}

interface EvidenceColorProps {
  strength: number;
  children: React.ReactNode;
  className?: string;
}

export function EvidenceColorBox({ strength, children, className }: EvidenceColorProps) {
  const getBackgroundColor = () => {
    if (strength >= 0.8) return "bg-[var(--solar-gold)]/20 border-[var(--solar-gold)] shadow-[0_0_10px_rgba(254,183,20,0.3)]";
    if (strength >= 0.6) return "bg-[var(--earth-blue)]/20 border-[var(--earth-blue)] shadow-[0_0_10px_rgba(0,180,216,0.3)]";
    return "bg-[var(--mars-red)]/20 border-[var(--mars-red)] shadow-[0_0_10px_rgba(252,61,33,0.3)]";
  };

  return (
    <div className={cn("rounded-lg border-2", getBackgroundColor(), className)}>
      {children}
    </div>
  );
}
