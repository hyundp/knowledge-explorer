"use client";

import { useMemo } from "react";
import type { EffectSize } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

interface ForestPlotProps {
  effectSizes: EffectSize[];
  meanEffect: number;
}

export function ForestPlot({ effectSizes, meanEffect }: ForestPlotProps) {
  // Calculate plot dimensions
  const { minValue, maxValue } = useMemo(() => {
    const allValues = effectSizes.flatMap((e) => [e.ci_lower, e.ci_upper, e.magnitude]);
    const min = Math.min(...allValues, meanEffect);
    const max = Math.max(...allValues, meanEffect);
    const padding = (max - min) * 0.1;
    return {
      minValue: min - padding,
      maxValue: max + padding,
    };
  }, [effectSizes, meanEffect]);

  const getX = (value: number) => {
    return ((value - minValue) / (maxValue - minValue)) * 100;
  };

  return (
    <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-wider">
          <span className="text-[var(--earth-blue)]">FOREST</span>{" "}
          <span className="text-white">PLOT</span>
        </CardTitle>
        <CardDescription className="text-[var(--lunar-gray)] text-sm">
          Effect sizes with 95% confidence intervals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend moved to top */}
        <div className="mb-6 flex items-center gap-6 text-xs pb-4 border-b border-[rgba(0,180,216,0.2)]">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#14b8a6]" />
            <span className="text-[var(--lunar-gray)]">Decrease</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#f97316]" />
            <span className="text-[var(--lunar-gray)]">Increase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-foreground/60" />
            <span className="text-[var(--lunar-gray)]">95% CI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-[var(--earth-blue)]" />
            <span className="text-[var(--lunar-gray)]">Mean Effect</span>
          </div>
        </div>

        <div className="space-y-1">
          {/* Table Header */}
          <div className="flex items-center gap-3 pb-3 text-xs font-bold tracking-wider text-[var(--earth-blue)] border-b border-[rgba(0,180,216,0.3)]">
            <div className="flex-[4] min-w-0">STUDY</div>
            <div className="w-16 text-center flex-shrink-0">YEAR</div>
            <div className="w-16 text-center flex-shrink-0">N</div>
            <div className="w-20 text-center flex-shrink-0">EFFECT</div>
            <div className="w-24 text-center flex-shrink-0">P-VALUE</div>
            <div className="w-20 text-center flex-shrink-0">LINK</div>
          </div>

          {/* Data Rows */}
          {effectSizes.map((effect) => (
            <div key={effect.pmcid} className="group">
              <div className="flex items-center gap-3 py-2 hover:bg-[rgba(0,180,216,0.05)] rounded transition-colors">
                <div className="flex-[4] min-w-0 text-sm truncate text-[var(--lunar-gray)] group-hover:text-white transition-colors pr-2" title={effect.title}>
                  {effect.title}
                </div>
                <div className="w-16 text-center text-sm font-mono text-[var(--lunar-gray)] flex-shrink-0">
                  {effect.year}
                </div>
                <div className="w-16 text-center text-sm font-mono text-[var(--lunar-gray)] flex-shrink-0">
                  {effect.sample_size}
                </div>
                <div className="w-20 text-center text-sm font-mono font-bold text-white flex-shrink-0">
                  {effect.magnitude.toFixed(2)}
                </div>
                <div className="w-24 text-center text-xs font-mono text-[var(--lunar-gray)] flex-shrink-0">
                  {effect.p_value.toFixed(4)}
                </div>
                <div className="w-20 flex justify-center flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://www.ncbi.nlm.nih.gov/pmc/articles/${effect.pmcid}/`, "_blank")}
                    className="h-7 px-2 text-xs border-[rgba(0,180,216,0.3)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white transition-all"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Visualization below the row */}
              <div className="relative h-8 mt-1 mb-3">
                {/* Zero line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.2)]"
                  style={{ left: `${getX(0)}%` }}
                />

                {/* Mean line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--earth-blue)]"
                  style={{ left: `${getX(meanEffect)}%` }}
                />

                {/* Confidence interval */}
                <div
                  className="absolute top-1/2 h-0.5 bg-[var(--lunar-gray)]"
                  style={{
                    left: `${getX(effect.ci_lower)}%`,
                    right: `${100 - getX(effect.ci_upper)}%`,
                  }}
                />

                {/* Point estimate */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-[rgba(11,14,19,0.8)] shadow-lg"
                  style={{
                    left: `${getX(effect.magnitude)}%`,
                    backgroundColor:
                      effect.direction === "increase"
                        ? "#f97316"
                        : effect.direction === "decrease"
                        ? "#14b8a6"
                        : "#94a3b8",
                  }}
                />
              </div>
            </div>
          ))}

          {/* Summary Row */}
          <div className="mt-6 pt-6 border-t-2 border-[rgba(0,180,216,0.3)]">
            <div className="flex items-center gap-3 pb-2">
              <div className="flex-[4] min-w-0 text-sm font-bold tracking-wider text-[var(--earth-blue)]">
                OVERALL EFFECT
              </div>
              <div className="w-16 flex-shrink-0" />
              <div className="w-16 flex-shrink-0" />
              <div className="w-20 text-center text-base font-mono font-bold text-[var(--solar-gold)] flex-shrink-0">
                {meanEffect.toFixed(2)}
              </div>
              <div className="w-24 flex-shrink-0" />
              <div className="w-20 flex-shrink-0" />
            </div>

            <div className="relative h-10 mt-1">
              <div
                className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.2)]"
                style={{ left: `${getX(0)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[var(--earth-blue)] shadow-lg border-2 border-[rgba(0,180,216,0.5)]"
                style={{ left: `${getX(meanEffect)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
