"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-700 text-slate-200",
        success: "bg-green-900 text-green-200",
        warning: "bg-yellow-900 text-yellow-200",
        danger: "bg-red-900 text-red-200",
        info: "bg-blue-900 text-blue-200",
        cyan: "bg-cyan-900 text-cyan-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, children, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
