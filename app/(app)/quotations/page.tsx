"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DealCard,
  Empty,
  ErrorState,
  KANBAN_LANES,
  KanbanLane,
  Modal,
  PageHead,
  Skeleton,
  StatusTone,
  useSlowLoadHint,
  useToast,
  ToastStack
} from "../../components/ui";
import {
  ApiError,
  Customer,
  CustomerContact,
  newIdempotencyKey,
  Quote,
  QuoteStatus,
  customersApi,
  quotesApi
} from "../../lib/api-client";

const STATUS_TO_LANE: Record<QuoteStatus, KanbanLane | null> = {
  draft: "Draft",
  returnedForRevision: "Draft",
  submittedForApproval: "Pending approval",
  awaitingApproval: "Pending approval",
  approvedInternal: "Approved",
  sharedWithCustomer: "Negotiation",
  underNegotiation: "Negotiation",
  customerAccepted: "Fulfillment",
  readyForOrder: "Fulfillment",
  converted: "Confirmed",
  cancelled: null,
  expired: null,
  rejected: null
};

const LANE_TONE: Record<KanbanLane, StatusTone> = {
  Draft: "neutral",
  "Pending approval": "amber",
  Approved: "green",
  Negotiation: "blue",
  Fulfillment: "steel",
  Confirmed: "green"
};

function money(currency: string, value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export default function QuotationsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const slow = useSlowLoadHint(loading);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [dragOverLane, setDragOverLane] = useState<KanbanLane | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [addDealCustomerId, setAddDealCustomerId] = useState("");
  const [shareModal, setShareModal] = useState<{ quote: Quote; contacts: CustomerContact[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotesRes, customersRes] = await Promise.all([
        quotesApi.list({ limit: 100 }),
        customersApi.list({ limit: 100 }),
      ]);
      setQuotes(quotesRes.data);
      setCustomers(customersRes.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load quotations.");
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

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const patchQuote = (updated: Quote) => {
    setQuotes((prev) => (prev ? prev.map((q) => (q.id === updated.id ? updated : q)) : prev));
  };

  const boardQuotes = useMemo(() => (quotes ?? []).filter((q) => STATUS_TO_LANE[q.status] !== null), [quotes]);

  const runTransition = useCallback(
    async (quote: Quote, targetLane: KanbanLane) => {
      const sourceLane = STATUS_TO_LANE[quote.status];
      if (sourceLane === targetLane) return;

      setBusy(quote.id, true);
      try {
        if (targetLane === "Pending approval" && (quote.status === "draft" || quote.status === "returnedForRevision")) {
          const { data } = await quotesApi.submit(quote.id, quote.revision, newIdempotencyKey());
          patchQuote(data);
          notify(`${quote.number} submitted for approval`, "success");
          return;
        }

        if (targetLane === "Approved" && (quote.status === "submittedForApproval" || quote.status === "awaitingApproval")) {
          const { data: steps } = await quotesApi.approvals(quote.id);
          const pendingStep = steps.find((s) => s.status === "pending");
          if (!pendingStep) {
            notify(`${quote.number} has no pending approval step to decide.`, "error");
            return;
          }
          const { data } = await quotesApi.decide(quote.id, pendingStep.id, "approve", undefined, newIdempotencyKey());
          patchQuote(data);
          notify(`${quote.number} approved`, "success");
          return;
        }

        if (targetLane === "Negotiation" && quote.status === "approvedInternal") {
          const { data: contacts } = await customersApi.contacts(quote.customer.id);
          if (contacts.length === 0) {
            notify(`${quote.customer.name} has no contacts to share this quote with yet.`, "error");
            return;
          }
          if (contacts.length === 1) {
            const { data } = await quotesApi.share(quote.id, [contacts[0].id], quote.revision, newIdempotencyKey());
            patchQuote(data);
            notify(`${quote.number} shared with ${contacts[0].name}`, "success");
            return;
          }
          setShareModal({ quote, contacts });
          return;
        }

        if (targetLane === "Fulfillment") {
          notify(`${quote.number} moves to Fulfillment only after the customer accepts it in the portal.`, "error");
          return;
        }

        if (targetLane === "Confirmed" && quote.status === "readyForOrder") {
          await quotesApi.convertToOrder(quote.id, quote.revision, newIdempotencyKey());
          const { data } = await quotesApi.get(quote.id);
          patchQuote(data);
          notify(`${quote.number} converted to an order`, "success");
          return;
        }

        notify(`Can't move ${quote.number} from "${sourceLane}" to "${targetLane}" directly.`, "error");
      } catch (e) {
        notify(e instanceof ApiError ? e.message : "That action failed. Try again.", "error");
      } finally {
        setBusy(quote.id, false);
      }
    },
    [notify],
  );

  const confirmShare = async (contactId: string) => {
    if (!shareModal) return;
    const { quote } = shareModal;
    setShareModal(null);
    setBusy(quote.id, true);
    try {
      const { data } = await quotesApi.share(quote.id, [contactId], quote.revision, newIdempotencyKey());
      patchQuote(data);
      notify(`${quote.number} shared with customer`, "success");
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not share the quote.", "error");
    } finally {
      setBusy(quote.id, false);
    }
  };

  const createDeal = async () => {
    if (!addDealCustomerId) return;
    setAddDealOpen(false);
    try {
      const { data } = await quotesApi.create({ customerId: addDealCustomerId, currency: "USD" }, newIdempotencyKey());
      setQuotes((prev) => (prev ? [data, ...prev] : [data]));
      notify(`Created draft quote ${data.number}`, "success");
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not create a new quote.", "error");
    }
  };

  if (loading) {
    return (
      <>
        <PageHead
          eyebrow="Pipeline Management"
          title="Quotations"
          subtitle={slow ? "Still loading — the database can take a while to wake up after being idle." : "Loading your pipeline…"}
        />
        <Skeleton height={360} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHead eyebrow="Pipeline Management" title="Quotations" subtitle="Manage draft quotes, approvals, and negotiations." />
        <Card>
          <ErrorState title="Couldn't load quotations" hint={error} onRetry={load} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="Pipeline Management"
        title="Quotations"
        subtitle="Manage draft quotes, approval gating, and active negotiations."
        actions={
          <>
            <div className="tabs">
              <Button tone={view === "cards" ? "primary" : undefined} onClick={() => setView("cards")}>Kanban Stages</Button>
              <Button tone={view === "table" ? "primary" : undefined} onClick={() => setView("table")}>Data Table</Button>
            </div>
            <Button
              tone="primary"
              disabled={!customers || customers.length === 0}
              onClick={() => {
                if (customers && customers.length === 1) {
                  setAddDealCustomerId(customers[0].id);
                  createDeal();
                } else {
                  setAddDealCustomerId(customers?.[0]?.id ?? "");
                  setAddDealOpen(true);
                }
              }}
            >
              <Plus size={15} aria-hidden="true" /> New Quote
            </Button>
          </>
        }
      />

      {customers && customers.length === 0 ? (
        <Card>
          <Empty
            icon={<Plus size={28} aria-hidden="true" />}
            title="No customers yet"
            hint="Create a customer before you can draft a quote."
          />
        </Card>
      ) : view === "cards" ? (
        <Card
          title="Kanban Pipeline Board"
          action={
            <div className="cluster" style={{ gap: 8 }}>
              <Badge tone="blue">Drag cards or use stage switchers</Badge>
            </div>
          }
        >
          {boardQuotes.length === 0 ? (
            <Empty
              icon={<Plus size={28} aria-hidden="true" />}
              title="No quotes in the pipeline"
              hint="Create your first quote to see it move through the pipeline."
              action={
                <Button tone="primary" onClick={() => setAddDealOpen(true)}>
                  <Plus size={14} aria-hidden="true" /> New Quote
                </Button>
              }
            />
          ) : (
            <div className="kanban">
              {KANBAN_LANES.map((lane) => {
                const inLane = boardQuotes.filter((q) => STATUS_TO_LANE[q.status] === lane);
                const isDropActive = dragOverLane === lane;
                return (
                  <div
                    className={`lane ${isDropActive ? "drop-target" : ""}`}
                    key={lane}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverLane !== lane) setDragOverLane(lane);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        e.dataTransfer.dropEffect = "move";
                      } catch {
                        /* dropEffect can throw in some browsers during dragover */
                      }
                      if (dragOverLane !== lane) setDragOverLane(lane);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverLane === lane) setDragOverLane(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      let droppedId = "";
                      try {
                        droppedId = e.dataTransfer.getData("text/deal-id") || e.dataTransfer.getData("text/plain");
                      } catch {
                        /* dataTransfer.getData can throw depending on drop origin */
                      }
                      if (!droppedId) {
                        droppedId = (window as unknown as { __activeKanbanDrag?: string }).__activeKanbanDrag || draggingId || "";
                      }
                      const quote = boardQuotes.find((q) => q.id === droppedId);
                      if (quote) runTransition(quote, lane);
                      (window as unknown as { __activeKanbanDrag?: string | null }).__activeKanbanDrag = null;
                      setDragOverLane(null);
                      setDraggingId(null);
                    }}
                  >
                    <div className="lane-header">
                      <div className="cluster" style={{ gap: 6 }}>
                        <strong>{lane}</strong>
                      </div>
                      <Badge tone={LANE_TONE[lane]}>{inLane.length}</Badge>
                    </div>
                    <div className="lane-body" style={{ display: "grid", gap: 10, minHeight: 280 }}>
                      {inLane.length ? (
                        inLane.map((quote) => (
                          <DealCard
                            key={quote.id}
                            name={quote.customer?.name ?? "Unknown"}
                            id={quote.number}
                            amount={money(quote.currency, quote.totals?.grandTotal ?? 0)}
                            owner={quote.owner?.name}
                            lane={lane}
                            tone={LANE_TONE[lane]}
                            busy={busyIds.has(quote.id)}
                            isDragging={draggingId === quote.id}
                            onDragStart={() => setDraggingId(quote.id)}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverLane(null);
                            }}
                            onOpen={() => router.push("/quote-builder")}
                            onMoveLane={(targetLane) => runTransition(quote, targetLane)}
                          />
                        ))
                      ) : (
                        <div className="lane-empty">
                          <p>No deals in this stage</p>
                          <span className="subtle" style={{ fontSize: 11 }}>Drag cards here to advance</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card title="Quotations Register">
          {(quotes ?? []).length === 0 ? (
            <Empty icon={<Plus size={28} aria-hidden="true" />} title="No quotes yet" hint="Create your first quote to get started." />
          ) : (
            <DataTable
              headers={["Quote Reference", "Customer Account", "Stage Status", "Sales Owner", "Total Value", "Action"]}
              rows={(quotes ?? []).map((q) => [
                q.number,
                q.customer?.name ?? "—",
                <Badge tone={STATUS_TO_LANE[q.status] ? LANE_TONE[STATUS_TO_LANE[q.status]!] : "red"} key="s">
                  {q.status}
                </Badge>,
                q.owner?.name ?? "—",
                money(q.currency, q.totals?.grandTotal ?? 0),
                <Button key="a" onClick={() => router.push("/quote-builder")}>Open</Button>
              ])}
            />
          )}
        </Card>
      )}

      {addDealOpen && customers ? (
        <Modal title="New Quote" onClose={() => setAddDealOpen(false)}>
          <label>
            Customer
            <select value={addDealCustomerId} onChange={(e) => setAddDealCustomerId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <Button tone="primary" onClick={createDeal} disabled={!addDealCustomerId}>Create Draft Quote</Button>
        </Modal>
      ) : null}

      {shareModal ? (
        <Modal title={`Share ${shareModal.quote.number}`} onClose={() => setShareModal(null)}>
          <p className="subtle">Choose which contact at {shareModal.quote.customer.name} should receive this quote.</p>
          {shareModal.contacts.map((contact) => (
            <Button key={contact.id} onClick={() => confirmShare(contact.id)}>
              {contact.name} · {contact.email}
            </Button>
          ))}
        </Modal>
      ) : null}

      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
