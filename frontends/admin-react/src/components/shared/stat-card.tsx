import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-accent text-accent-foreground",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {hint ? <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              toneClasses[tone],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StatCard, type StatCardProps };
