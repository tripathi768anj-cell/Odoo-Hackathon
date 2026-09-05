"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, authApi, setAccessToken } from "./api-client";

type User = { id: string; email: string; name: string };
type Organization = { id: string; name: string; slug: string };
type Membership = { id?: string; role: string; tenantId?: string };

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  permissions: string[];
  login: (input: { email: string; password: string; organizationSlug?: string }) => Promise<void>;
  bootstrap: (input: {
    organizationName: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Flips true the moment an interactive login/bootstrap succeeds, so that a slower,
  // still-in-flight mount-time session-restore attempt (below) can't race in afterwards
  // and clobber it — without this, a fast interactive login could complete, then the
  // stale cookie-restore call resolves (fails, since it started before any cookie
  // existed) and wipes the just-established session out from under the user.
  const establishedRef = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
    setMembership(null);
    setPermissions([]);
    setStatus("unauthenticated");
  }, []);

  const loadMe = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data.user);
    setOrganization(data.organization);
    setMembership(data.membership);
    setPermissions(data.permissions);
    setStatus("authenticated");
  }, []);

  // On mount, try to restore a session from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.refresh();
        if (cancelled || establishedRef.current) return;
        setAccessToken(data.accessToken);
        await loadMe();
      } catch {
        if (!cancelled && !establishedRef.current) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string; organizationSlug?: string }) => {
      const { data } = await authApi.login(input);
      establishedRef.current = true;
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganization(data.organization);
      setMembership(data.membership);
      setStatus("authenticated");
      try {
        await loadMe();
      } catch {
        // /me failure after a successful login shouldn't strand the user on the login page
      }
    },
    [loadMe],
  );

  const bootstrap = useCallback(
    async (input: {
      organizationName: string;
      slug: string;
      adminName: string;
      adminEmail: string;
      password: string;
    }) => {
      const { data } = await authApi.bootstrap(input);
      establishedRef.current = true;
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOrganization(data.organization);
      setMembership(data.membership);
      setStatus("authenticated");
      try {
        await loadMe();
      } catch {
        // same rationale as login()
      }
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, organization, membership, permissions, login, bootstrap, logout }),
    [status, user, organization, membership, permissions, login, bootstrap, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const defaultAuthValue: AuthContextValue = {
  status: "unauthenticated",
  user: null,
  organization: null,
  membership: null,
  permissions: [],
  login: async () => {},
  bootstrap: async () => {},
  logout: async () => {},
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuthValue;
}
