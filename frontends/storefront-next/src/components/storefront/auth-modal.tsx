"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "./icons";

export type AuthView = "register" | "login";

type AuthModalProps = {
  onClose: () => void;
  onViewChange: (view: AuthView) => void;
  view: AuthView;
};

type FieldProps = {
  autoComplete: string;
  className?: string;
  id: string;
  label: string;
  name: string;
  required?: boolean;
  type?: "email" | "password" | "tel" | "text";
};

function AuthField({ autoComplete, className = "", id, label, name, required = false, type = "text" }: FieldProps) {
  return (
    <label className={`block text-sm ${className}`} htmlFor={id}>
      <span className="mb-2 block text-xs font-medium text-[var(--store-muted)]">{label}</span>
      <input
        autoComplete={autoComplete}
        className="min-h-12 w-full border border-[var(--store-hairline)] bg-white px-3 outline-none transition-colors focus:border-[var(--store-primary)]"
        id={id}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

export function AuthModal({ onClose, onViewChange, view }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const statusId = useId();
  const [message, setMessage] = useState("");
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current = dialogRef.current?.querySelector("input") ?? null;
      firstInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const changeView = (nextView: AuthView) => {
    setMessage("");
    onViewChange(nextView);
    window.requestAnimationFrame(() => {
      firstInputRef.current = dialogRef.current?.querySelector("input") ?? null;
      firstInputRef.current?.focus();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    if (view === "register" && data.get("password") !== data.get("passwordConfirmation")) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setMessage(
      view === "register"
        ? "El formulario está listo. Falta conectar el servicio de creación de cuentas."
        : "El formulario está listo. Falta conectar el servicio de inicio de sesión.",
    );
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto px-4 py-8 sm:px-6">
      <button
        aria-label="Cerrar ventana"
        className="fixed inset-0 cursor-default bg-[var(--store-backdrop)]"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-describedby={message ? statusId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 w-full max-w-[42rem] bg-[var(--store-surface)] shadow-[0_24px_80px_var(--store-shadow-strong)]"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex min-h-20 items-center justify-between gap-5 border-b border-[var(--store-hairline)] px-6 sm:px-8">
          <h2 className="font-[family-name:var(--store-heading-font)] text-2xl font-normal sm:text-3xl" id={titleId}>
            {view === "register" ? "Crear cuenta" : "Iniciar sesión"}
          </h2>
          <button aria-label="Cerrar" className="icon-action grid shrink-0" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-6 py-7 sm:grid-cols-2 sm:px-8 sm:py-8">
            {view === "register" ? (
              <>
                <AuthField autoComplete="given-name" id="register-first-name" label="Nombre" name="firstName" required />
                <AuthField autoComplete="family-name" id="register-last-name" label="Apellido" name="lastName" required />
                <AuthField autoComplete="email" className="sm:col-span-2" id="register-email" label="Email" name="email" required type="email" />
                <AuthField autoComplete="tel" className="sm:col-span-2" id="register-phone" label="Teléfono (opcional)" name="phone" type="tel" />
                <AuthField autoComplete="new-password" id="register-password" label="Contraseña" name="password" required type="password" />
                <AuthField autoComplete="new-password" id="register-password-confirmation" label="Repetir contraseña" name="passwordConfirmation" required type="password" />
              </>
            ) : (
              <>
                <AuthField autoComplete="email" className="sm:col-span-2" id="login-email" label="Email" name="email" required type="email" />
                <AuthField autoComplete="current-password" className="sm:col-span-2" id="login-password" label="Contraseña" name="password" required type="password" />
                <div className="flex flex-col items-end gap-2 text-sm sm:col-span-2">
                  <button
                    className="underline underline-offset-4 hover:text-[var(--store-primary)]"
                    onClick={() => setMessage("La recuperación de contraseña estará disponible al conectar el servicio de cuentas.")}
                    type="button"
                  >
                    ¿Ha olvidado su contraseña? Recuperar
                  </button>
                  <button className="underline underline-offset-4 hover:text-[var(--store-primary)]" onClick={() => changeView("register")} type="button">
                    ¿Aún no tiene cuenta? Crear cuenta
                  </button>
                </div>
              </>
            )}

            {message ? (
              <p className="border border-[var(--store-hairline)] bg-[var(--store-background)] px-4 py-3 text-sm leading-5 text-[var(--store-muted)] sm:col-span-2" id={statusId} role="status">
                {message}
              </p>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[var(--store-hairline)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            {view === "register" ? (
              <button className="text-sm underline underline-offset-4 hover:text-[var(--store-primary)]" onClick={() => changeView("login")} type="button">
                Ya tengo cuenta
              </button>
            ) : <span />}
            <button className="primary-button min-w-52 uppercase" type="submit">
              {view === "register" ? "Crear cuenta" : "Ingresar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
