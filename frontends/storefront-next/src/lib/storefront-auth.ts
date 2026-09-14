export type StorefrontSession = {
  user: { id: string; email: string; displayName: string };
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
  };
  tenant: { id: string; slug: string; name: string };
};

export type StorefrontRegisterInput = {
  tenantSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};

export type StorefrontLoginInput = {
  tenantSlug: string;
  email: string;
  password: string;
};

type ApiErrorPayload = { message?: string | string[] };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Preserve the status fallback when the server does not return JSON.
    }
    const messages = Array.isArray(payload?.message)
      ? payload.message
      : [payload?.message];
    throw new Error(
      messages.filter(Boolean).join(" ") ||
        `La API respondió con estado ${response.status}.`,
    );
  }
  return (await response.json()) as T;
}

export async function registerStorefrontCustomer(
  input: StorefrontRegisterInput,
): Promise<StorefrontSession> {
  const response = await request<{ session: StorefrontSession }>(
    "/storefront/auth/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.session;
}

export async function loginStorefrontCustomer(
  input: StorefrontLoginInput,
): Promise<StorefrontSession> {
  const response = await request<{ session: StorefrontSession }>(
    "/storefront/auth/login",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.session;
}

export async function getStorefrontSession(): Promise<StorefrontSession | null> {
  try {
    return await request<StorefrontSession>("/storefront/auth/me");
  } catch {
    return null;
  }
}

export async function logoutStorefrontCustomer(): Promise<void> {
  await request<{ message: string }>("/storefront/auth/logout", {
    method: "POST",
  });
}
