import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
};

function errorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return null;
}

function ErrorState({
  title = "No pudimos cargar la información",
  description,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const detail = description ?? errorMessage(error) ?? "Intentá nuevamente en unos segundos.";

  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-52 flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/60 px-5 py-8 text-center",
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <h2 className="font-semibold text-red-950">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-red-800/80">{detail}</p>
      {onRetry ? (
        <Button className="mt-5" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

type QuerySkeletonProps = {
  rows?: number;
  className?: string;
};

function QuerySkeleton({ rows = 5, className }: QuerySkeletonProps) {
  return (
    <div
      className={cn("space-y-3 rounded-lg border bg-card p-5", className)}
      role="status"
      aria-label="Cargando contenido"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

type QueryStateProps = {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  isEmpty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
};

function QueryState({
  isLoading,
  isError = false,
  error,
  loadingFallback,
  errorFallback,
  emptyFallback,
  isEmpty = false,
  onRetry,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return loadingFallback ?? <QuerySkeleton />;
  }
  if (isError) {
    return errorFallback ?? <ErrorState error={error} onRetry={onRetry} />;
  }
  if (isEmpty && emptyFallback) {
    return emptyFallback;
  }
  return children;
}

export {
  ErrorState,
  QuerySkeleton,
  QueryState,
  type ErrorStateProps,
  type QuerySkeletonProps,
  type QueryStateProps,
};
