"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Percent, Plus, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, Stepper, ToastStack, useToast } from "../../components/ui";
import { INITIAL_LINES, LineItem, QuoteStage, money, percent } from "../../lib/demo-types";
import { ApiError, Quote, quotesApi, newIdempotencyKey } from "../../lib/api-client";

function stageForStatus(status: Quote["status"]): QuoteStage {
  if (status === "awaitingApproval" || status === "submittedForApproval") return "Pending approval";
  if (status === "approvedInternal") return "Approved";
  if (status === "converted") return "Fulfillment";
  return "Draft";
}

export default function QuoteBuilderPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteStage, setQuoteStage] = useState<QuoteStage>("Draft");
  const [approvalDecision, setApprovalDecision] = useState("Finance review pending");
  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listed = await quotesApi.list({ limit: 1 });
        const first = listed.data[0];
        if (!first) throw new Error("No quotes are available for this workspace.");
        const detail = (await quotesApi.get(first.id)).data;
        if (cancelled) return;
        setQuote(detail);
        setQuoteStage(stageForStatus(detail.status));
        setLines((detail.lines ?? []).map((line) => ({
          id: line.id,
          product: line.snapshot.name,
          category: line.snapshot.categoryCode ?? "Product",
          qty: Number(line.quantity),
          price: Number(line.snapshot.unitPrice),
          discount: Number(line.discountPct),
          cap: 10,
        })));
      } catch (error) {
        if (!cancelled) notify(error instanceof ApiError ? error.message : "Could not load a quote from the backend.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [notify]);

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  const updateLineDiscount = (id: string, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(100, Math.max(0, parsed));
    setLines((current) => current.map((line) => (line.id === id ? { ...line, discount: clamped } : line)));
  };

  const updateLineQty = (id: string, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(1, Math.floor(parsed) || 1);
    setLines((current) => current.map((line) => (line.id === id ? { ...line, qty: clamped } : line)));
  };

  const addUpsellToQuote = (item: { product: string; category: string; price: number; cap: number }) => {
    notify(`${item.product} is available after selecting a catalog product from the backend.`, "info");
  };

  const saveDraft = async () => {
    if (!quote) return;
    setSaving(true);
    try {
      let revision = quote.revision;
      let latest = quote;
      for (const line of lines) {
        const result = await quotesApi.updateLine(quote.id, line.id, revision, {
          quantity: String(line.qty),
          discountPct: String(line.discount),
        });
        latest = result.data;
        revision = latest.revision;
      }
      setQuote(latest);
      notify("Quote changes saved to the backend.", "success");
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not save quote changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitQuote = async () => {
    if (!quote) return;
    setSaving(true);
    try {
      await saveDraft();
      const latest = (await quotesApi.get(quote.id)).data;
      const submitted = (await quotesApi.submit(quote.id, latest.revision, newIdempotencyKey())).data;
      setQuote(submitted);
      setQuoteStage(stageForStatus(submitted.status));
      setApprovalDecision("Approval workflow started");
      notify(`${submitted.number} submitted to the approval matrix.`, "success");
      router.push("/approvals");
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not submit the quote.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Quote Configurator"
        title={loading ? "Loading quotation..." : `Quotation ${quote?.number ?? ""}: ${quote?.customer.name ?? ""}`}
        subtitle="Live quote data, pricing rules, and approval state from the backend."
        actions={
          <>
            <Badge tone={totals.blended > 10 ? "red" : "green"}>
              <Percent size={11} /> {percent(totals.blended)} Blended Discount
            </Badge>
            <Button onClick={saveDraft} disabled={!quote || saving}>{saving ? "Saving..." : "Save Draft"}</Button>
            <Button tone="primary" onClick={submitQuote} disabled={!quote || saving}>
              <Send size={15} /> Submit for Approval
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      {lines.some((line) => line.discount > line.cap) ? (
        <div className="notice red">
          <div className="cluster">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>Multi-level Approval Required: Services discount (16.0%) exceeds the Tier Cap (10.0%).</span>
          </div>
          <Badge tone="red">Escalation Triggered</Badge>
        </div>
      ) : (
        <div className="notice green">
          <div className="cluster">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Standard Concession: Blended discount is within sales rep authority limit.</span>
          </div>
          <Badge tone="green">Auto-Pass Eligible</Badge>
        </div>
      )}
      <div className="split">
        <Card title="Line Items & Concession Matrix" action={<Badge tone="blue">{lines.length} Line Items</Badge>}>
          <DataTable
            headers={["Product & Category", "Qty", "List Price", "Discount %", "Tier Cap", "Net Total", "Compliance"]}
            rows={lines.map((line) => [
              <div key="p">
                <strong>{line.product}</strong>
                <div className="subtle">{line.category}</div>
              </div>,
              <input
                key="q"
                min={1}
                aria-label={`Quantity for ${line.product}`}
                onChange={(event) => updateLineQty(line.id, event.target.value)}
                style={{ width: 68 }}
                type="number"
                value={line.qty}
              />,
              <span className="mono" key="l">{money(line.price)}</span>,
              <input
                key="d"
                aria-label={`Discount percentage for ${line.product}`}
                onChange={(event) => updateLineDiscount(line.id, event.target.value)}
                style={{ width: 80 }}
                type="number"
                value={line.discount}
              />,
              <span className="mono" key="c">{percent(line.cap)}</span>,
              <span className="mono" key="n" style={{ fontWeight: 600 }}>{money(line.qty * line.price * (1 - line.discount / 100))}</span>,
              <Badge key="a" tone={line.discount > line.cap ? "red" : "green"}>
                {line.discount > line.cap ? "Over Cap" : "Compliant"}
              </Badge>
            ])}
          />
          <div className="notice" style={{ marginTop: 14 }}>
            <div className="cluster" style={{ gap: 16 }}>
              <span>Gross: <strong className="mono">{money(totals.gross)}</strong></span>
              <span>Concession: <strong className="mono" style={{ color: "var(--amber-text)" }}>{money(totals.concession)}</strong></span>
              <span>Net Payable: <strong className="mono" style={{ color: "var(--green-text)" }}>{money(totals.net)}</strong></span>
            </div>
            <Button onClick={() => addUpsellToQuote({ product: "Enterprise Care Plan 2yr", category: "Subscription", price: 300, cap: 10 })}>
              <Plus size={14} /> Add Care Plan
            </Button>
          </div>
        </Card>
        <div className="grid">
          <Card title="Quote-to-Cash Stepper">
            <Stepper active={quoteStage === "Draft" ? 0 : quoteStage === "Pending approval" ? 1 : quoteStage === "Invoiced" ? 3 : quoteStage === "Paid" ? 4 : 2} />
            <div className="grid" style={{ gap: 8, marginTop: 12 }}>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="subtle">Draft State:</span>
                <Badge tone="green">Ready</Badge>
              </div>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="subtle">Manager Approval:</span>
                <Badge tone={lines.some((line) => line.discount > line.cap) ? "red" : "green"}>{lines.some((line) => line.discount > line.cap) ? "Required" : "Not Required"}</Badge>
              </div>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <span className="subtle">Decision Status:</span>
                <Badge tone={quoteStage === "Approved" ? "green" : "amber"}>{approvalDecision}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Card title="AI Recommended Upsells & Bundles" action={<Badge tone="blue"><Sparkles size={11} /> 3 Recommendations</Badge>}>
        <div className="grid grid-3">
          {[
            { name: "Precision Docking Station Gen 2", sub: "Compatible with Laptop Pro 14", price: "₹180", product: "Precision Docking Station Gen 2", category: "Hardware", amount: 180, cap: 15 },
            { name: "Enterprise Care Plan 2yr", sub: "24/7 SLA & Rapid Replacement", price: "₹300/mo", product: "Enterprise Care Plan 2yr", category: "Subscription", amount: 300, cap: 10 },
            { name: "Ergonomic Bluetooth Mouse", sub: "High attach rate with laptops", price: "₹65", product: "Ergonomic Bluetooth Mouse", category: "Hardware", amount: 65, cap: 15 }
          ].map((rec) => (
            <div className="deal-card" key={rec.name}>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <strong>{rec.name}</strong>
                <span className="mono subtle">{rec.price}</span>
              </div>
              <span className="subtle">{rec.sub}</span>
              <Button tone="ghost" onClick={() => addUpsellToQuote({ product: rec.product, category: rec.category, price: rec.amount, cap: rec.cap })}>
                <Plus size={14} /> Add to Quote
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
