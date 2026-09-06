// Typed fetch client for the DealFlow360 API (see docs/FRONTEND_API.md for the contract).
// Access tokens live in memory only (never localStorage) and are attached per request by
// whoever calls `setAccessToken` — see app/lib/auth-context.tsx, the only caller in this app.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Calls POST /auth/refresh using the httpOnly refresh cookie. Returns the new access token, or null if refresh failed. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { accessToken: string } };
    accessToken = body.data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}

function isAuthRefreshUrl(path: string) {
  return path === "/auth/refresh" || path === "/auth/login" || path === "/auth/bootstrap";
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Send an Idempotency-Key header (required by the contract for marked command POSTs). */
  idempotencyKey?: string;
  /** Send an If-Match header for revisioned resources, e.g. `W/"7"`. */
  ifMatch?: string;
  /** Skip the automatic 401 refresh-and-retry (used internally to avoid infinite loops). */
  skipAuthRetry?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, ifMatch, skipAuthRetry } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (ifMatch) headers["If-Match"] = ifMatch;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuthRetry && !isAuthRefreshUrl(path)) {
    // Single-flight refresh: concurrent 401s share one refresh call.
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newToken = await refreshPromise;
    if (newToken) {
      return apiRequest<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const errorBody: ApiErrorBody = json?.error ?? {
      code: "UNKNOWN_ERROR",
      message: res.statusText || "Request failed",
    };
    throw new ApiError(res.status, errorBody);
  }

  return json as T;
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}

// ---- Domain types (trimmed to what the core flow pass needs) ----

export type MoneyString = string;

export type QuoteStatus =
  | "draft"
  | "submittedForApproval"
  | "awaitingApproval"
  | "approvedInternal"
  | "sharedWithCustomer"
  | "underNegotiation"
  | "customerAccepted"
  | "readyForOrder"
  | "converted"
  | "cancelled"
  | "expired"
  | "rejected"
  | "returnedForRevision";

export type Quote = {
  id: string;
  number: string;
  status: QuoteStatus;
  revision: number;
  currency: string;
  customer: { id: string; name: string; tier?: string };
  owner?: { id: string; name: string } | null;
  totals: {
    subtotal: MoneyString;
    discount: MoneyString;
    net: MoneyString;
    tax: MoneyString;
    grandTotal: MoneyString;
  };
  risk?: { score: MoneyString; level: string } | null;
  lines?: QuoteLine[];
  recommendations?: QuoteRecommendation[];
  availableActions?: string[];
  createdAt: string;
  updatedAt: string;
};

export type QuoteLine = {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: string;
  discountPct: string;
  billingType: "one_time" | "recurring";
  snapshot: { name: string; categoryCode?: string | null; unitPrice: string };
  totals: { subtotal: string; net: string; total: string };
};

export type QuoteRecommendation = {
  productId: string;
  variantId?: string | null;
  name: string;
  categoryCode?: string | null;
  unitPrice: string;
};

export type ApprovalInboxItem = {
  approval: {
    id: string;
    quoteId: string;
    role: string;
    status: string;
    sequence: number;
    createdAt: string;
  };
  quote: {
    id: string;
    number: string;
    status: QuoteStatus;
    grandTotal: string;
    ownerUserId: string;
  };
};

export type ListResponse<T> = { data: T[]; page: { limit: number; nextCursor: string | null } };
export type ItemResponse<T> = { data: T };

export type Customer = { id: string; name: string; tier?: string; status?: string };
export type CustomerContact = { id: string; name: string; email: string };

export type Invoice = {
  id: string;
  number: string;
  status: "draft" | "issued" | "partial" | "paid" | "void";
  currency: string;
  grandTotal: string;
  balance: string;
  dueAt: string;
  revision: number;
};

export type ApprovalStep = {
  id: string;
  step: number;
  role: string;
  status: "pending" | "approved" | "rejected" | "returned" | "skipped";
  decidedAt?: string | null;
};

export type DealHealthAlert = {
  id: string;
  quoteId?: string;
  reason: string;
  confidence: string;
  createdAt: string;
};

// ---- Auth ----

export const authApi = {
  login: (input: { email: string; password: string; organizationSlug?: string }) =>
    apiRequest<
      ItemResponse<{
        accessToken: string;
        user: { id: string; email: string; name: string };
        organization: { id: string; name: string; slug: string };
        membership: { id: string; role: string; tenantId: string };
      }>
    >("/auth/login", { method: "POST", body: input, skipAuthRetry: true }),

  bootstrap: (input: {
    organizationName: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) =>
    apiRequest<
      ItemResponse<{
        accessToken: string;
        user: { id: string; email: string; name: string };
        organization: { id: string; name: string; slug: string };
        membership: { id: string; role: string };
      }>
    >("/auth/bootstrap", { method: "POST", body: input, skipAuthRetry: true }),

  refresh: () =>
    apiRequest<ItemResponse<{ accessToken: string }>>("/auth/refresh", {
      method: "POST",
      skipAuthRetry: true,
    }),

  logout: () => apiRequest<void>("/auth/logout", { method: "POST", skipAuthRetry: true }),

  me: () =>
    apiRequest<
      ItemResponse<{
        user: { id: string; email: string; name: string };
        organization: { id: string; name: string; slug: string };
        membership: { id: string; role: string; tenantId: string };
        permissions: string[];
      }>
    >("/me"),
};

// ---- Quotes ----

export const quotesApi = {
  list: (query?: { status?: string; limit?: number; cursor?: string }) =>
    apiRequest<ListResponse<Quote>>("/quotes", { query }),

  get: (id: string) => apiRequest<ItemResponse<Quote>>(`/quotes/${id}`),

  create: (input: { customerId: string; currency: string }, idempotencyKey: string) =>
    apiRequest<ItemResponse<Quote>>("/quotes", { method: "POST", body: input, idempotencyKey }),

  submit: (id: string, revision: number, idempotencyKey: string, note?: string) =>
    apiRequest<ItemResponse<Quote>>(`/quotes/${id}/submit`, {
      method: "POST",
      body: { note },
      ifMatch: `W/"${revision}"`,
      idempotencyKey,
    }),

  updateLine: (
    quoteId: string,
    lineId: string,
    revision: number,
    input: { quantity?: string; discountPct?: string },
  ) =>
    apiRequest<ItemResponse<Quote>>(`/quotes/${quoteId}/lines/${lineId}`, {
      method: "PATCH",
      body: input,
      ifMatch: `W/"${revision}"`,
      idempotencyKey: newIdempotencyKey(),
    }),

  cancel: (id: string, revision: number, reason: string, idempotencyKey: string) =>
    apiRequest<ItemResponse<Quote>>(`/quotes/${id}/cancel`, {
      method: "POST",
      body: { reason },
      ifMatch: `W/"${revision}"`,
      idempotencyKey,
    }),

  approvals: (id: string) => apiRequest<ItemResponse<ApprovalStep[]>>(`/quotes/${id}/approvals`),

  decide: (
    id: string,
    approvalId: string,
    decision: "approve" | "reject" | "returnForRevision",
    reason: string | undefined,
    idempotencyKey: string,
  ) =>
    apiRequest<ItemResponse<Quote>>(`/quotes/${id}/approvals/${approvalId}/decision`, {
      method: "POST",
      body: { decision, reason },
      idempotencyKey,
    }),

  share: (
    id: string,
    customerContactIds: string[],
    revision: number,
    idempotencyKey: string,
    message?: string,
  ) =>
    apiRequest<ItemResponse<Quote>>(`/quotes/${id}/share`, {
      method: "POST",
      body: { customerContactIds, message },
      ifMatch: `W/"${revision}"`,
      idempotencyKey,
    }),

  convertToOrder: (id: string, revision: number, idempotencyKey: string) =>
    apiRequest<ItemResponse<{ id: string }>>(`/quotes/${id}/convert-to-order`, {
      method: "POST",
      ifMatch: `W/"${revision}"`,
      idempotencyKey,
    }),
};

// ---- Customers ----

export const customersApi = {
  list: (query?: { q?: string; limit?: number }) =>
    apiRequest<ListResponse<Customer>>("/customers", { query }),

  contacts: (customerId: string) =>
    apiRequest<ListResponse<CustomerContact>>(`/customers/${customerId}/contacts`),
};

// ---- Deal health ----

export const dealHealthApi = {
  // NOTE: the backend returns { summary, alerts } directly (no `data` envelope) —
  // see backend/src/api/v1/health.routes.ts and tests/integration/health.test.ts.
  list: () =>
    apiRequest<{ alerts: DealHealthAlert[]; summary: { totalActive: number } }>("/deal-health"),
};

export const approvalsApi = {
  inbox: (query?: { limit?: number; cursor?: string }) =>
    apiRequest<ListResponse<ApprovalInboxItem>>("/approvals/inbox", { query }),
};

export const billingApi = {
  invoices: (query?: { status?: string; limit?: number }) =>
    apiRequest<{ invoices: Invoice[] }>("/invoices", { query }),
  createRazorpayOrder: (invoiceId: string) =>
    apiRequest<{ data: { keyId: string; order: { id: string; amount: number; currency: string }; invoice: Invoice } }>(
      `/invoices/${invoiceId}/razorpay/order`,
      { method: "POST", idempotencyKey: newIdempotencyKey() },
    ),
  verifyRazorpayPayment: (invoiceId: string, input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    apiRequest<{ data: { invoice: Invoice } }>(`/invoices/${invoiceId}/razorpay/verify`, {
      method: "POST",
      body: input,
      idempotencyKey: newIdempotencyKey(),
    }),
};
