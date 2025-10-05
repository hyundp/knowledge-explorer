import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "mission-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-mono font-semibold tracking-wider uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--earth-blue)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[rgba(11,61,145,0.8)] to-[rgba(11,61,145,0.6)] text-white border border-[rgba(0,180,216,0.5)] hover:shadow-[var(--glow-blue)] hover:border-[var(--earth-blue)] hover:-translate-y-[1px]",
        secondary:
          "bg-gradient-to-r from-[rgba(252,61,33,0.8)] to-[rgba(252,61,33,0.6)] text-white border border-[rgba(252,61,33,0.5)] hover:shadow-[var(--glow-red)] hover:border-[var(--mars-red)]",
        outline:
          "border border-[rgba(0,180,216,0.5)] bg-[rgba(11,14,19,0.5)] text-[var(--earth-blue)] hover:bg-[rgba(0,180,216,0.1)] hover:text-white hover:shadow-[var(--glow-subtle)]",
        ghost:
          "text-[var(--lunar-gray)] hover:bg-[rgba(0,180,216,0.1)] hover:text-[var(--earth-blue)]",
        link:
          "text-[var(--earth-blue)] underline-offset-4 hover:underline hover:text-[var(--solar-gold)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-[10px]",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
