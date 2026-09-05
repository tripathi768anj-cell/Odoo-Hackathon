"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Receipt,
  Repeat,
  Search,
  Tag,
  UserRound
} from "lucide-react";
import { Badge, Logo, ThemeToggle, ToastStack, useTheme, useToast } from "../components/ui";
import { useAuth } from "../lib/auth-context";

type NavRoute =
  | "dashboard"
  | "quotations"
  | "approvals"
  | "fulfillment"
  | "subscriptions"
  | "invoices"
  | "deal-health"
  | "reports"
  | "products"
  | "customer-portal";

const DETAIL_TO_PARENT: Record<string, NavRoute> = {
  "quote-builder": "quotations",
  "approval-detail": "approvals",
  "fulfillment-detail": "fulfillment",
  "billing-detail": "subscriptions",
  "invoice-detail": "invoices",
  "product-detail": "products",
  "discount-setup": "products"
};

const sideGroups: { title: string; items: { route: NavRoute; label: string }[] }[] = [
  {
    title: "Operations Flow",
    items: [
      { route: "dashboard", label: "Dashboard" },
      { route: "quotations", label: "Quotations" },
      { route: "approvals", label: "Approvals" },
      { route: "fulfillment", label: "Fulfillment" },
      { route: "subscriptions", label: "Subscriptions" },
      { route: "invoices", label: "Invoices" }
    ]
  },
  {
    title: "Intelligence & Config",
    items: [
      { route: "deal-health", label: "Deal Health" },
      { route: "reports", label: "Reports" },
      { route: "products", label: "Products" },
      { route: "customer-portal", label: "Customer Portal" }
    ]
  }
];

function NavIcon({ route }: { route: string }) {
  const props = { size: 16, "aria-hidden": true } as const;
  switch (route) {
    case "dashboard":
      return <LayoutDashboard {...props} />;
    case "quotations":
      return <FileText {...props} />;
    case "approvals":
      return <BadgeCheck {...props} />;
    case "fulfillment":
      return <Package {...props} />;
    case "subscriptions":
      return <Repeat {...props} />;
    case "invoices":
      return <Receipt {...props} />;
    case "deal-health":
      return <Activity {...props} />;
    case "reports":
      return <BarChart3 {...props} />;
    case "products":
      return <Tag {...props} />;
    case "customer-portal":
      return <UserRound {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="app-loading" role="status" aria-label="Loading your workspace">
        <span className="pulse-dot" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, organization, logout } = useAuth();
  const { toast, kind, notify, dismiss } = useToast();

  const currentSegment = (pathname.split("/")[1] || "dashboard") as string;
  const activeTop = (DETAIL_TO_PARENT[currentSegment] ?? currentSegment) as NavRoute;
  const activeItem = sideGroups.flatMap((g) => g.items).find((i) => i.route === activeTop);
  const groupOf = (r: string) => (sideGroups[0].items.some((i) => i.route === r) ? sideGroups[0].title : sideGroups[1].title);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const searchIndex = sideGroups.flatMap((g) => g.items).map((item) => ({
    label: item.label,
    sub: groupOf(item.route),
    route: item.route
  }));

  const results = query.trim()
    ? searchIndex.filter((item) => `${item.label} ${item.sub}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7)
    : [];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const goResult = (target: NavRoute) => {
    setSearchOpen(false);
    setQuery("");
    setActiveIdx(0);
    router.push(`/${target}`);
  };

  const handleSignOut = async () => {
    await logout();
    notify("Signed out of DealFlow360", "info");
    router.push("/login");
  };

  const initials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <AuthGate>
      <div className="app">
        <header className="topbar">
          <div className="cluster">
            <Link className="brand" href="/dashboard" aria-label="DealFlow 360 home">
              <Logo compact />
            </Link>
            <span className="crumb" aria-label="Breadcrumb location">
              {groupOf(activeTop)} <span className="crumb-sep">/</span> <strong>{activeItem?.label ?? activeTop}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <div className="search-wrap" ref={searchRef}>
              <label className="topbar-search" aria-label="Global search">
                <Search size={13} aria-hidden="true" />
                <input
                  placeholder="Jump to a page..."
                  aria-label="Jump to a page"
                  role="combobox"
                  ref={searchInputRef}
                  aria-expanded={searchOpen && results.length > 0}
                  aria-controls="global-search-results"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                    setActiveIdx(0);
                  }}
                  onFocus={() => {
                    if (query.trim()) setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" && results.length) {
                      e.preventDefault();
                      setSearchOpen(true);
                      setActiveIdx((i) => (i + 1) % results.length);
                    } else if (e.key === "ArrowUp" && results.length) {
                      e.preventDefault();
                      setActiveIdx((i) => (i - 1 + results.length) % results.length);
                    } else if (e.key === "Enter" && results.length) {
                      e.preventDefault();
                      goResult(results[Math.min(activeIdx, results.length - 1)].route);
                    } else if (e.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />
                <kbd>⌘K</kbd>
              </label>
              {searchOpen && query.trim() ? (
                <div className="search-menu" id="global-search-results" role="listbox" aria-label="Search results">
                  {results.length === 0 ? (
                    <div className="search-empty">
                      <strong>No matches for “{query.trim()}”</strong>
                      <div className="subtle">Try a page name.</div>
                    </div>
                  ) : (
                    <>
                      <div className="menu-label">{results.length} result{results.length === 1 ? "" : "s"}</div>
                      {results.map((item, i) => (
                        <button
                          key={item.label}
                          type="button"
                          role="option"
                          aria-selected={i === activeIdx}
                          className={`search-item ${i === activeIdx ? "selected" : ""}`}
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => goResult(item.route)}
                        >
                          <span className="search-kind">Page</span>
                          <span>
                            <strong>{item.label}</strong>
                            <span className="subtle">{item.sub}</span>
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <span className="badge blue topbar-action-pill" aria-label={`Workspace: ${organization?.name ?? ""}`}>
              <Building2 size={12} aria-hidden="true" />
              <span>{organization?.name ?? "Workspace"}</span>
            </span>
            <Link className="icon-button" href="/deal-health" aria-label="Deal health notifications">
              <Inbox size={15} aria-hidden="true" />
            </Link>
            <ThemeToggle theme={theme} onChange={setTheme} />
            <button
              className="avatar-btn"
              onClick={handleSignOut}
              data-tip={`${user?.name ?? "Account"} (Click to Sign Out)`}
              aria-label={`User profile: ${user?.name ?? "Account"}. Click to sign out.`}
              type="button"
            >
              <span className="avatar">{initials}</span>
            </button>
          </div>
        </header>
        <div className="shell">
          <aside className="sidebar">
            <Link className="side-brand" href="/dashboard" aria-label="DealFlow 360 dashboard">
              <Logo />
            </Link>
            <nav className="side-nav" aria-label="Primary navigation">
              {sideGroups.map((group) => (
                <div key={group.title}>
                  <div className="side-title">{group.title}</div>
                  {group.items.map((item) => (
                    <Link
                      className={`side-link ${activeTop === item.route ? "active" : ""}`}
                      data-route={item.route}
                      aria-current={activeTop === item.route ? "page" : undefined}
                      key={item.route}
                      href={`/${item.route}`}
                    >
                      <span className="side-icon"><NavIcon route={item.route} /></span>
                      <span className="side-label">{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="side-foot">
              <button
                className="side-user-btn"
                onClick={handleSignOut}
                type="button"
                data-tip="Click to Sign Out"
                aria-label={`${user?.name ?? "Account"}. Click to sign out.`}
              >
                <span className="avatar" title={user?.name}>{initials}</span>
                <div>
                  <strong>{user?.name ?? "Account"}</strong>
                  <span className="subtle">Sign out</span>
                </div>
              </button>
            </div>
          </aside>
          <main className="main" data-current-route={activeTop} id="main" tabIndex={-1}>
            <div className="page">{children}</div>
          </main>
        </div>
      </div>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </AuthGate>
  );
}
