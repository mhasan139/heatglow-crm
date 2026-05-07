import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[var(--badge-default-bg)]     text-[var(--badge-default-fg)]",
        secondary:   "bg-secondary text-secondary-foreground",
        destructive: "bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-fg)]",
        success:     "bg-[var(--badge-success-bg)]     text-[var(--badge-success-fg)]",
        warning:     "bg-[var(--badge-warning-bg)]     text-[var(--badge-warning-fg)]",
        info:        "bg-[var(--badge-info-bg)]        text-[var(--badge-info-fg)]",
        outline:     "border border-border text-foreground",
        slate:       "bg-[var(--badge-slate-bg)]       text-[var(--badge-slate-fg)]",
        purple:      "bg-[var(--badge-purple-bg)]      text-[var(--badge-purple-fg)]",
        teal:        "bg-[var(--badge-teal-bg)]        text-[var(--badge-teal-fg)]",
        indigo:      "bg-[var(--badge-indigo-bg)]      text-[var(--badge-indigo-fg)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
