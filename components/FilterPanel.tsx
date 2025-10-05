"use client";

import { useFilterStore } from "@/lib/store/filterStore";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Filter, RotateCcw } from "lucide-react";

export function FilterPanel() {
  const {
    yearRange,
    minSampleSize,
    setYearRange,
    setMinSampleSize,
    resetFilters,
  } = useFilterStore();

  const activeFiltersCount =
    ((yearRange[0] !== 2014 || yearRange[1] !== 2024) ? 1 : 0) +
    (minSampleSize > 0 ? 1 : 0);

  return (
    <Card className="border-2 border-[rgba(0,180,216,0.3)] bg-gradient-to-b from-[rgba(11,14,19,0.98)] to-[rgba(6,8,16,0.95)] shadow-[0_0_30px_rgba(0,180,216,0.1)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[var(--earth-blue)]">
              <Filter className="h-5 w-5" />
              FILTER CONTROL
            </CardTitle>
            <CardDescription className="text-[var(--lunar-gray)]">
              {activeFiltersCount} active filter{activeFiltersCount !== 1 && "s"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="border-[var(--earth-blue)] text-[var(--earth-blue)] hover:bg-[var(--earth-blue)] hover:text-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Year Range */}
        <div>
          <label className="mb-2 block text-sm font-bold tracking-wider text-[var(--earth-blue)]">
            YEAR RANGE: {yearRange[0]} - {yearRange[1]}
          </label>
          <Slider
            min={2014}
            max={2024}
            step={1}
            value={yearRange}
            onValueChange={(value) => setYearRange(value as [number, number])}
            className="mt-2"
          />
        </div>

        {/* Sample Size */}
        <div>
          <label className="mb-2 block text-sm font-bold tracking-wider text-[var(--earth-blue)]">
            MINIMUM SAMPLE SIZE: {minSampleSize}
          </label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[minSampleSize]}
            onValueChange={(value) => setMinSampleSize(value[0])}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
