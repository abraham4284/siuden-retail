import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex size-4 shrink-0 align-middle">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer size-4 appearance-none rounded border border-input bg-card shadow-sm transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 top-0.5 size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
      />
    </span>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
