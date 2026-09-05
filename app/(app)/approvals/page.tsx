"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, Inbox } from "lucide-react";
import { Badge, Button, Card, DataTable, Empty, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { QuoteStage } from "../../lib/demo-types";
import { ApiError, ApprovalInboxItem, approvalsApi, newIdempotencyKey, quotesApi } from "../../lib/api-client";

export default function ApprovalsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [approvalFilter, setApprovalFilter] = useState("All");
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInbox = async () => {
    setLoading(true);
    try {
      setItems((await approvalsApi.inbox({ limit: 100 })).data);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not load the approval inbox.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadInbox(); }, []);

  const approveQuote = async (item?: ApprovalInboxItem) => {
    const targets = item ? [item] : shown.map((row) => row.item);
    if (!targets.length) return;
    setBusyId(item?.approval.id ?? "all");
    try {
      await Promise.all(targets.map((target) => quotesApi.decide(
        target.approval.quoteId,
        target.approval.id,
        "approve",
        undefined,
        newIdempotencyKey(),
      )));
      notify(targets.length === 1 ? `${targets[0].quote.number} approved.` : `${targets.length} approvals processed.`, "success");
      await loadInbox();
      if (targets.length === 1) router.push("/fulfillment");
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not process the approval.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const all = items.map((item) => ({
    id: item.approval.id,
    status: "Pending",
    item,
    row: [
      <strong key="q">{item.quote.number}</strong>,
      item.quote.id,
      <Badge tone="red" key="r">{item.approval.role}</Badge>,
      `Step ${item.approval.sequence}`,
      <span className="mono" key="w">{item.quote.grandTotal}</span>,
      item.quote.ownerUserId,
      <Badge tone="amber" key="t">Pending</Badge>,
      <Button key="a" tone="primary" disabled={busyId !== null} onClick={() => approveQuote(item)}>
        <Check size={14} aria-hidden="true" /> Approve <ArrowRight size={14} aria-hidden="true" />
      </Button>,
    ],
  }));
  const shown = approvalFilter === "All" ? all : all.filter((r) => r.status === approvalFilter);

  return (
    <>
      <PageHead
        eyebrow="Governance & Risk Matrix"
        title="Discount & Concession Approvals"
        subtitle="Quotes exceeding rep discount limits requiring management and finance sign-off."
        actions={
          <>
            <div className="tabs">
              {["All", "Pending", "Returned", "Approved"].map((filter) => (
                <Button key={filter} tone={approvalFilter === filter ? "primary" : undefined} onClick={() => setApprovalFilter(filter)}>
                  {filter}
                </Button>
              ))}
            </div>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-3">
        <Metric title="Pending Sign-Off" value="₹117,800" detail="4 quotes awaiting review" tone="amber" icon={<Clock size={14} />} />
        <Metric title="Average SLA Response" value="3.4 hrs" detail="Target SLA: under 6.0 hrs" tone="green" icon={<CheckCircle2 size={14} />} />
        <Metric title="Primary Exception" value="Service Discount" detail="Setup Services > 10% Cap" tone="red" icon={<AlertTriangle size={14} />} />
      </div>
      <Card
        title={`${approvalFilter} Approvals Queue`}
        action={
            <Button tone="primary" disabled={!shown.length || busyId !== null} onClick={() => approveQuote()}>
            <Check size={15} aria-hidden="true" /> Approve All
          </Button>
        }
      >
        {loading ? (
          <div className="notice blue">Loading approval inbox...</div>
        ) : !shown.length ? (
          <Empty
            icon={<Inbox size={32} aria-hidden="true" />}
            title={`No ${approvalFilter.toLowerCase()} approval requests`}
            hint="All items in this queue have been processed or resolved."
            action={<Button onClick={() => setApprovalFilter("All")}>Show All Requests</Button>}
          />
        ) : (
          <DataTable
            headers={["Quote ID", "Account Name", "Deal Category", "Required Approvers", "Contract Value", "Deal Owner", "SLA Status", "Actions"]}
            rows={shown.map((r) => r.row)}
          />
        )}
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
