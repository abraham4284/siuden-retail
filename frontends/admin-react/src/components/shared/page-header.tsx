import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
};

function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {item.href && !isCurrent ? (
                    <a
                      href={item.href}
                      className="rounded-sm transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export { PageHeader, type BreadcrumbItem, type PageHeaderProps };
