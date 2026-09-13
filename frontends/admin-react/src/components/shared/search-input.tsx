import * as React from "react";
import { Search, X } from "lucide-react";

import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<InputProps, "type"> & {
  containerClassName?: string;
  onClear?: () => void;
};

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      containerClassName,
      value,
      onClear,
      placeholder = "Buscar…",
      "aria-label": ariaLabel = "Buscar",
      ...props
    },
    ref,
  ) => {
    const hasValue =
      typeof value === "string" || typeof value === "number"
        ? String(value).length > 0
        : false;

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={ref}
          type="search"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn("pl-9", onClear && hasValue && "pr-10", className)}
          {...props}
        />
        {onClear && hasValue ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

export { SearchInput, type SearchInputProps };
