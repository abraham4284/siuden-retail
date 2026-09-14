import type {
  AuthSession,
  PermissionCode,
  TenantFeatureCode,
  UserRole,
} from "@/domain/types";
import type {
  AccountFilters,
  AccountWithTenants,
  CreateAccountInput,
  Services,
} from "@/services/contracts";
import type { MockRepository } from "@/services/mock-repository";

type ApiErrorPayload = {
  message?: string[] | string;
};

type ApiSession = {
  user: AuthSession["user"];
  account: AuthSession["account"];
  membership: {
    id: string;
    role: string;
    status: AuthSession["membership"]["status"];
    permissions: string[];
  };
  tenant: Omit<AuthSession["tenant"], "enabledFeatures" | "primaryColor">;
};

type ApiPage<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

class HttpServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpServiceError";
  }
}

function enabledFeatures(permissions: string[]): TenantFeatureCode[] {
  const features: TenantFeatureCode[] = [];
  if (permissions.some((permission) => permission.startsWith("products") || permission.startsWith("categories"))) {
    features.push("CATALOG");
  }
  if (permissions.some((permission) => permission.startsWith("inventory"))) features.push("INVENTORY");
  if (permissions.some((permission) => permission.startsWith("customers"))) features.push("CUSTOMERS");
  if (permissions.some((permission) => permission.startsWith("sales"))) features.push("SALES");
  if (permissions.includes("pos.use")) features.push("POS");
  if (permissions.some((permission) => permission.startsWith("purchases"))) features.push("PURCHASES");
  return features;
}

function normalizeSession(session: ApiSession): AuthSession {
  return {
    user: session.user,
    account: session.account,
    membership: {
      ...session.membership,
      role: session.membership.role as UserRole,
      permissions: session.membership.permissions as PermissionCode[],
    },
    tenant: {
      ...session.tenant,
      enabledFeatures: enabledFeatures(session.membership.permissions),
      primaryColor: "#7f2942",
    },
  };
}

export function createHttpServices(
  fallback: Services,
  repository: MockRepository,
): Services {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1").replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      let payload: ApiErrorPayload | null = null;
      try {
        payload = (await response.json()) as ApiErrorPayload;
      } catch {
        // The HTTP status below remains a useful fallback for non-JSON errors.
      }
      const messages = Array.isArray(payload?.message) ? payload.message : [payload?.message];
      throw new HttpServiceError(
        messages.filter(Boolean).join(" ") || `La API respondió con estado ${response.status}.`,
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  return {
    ...fallback,
    auth: {
      async login(input) {
        const response = await request<{ session: ApiSession }>("/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        });
        const session = normalizeSession(response.session);
        await repository.adoptSession(session);
        return session;
      },
      async me() {
        try {
          const session = normalizeSession(await request<ApiSession>("/auth/me"));
          await repository.adoptSession(session);
          return session;
        } catch (error) {
          if (error instanceof HttpServiceError && error.status === 401) return null;
          throw error;
        }
      },
      async logout() {
        await request<{ message: string }>("/auth/logout", { method: "POST" });
        await repository.logout();
      },
    },
    accounts: {
      async list(filters: AccountFilters = {}) {
        const params = new URLSearchParams();
        params.set("page", String(filters.page ?? 1));
        params.set("limit", String(filters.pageSize ?? 20));
        if (filters.search) params.set("search", filters.search);
        const response = await request<ApiPage<AccountWithTenants>>(`/accounts?${params}`);
        return {
          items: response.data,
          total: response.meta.total,
          page: response.meta.page,
          pageSize: response.meta.limit,
          totalPages: response.meta.totalPages,
        };
      },
      create(input: CreateAccountInput) {
        return request<AccountWithTenants>("/accounts", {
          method: "POST",
          body: JSON.stringify(input),
        });
      },
    },
  };
}

export { HttpServiceError };
