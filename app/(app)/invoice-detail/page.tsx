"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, Stepper, ToastStack, useToast } from "../../components/ui";
import { INITIAL_LINES, LineItem, QuoteStage, money } from "../../lib/demo-types";

export default function InvoiceDetailPage() {
  const { toast, kind, notify, dismiss } = useToast();

  const [invoicePaid, setInvoicePaid] = useState(false);
  const [lines] = useState<LineItem[]>(INITIAL_LINES);
  const [, setQuoteStage] = useState<QuoteStage>("Draft");

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  const receivePayment = () => {
    setInvoicePaid(true);
    setQuoteStage("Paid");
    notify("Payment received via Stripe. Books reconciled.", "success");
  };

  return (
    <>
      <PageHead
        eyebrow="Billing Reconciliation"
        title="Invoice INV-1042: Acme Corp"
        subtitle="Review line-item billing, payment terms, and Stripe ERP settlement confirmation."
        actions={
          <>
            <Button
              onClick={async () => {
                const { downloadInvoicePdf } = await import("../../lib/pdf");
                downloadInvoicePdf({ id: "INV-1042", account: "Acme Corp", due: "Sep 15, 2026", status: invoicePaid ? "Paid and reconciled" : "Open", lines });
                notify("Official tax invoice PDF generated", "success");
              }}
            >
              <Download size={15} /> Save PDF
            </Button>
            <Button tone="success" disabled={invoicePaid} onClick={receivePayment}>
              <CheckCircle2 size={15} /> {invoicePaid ? "Payment Settled" : "Receive Payment"}
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Reconciliation Lifecycle">
        <Stepper active={invoicePaid ? 4 : 3} />
        <DataTable
          headers={["Invoice Reference", "Payable Total", "Current Status", "Payment Due"]}
          rows={[
            [
              <strong key="i">INV-1042</strong>,
              <span className="mono" key="m">{money(totals.net)}</span>,
              <Badge tone={invoicePaid ? "green" : "amber"} key="s">
                {invoicePaid ? "Paid & Reconciled" : "Open / Unpaid"}
              </Badge>,
              "Sep 15, 2026"
            ]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
