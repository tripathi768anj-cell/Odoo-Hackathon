"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Percent, Plus, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, Stepper, ToastStack, useToast } from "../../components/ui";
import { INITIAL_LINES, LineItem, QuoteStage, money, percent } from "../../lib/demo-types";

export default function QuoteBuilderPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [quoteStage, setQuoteStage] = useState<QuoteStage>("Draft");
  const [approvalDecision, setApprovalDecision] = useState("Finance review pending");
  const [lines, setLines] = useState<LineItem[]>(INITIAL_LINES);
  const [, setReturnedQuotes] = useState<string[]>([]);

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
    const id = `upsell-${Date.now().toString(36)}`;
    setLines((current) => [...current, { id, qty: 1, discount: 0, ...item }]);
    notify(`${item.product} added to Q-1042 at ${money(item.price)}`, "success");
  };

  const submitQuote = () => {
    setQuoteStage("Pending approval");
    setApprovalDecision("Sales Lead approved; Finance Director pending");
    setReturnedQuotes((q) => q.filter((id) => id !== "Q-1042"));
    notify("Q-1042 escalated to approval matrix", "success");
    router.push("/approvals");
  };

  return (
    <>
      <PageHead
        eyebrow="Quote Configurator"
        title="Quotation Q-1042: Acme Corp"
        subtitle="Gold Tier Pricing. Automated margin guard and multi-tier approval checks."
        actions={
          <>
            <Badge tone={totals.blended > 10 ? "red" : "green"}>
              <Percent size={11} /> {percent(totals.blended)} Blended Discount
            </Badge>
            <Button onClick={() => notify("Quote changes saved to draft", "info")}>Save Draft</Button>
            <Button tone="primary" onClick={submitQuote}>
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
