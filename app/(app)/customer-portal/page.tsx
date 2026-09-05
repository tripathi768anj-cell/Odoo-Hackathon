"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, UserRound } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { INITIAL_LINES, LineItem, QuoteStage, money, percent } from "../../lib/demo-types";

export default function CustomerPortalPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [lines] = useState<LineItem[]>(INITIAL_LINES);
  const [counterDiscount, setCounterDiscount] = useState("14.5");
  const [, setQuoteStage] = useState<QuoteStage>("Draft");
  const [, setApprovalDecision] = useState("Finance review pending");

  return (
    <>
      <div className="portal-bar">
        <div className="cluster">
          <UserRound size={16} aria-hidden="true" />
          <strong>Customer Negotiation View: Q-1042</strong>
          <Badge tone="amber">Awaiting Customer Decision</Badge>
        </div>
        <div className="cluster">
          <span className="subtle">Viewing as Dave (Acme Corp Procurement)</span>
          <Button onClick={() => { notify("Quotation Detail loaded", "info"); router.push("/quote-builder"); }}>Switch to Rep View</Button>
        </div>
      </div>
      <PageHead
        eyebrow="Interactive Customer Review"
        title="Quotation Q-1042 (Proposal Summary)"
        subtitle="Review discounted enterprise pricing or submit a counter proposal for review."
        actions={
          <>
            <Button
              tone="primary"
              onClick={async () => {
                const { downloadQuotePdf } = await import("../../lib/pdf");
                downloadQuotePdf({ id: "Q-1042", account: "Acme Corp", tier: "Gold Tier", date: "Sep 5, 2026", lines });
                notify("PDF quotation downloaded", "success");
              }}
            >
              <Download size={15} /> Download PDF
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="split">
        <Card title="Current Proposal Items">
          <DataTable
            headers={["Item Description", "Qty", "List Price", "Discount %", "Net Total"]}
            rows={lines.map((line) => [
              line.product,
              line.qty,
              money(line.price),
              percent(line.discount),
              <strong className="mono" key="n">{money(line.qty * line.price * (1 - line.discount / 100))}</strong>
            ])}
          />
        </Card>
        <Card title="Submit Counter Proposal">
          <form
            className="grid"
            onSubmit={(event) => {
              event.preventDefault();
              setQuoteStage("Pending approval");
              setApprovalDecision("Counter proposal under finance review");
              notify(`Counter proposal submitted for ${counterDiscount}% discount`, "info");
            }}
          >
            <label>
              Requested Discount %
              <input onChange={(event) => setCounterDiscount(event.target.value)} value={counterDiscount} />
            </label>
            <label>
              Desired Delivery Date
              <input defaultValue="2026-09-12" type="date" />
            </label>
            <label>
              Procurement Notes
              <textarea defaultValue="Can we bundle the Docking Station at ₹80 and sign this week?" rows={3} />
            </label>
            <Button tone="primary" type="submit">Submit Counter Proposal</Button>
            <Button tone="success" onClick={() => { setQuoteStage("Approved"); setApprovalDecision("Approved by customer; ready for fulfillment"); notify("Customer accepted quote. Ready for fulfillment.", "success"); }}>
              <Check size={15} /> Accept This Quote
            </Button>
          </form>
        </Card>
      </div>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
