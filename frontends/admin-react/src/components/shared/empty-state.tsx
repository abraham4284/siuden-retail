import type { ReactNode } from "react";
import { PackageOpen, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
};

function EmptyState({
  title,
  description,
  action,
  icon: Icon = PackageOpen,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/60 px-5 text-center",
        compact ? "min-h-48 py-8" : "min-h-72 py-12",
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
