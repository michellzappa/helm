import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium";

    const variants: Record<string, string> = {
      default:   "bg-surface text-foreground border border-border",
      secondary: "bg-muted text-muted-foreground border border-border",
      outline:   "bg-transparent text-foreground border border-border",
    };

    return (
      <div
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
