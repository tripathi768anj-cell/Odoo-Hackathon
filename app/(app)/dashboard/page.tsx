"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, BadgeCheck, Plus } from "lucide-react";
import { Badge, Card, DataTable, Empty, ErrorState, Metric, PageHead, Skeleton, useSlowLoadHint } from "../../components/ui";
import { ApiError, dealHealthApi, Quote, quotesApi } from "../../lib/api-client";

const TERMINAL: Quote["status"][] = ["cancelled", "expired", "rejected", "converted"];
const PENDING_APPROVAL: Quote["status"][] = ["submittedForApproval", "awaitingApproval"];

function money(currency: string, value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const slow = useSlowLoadHint(loading);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotesRes, healthRes] = await Promise.all([
        quotesApi.list({ limit: 100 }),
        dealHealthApi.list().catch(() => null),
      ]);
      setQuotes(quotesRes.data);
      setAlertCount(healthRes?.data.summary.totalActive ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not state derived from props/state — load() sets state
    // asynchronously after the network request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <PageHead
          eyebrow="Revenue Command Center"
          title="Sales Pipeline & Operations"
          subtitle={slow ? "Still loading — the database can take a while to wake up after being idle." : "Loading your workspace…"}
        />
        <div className="grid grid-3">
          <Skeleton height={110} />
          <Skeleton height={110} />
          <Skeleton height={110} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHead eyebrow="Revenue Command Center" title="Sales Pipeline & Operations" subtitle="Real-time deal health and approval workflows." />
        <Card>
          <ErrorState title="Couldn't load the dashboard" hint={error} onRetry={load} />
        </Card>
      </>
    );
  }

  const activeQuotes = (quotes ?? []).filter((q) => !TERMINAL.includes(q.status));
  const pendingApprovals = activeQuotes.filter((q) => PENDING_APPROVAL.includes(q.status));
  const currency = activeQuotes[0]?.currency ?? "USD";
  const pipelineValue = activeQuotes.reduce((sum, q) => sum + Number(q.totals?.grandTotal ?? 0), 0);
  const pendingValue = pendingApprovals.reduce((sum, q) => sum + Number(q.totals?.grandTotal ?? 0), 0);
  const recent = [...(quotes ?? [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <>
      <PageHead
        eyebrow="Revenue Command Center"
        title="Sales Pipeline & Operations"
        subtitle="Real-time deal health, approval workflows, and pipeline status."
        actions={
          <>
            <button className="button" type="button" onClick={() => router.push("/approvals")}>
              <BadgeCheck size={15} aria-hidden="true" /> Approvals Queue
            </button>
            <button className="button primary" type="button" onClick={() => router.push("/quotations")}>
              <Plus size={15} aria-hidden="true" /> New Quote
            </button>
          </>
        }
      />
      <div className="grid grid-3">
        <Metric
          title="Pending Approvals"
          value={String(pendingApprovals.length)}
          detail={pendingApprovals.length ? `${money(currency, pendingValue)} awaiting a decision` : "Nothing waiting on you"}
          tone={pendingApprovals.length ? "amber" : "green"}
          icon={<BadgeCheck size={15} aria-hidden="true" />}
          onClick={() => router.push("/approvals")}
        />
        <Metric
          title="Active Pipeline"
          value={money(currency, pipelineValue)}
          detail={`${activeQuotes.length} open quote${activeQuotes.length === 1 ? "" : "s"}`}
          tone="blue"
          icon={<Activity size={15} aria-hidden="true" />}
          onClick={() => router.push("/quotations")}
        />
        <Metric
          title="Deal Health Alerts"
          value={alertCount === null ? "—" : String(alertCount)}
          detail={alertCount ? "Review flagged deals" : "No active alerts"}
          tone={alertCount ? "red" : "green"}
          icon={<Activity size={15} aria-hidden="true" />}
          onClick={() => router.push("/deal-health")}
        />
      </div>
      <Card
        title="Recent Quotes"
        action={
          <button className="button" type="button" onClick={() => router.push("/quotations")}>
            View all <ArrowRight size={13} aria-hidden="true" />
          </button>
        }
      >
        {recent.length === 0 ? (
          <Empty
            icon={<Activity size={28} aria-hidden="true" />}
            title="No quotes yet"
            hint="Create your first quote from the Quotations pipeline board."
            action={
              <button className="button primary" type="button" onClick={() => router.push("/quotations")}>
                <Plus size={14} aria-hidden="true" /> Go to Quotations
              </button>
            }
          />
        ) : (
          <DataTable
            headers={["Quote", "Customer", "Status", "Value", ""]}
            rows={recent.map((q) => [
              q.number,
              q.customer?.name ?? "—",
              <Badge tone={PENDING_APPROVAL.includes(q.status) ? "amber" : q.status === "draft" ? "neutral" : "blue"} key="s">
                {q.status}
              </Badge>,
              money(q.currency, q.totals?.grandTotal ?? 0),
              <button className="button" key="a" type="button" onClick={() => router.push("/quotations")}>
                Open
              </button>
            ])}
          />
        )}
      </Card>
    </>
  );
}
