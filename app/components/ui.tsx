"use client";

// Shared presentational primitives used across every DealFlow360 page.
// Extracted from the original single-file prototype (app/page.tsx) verbatim —
// same markup/classNames, so the visual design is unchanged.

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  GripVertical,
  Info,
  Moon,
  MonitorSmartphone,
  Sun,
  TriangleAlert,
  X
} from "lucide-react";

export type StatusTone = "green" | "amber" | "red" | "blue" | "steel" | "neutral";
export type Theme = "light" | "dark" | "system";
export type ToastKind = "info" | "success" | "error";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("df360-theme") as Theme | null;
      // One-time hydration read from localStorage on mount, not derived state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = theme;
      setResolved(dark ? "dark" : "light");
    };
    apply();
    mq.addEventListener("change", apply);
    try {
      localStorage.setItem("df360-theme", theme);
    } catch {
      /* storage unavailable */
    }
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return { theme, setTheme, resolved };
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="theme-segmented" role="radiogroup" aria-label="Theme Selection">
      <button
        type="button"
        className={`theme-seg-btn ${theme === "light" ? "active" : ""}`}
        onClick={() => onChange("light")}
        data-tip="Light Theme"
        aria-label="Switch to Light Theme"
        aria-checked={theme === "light"}
        role="radio"
      >
        <Sun size={13} aria-hidden="true" />
        <span>Light</span>
      </button>
      <button
        type="button"
        className={`theme-seg-btn ${theme === "dark" ? "active" : ""}`}
        onClick={() => onChange("dark")}
        data-tip="Dark Theme"
        aria-label="Switch to Dark Theme"
        aria-checked={theme === "dark"}
        role="radio"
      >
        <Moon size={13} aria-hidden="true" />
        <span>Dark</span>
      </button>
      <button
        type="button"
        className={`theme-seg-btn ${theme === "system" ? "active" : ""}`}
        onClick={() => onChange("system")}
        data-tip="System Default"
        aria-label="Switch to System Theme"
        aria-checked={theme === "system"}
        role="radio"
      >
        <MonitorSmartphone size={13} aria-hidden="true" />
        <span>Auto</span>
      </button>
    </div>
  );
}

export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <span className="logo">
      <svg className="logo-mark" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="10" fill="#1d4ed8" />
        <rect x="0.5" y="0.5" width="33" height="33" rx="9.5" fill="none" stroke="#ffffff" strokeOpacity="0.3" />
        <path d="M8 22 L14 15.5 L18 18.5 L25.5 10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20.8 10 H25.5 V14.7" fill="none" stroke="#bcd0f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="15.5" r="2" fill="#34d399" stroke="#ffffff" strokeWidth="1" />
      </svg>
      <span className="logo-text">
        <span className="logo-name" style={onDark ? { color: "#ffffff" } : undefined}>DealFlow <span className="logo-num">360</span></span>
        {!compact && <span className="logo-tag" style={onDark ? { color: "#aeb8e2" } : undefined}>Revenue Operations OS</span>}
      </span>
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={`badge ${tone === "neutral" ? "" : tone}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  tone,
  disabled,
  type = "button",
  testId,
  tip,
  ariaLabel
}: {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  tone?: "primary" | "danger" | "success" | "accent" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  testId?: string;
  tip?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      className={`button ${tone ?? ""}`}
      data-testid={testId}
      data-tip={tip}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function Skeleton({ width = "100%", height = 16 }: { width?: string | number; height?: string | number }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function Empty({ icon, title, hint, action }: { icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="empty" role="status">
      {icon}
      <strong>{title}</strong>
      <span className="subtle">{hint}</span>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, hint, onRetry }: { title: string; hint: string; onRetry?: () => void }) {
  return (
    <div className="empty" role="alert">
      <strong>{title}</strong>
      <span className="subtle">{hint}</span>
      {onRetry ? (
        <div style={{ marginTop: 8 }}>
          <Button tone="primary" onClick={onRetry}>Retry</Button>
        </div>
      ) : null}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = ""
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className="card-pad">{children}</div>
    </section>
  );
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtle">{subtitle}</p>
      </div>
      {actions ? <div className="row-actions">{actions}</div> : null}
    </div>
  );
}

export function PrototypeBadge() {
  return <Badge tone="steel">Prototype data — not yet connected</Badge>;
}

export function DataTable({
  headers,
  rows
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stepper({ active }: { active: number }) {
  const steps = ["Quotation Draft", "Discount Approval", "Stock Allocation", "Invoiced", "Reconciled & Paid"];
  return (
    <div className="pipeline">
      {steps.map((step, index) => (
        <span className="cluster" key={step}>
          <span className={`step ${index < active ? "done" : index === active ? "active" : ""}`}>
            <span className="dot" />
            <span>{step}</span>
          </span>
          {index < steps.length - 1 ? <span className="connector" /> : null}
        </span>
      ))}
    </div>
  );
}

export function Metric({
  title,
  value,
  detail,
  tone,
  meter,
  icon,
  trend,
  onClick
}: {
  title: string;
  value: string;
  detail: string;
  tone: StatusTone;
  meter?: { pct: number; tone: "good" | "warn" | "bad" };
  icon?: React.ReactNode;
  trend?: string;
  onClick?: () => void;
}) {
  const up = trend ? /\+|target|live/i.test(trend) : false;
  return (
    <div
      className={`card metric ${onClick ? "clickable-card" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div>
        <div className="metric-head">
          <span className="cluster" style={{ gap: 8 }}>
            <span className="icon-tile">{icon}</span>
            <span className="section-label">{title}</span>
          </span>
          {trend ? <span className={`trend-pill ${up ? "up" : ""}`}>{trend}</span> : null}
        </div>
        <div className="metric-value mono">{value}</div>
        <p className="subtle">{detail}</p>
      </div>
      {meter ? (
        <div className={`meter ${meter.tone}`} role="img" aria-label={`${title}: ${Math.round(meter.pct)} percent`}>
          <span style={{ width: `${Math.min(100, Math.max(0, meter.pct))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export const KANBAN_LANES = ["Draft", "Pending approval", "Approved", "Negotiation", "Fulfillment", "Confirmed"] as const;
export type KanbanLane = (typeof KANBAN_LANES)[number];

export function DealCard({
  name,
  id,
  amount,
  tone,
  owner,
  live,
  lane,
  busy,
  disabledLanes,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMoveLane
}: {
  name: string;
  id: string;
  amount: string;
  tone: StatusTone;
  owner?: string;
  live?: boolean;
  lane: KanbanLane;
  busy?: boolean;
  disabledLanes?: KanbanLane[];
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onOpen: () => void;
  onMoveLane: (newLane: KanbanLane) => void;
}) {
  const nextLaneIndex = (KANBAN_LANES.indexOf(lane) + 1) % KANBAN_LANES.length;
  const nextLane = KANBAN_LANES[nextLaneIndex];
  const dragOccurredRef = useRef(false);
  const dragStartTimeRef = useRef(0);

  const handleCardClick = (e: React.MouseEvent) => {
    if (dragOccurredRef.current || (Date.now() - dragStartTimeRef.current < 500 && dragStartTimeRef.current > 0)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen();
  };

  return (
    <div
      className={`deal-card${live ? " live" : ""}${isDragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}`}
      draggable={!busy}
      onDragStart={(e) => {
        dragOccurredRef.current = true;
        dragStartTimeRef.current = Date.now();
        (window as unknown as { __activeKanbanDrag?: string }).__activeKanbanDrag = id;
        try {
          e.dataTransfer.setData("text/plain", id);
          e.dataTransfer.setData("text/deal-id", id);
          e.dataTransfer.effectAllowed = "move";
        } catch {
          /* some browsers restrict dataTransfer access during dragstart */
        }
        onDragStart?.();
      }}
      onDragEnd={() => {
        (window as unknown as { __activeKanbanDrag?: string | null }).__activeKanbanDrag = null;
        setTimeout(() => {
          dragOccurredRef.current = false;
        }, 400);
        onDragEnd?.();
      }}
      role="region"
      aria-label={`Deal card for ${name}, ${id}, ${amount}`}
      aria-busy={busy}
    >
      <div className="deal-card-top" onClick={handleCardClick} style={{ cursor: "pointer" }}>
        <div className="cluster" style={{ justifyContent: "space-between", width: "100%" }}>
          <div className="cluster" style={{ gap: 6 }}>
            <span className="drag-handle" title="Drag card to any stage" aria-hidden="true">
              <GripVertical size={13} />
            </span>
            <strong>{name}</strong>
          </div>
          <Badge tone={tone}>{id}</Badge>
        </div>
        <div className="mono" style={{ fontSize: "17px", fontWeight: 800, letterSpacing: 0, marginTop: 4 }}>
          {amount}
        </div>
        <div className="cluster" style={{ justifyContent: "space-between", marginTop: 4 }}>
          <span className="subtle">{owner ? `${owner} · Enterprise` : "Enterprise Pricing Package"}</span>
          {live ? <span className="live-dot" title="Live Interactive Quote" aria-label="Live deal" /> : <span className="subtle mono">→</span>}
        </div>
      </div>
      <div className="deal-card-actions">
        <select
          className="deal-stage-select"
          aria-label={`Change stage for deal ${id}`}
          value={lane}
          disabled={busy}
          onChange={(e) => onMoveLane(e.target.value as KanbanLane)}
          onClick={(e) => e.stopPropagation()}
        >
          {KANBAN_LANES.map((l) => (
            <option key={l} value={l} disabled={disabledLanes?.includes(l)}>
              Stage: {l}
            </option>
          ))}
        </select>
        <button
          className="deal-quick-move"
          title={`Advance to ${nextLane}`}
          aria-label={`Advance to ${nextLane}`}
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLane(nextLane);
          }}
        >
          <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ToastStack({
  toast,
  kind,
  onDismiss
}: {
  toast: string;
  kind: ToastKind;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      <div className={`toast ${kind}`} role="status">
        {kind === "success" ? <CheckCircle2 size={16} aria-hidden="true" /> : kind === "error" ? <TriangleAlert size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
        <span>{toast}</span>
        <button className="toast-close" onClick={onDismiss} aria-label="Dismiss message" type="button">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Returns true once `active` has been true for longer than `delayMs`. Used to show an
 * honest "this is taking a while" hint during a slow fetch instead of leaving a bare
 * spinner up indefinitely — most useful against a serverless Postgres backend (e.g. Neon)
 * where the first query after idle can take several seconds to tens of seconds while the
 * database compute wakes up, which is expected latency, not a hang.
 */
export function useSlowLoadHint(active: boolean, delayMs = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      // Reset when the caller's fetch is no longer active — synchronizing this hook's
      // output with the caller's own state, not deriving new state from props.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return slow;
}

/** Simple in-memory toast hook shared by every page (replaces the old single giant component's toast state). */
export function useToast() {
  const [toast, setToast] = useState("");
  const [kind, setKind] = useState<ToastKind>("info");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string, toastKind: ToastKind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    setKind(toastKind);
    timer.current = setTimeout(() => setToast(""), 4200);
  };

  const dismiss = () => setToast("");

  return { toast, kind, notify, dismiss };
}
