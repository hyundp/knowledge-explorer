"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const removeOption = (option: string) => {
    onChange(value.filter((v) => v !== option));
  };

  return (
    <div className="relative">
      {/* Selected items */}
      <div
        className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {value.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 text-xs text-primary"
              >
                {item}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(item);
                  }}
                  className="hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
            {options.map((option) => (
              <div
                key={option}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-muted",
                  value.includes(option) && "bg-primary/10"
                )}
                onClick={() => toggleOption(option)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-4 w-4 rounded border-2",
                      value.includes(option)
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}
                  />
                  {option}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
