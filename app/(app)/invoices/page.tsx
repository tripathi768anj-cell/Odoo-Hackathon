"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { downloadCsv } from "../../lib/csv";
import { INITIAL_LINES, LineItem, QuoteStage, money } from "../../lib/demo-types";

export default function InvoicesPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [invoicePaid] = useState(false);
  const [lines] = useState<LineItem[]>(INITIAL_LINES);
  const [, setQuoteStage] = useState<QuoteStage>("Draft");
  const [, setSubscriptionActive] = useState(false);

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  const generateInvoice = () => {
    setSubscriptionActive(true);
    setQuoteStage("Invoiced");
    notify("Invoice INV-1042 generated from subscription", "success");
    router.push("/invoices");
  };

  return (
    <>
      <PageHead
        eyebrow="Accounts Receivable"
        title="Invoices & Collections"
        subtitle="Track accounts receivable, automated reminders, and Stripe settlement statuses."
        actions={
          <>
            <Button tone="primary" onClick={generateInvoice}><Plus size={15} /> Generate Invoice</Button>
            <Button
              onClick={() => {
                downloadCsv(
                  "dealflow-invoices.csv",
                  ["Invoice ID", "Account", "Billed Amount", "Payment Status", "Due Date"],
                  [
                    ["INV-1042", "Acme Corp", totals.net, invoicePaid ? "Settled & Paid" : "Awaiting Settlement", "Sep 15, 2026"],
                    ["INV-1039", "Beta Industries", 18200, "Overdue (3d)", "Aug 9, 2026"]
                  ]
                );
                notify("Invoices exported to CSV", "success");
              }}
            >
              <FileSpreadsheet size={15} /> Export Sheet
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Accounts Receivable Ledger">
        <DataTable
          headers={["Invoice ID", "Account", "Billed Amount", "Payment Status", "Due Date", "Actions"]}
          rows={[
            [
              <strong key="i">INV-1042</strong>,
              "Acme Corp",
              <span className="mono" key="m">{money(totals.net)}</span>,
              <Badge tone={invoicePaid ? "green" : "amber"} key="s">
                {invoicePaid ? <CheckCircle2 size={11} /> : <Clock size={11} />} {invoicePaid ? "Settled & Paid" : "Awaiting Settlement"}
              </Badge>,
              "Sep 15, 2026",
              <Button key="a" tone="primary" onClick={() => { notify("Invoice Detail loaded", "info"); router.push("/invoice-detail"); }}>Inspect Invoice</Button>
            ],
            [
              <strong key="i">INV-1039</strong>,
              "Beta Industries",
              <span className="mono" key="m">₹18,200</span>,
              <Badge tone="red" key="s"><AlertCircle size={11} /> Overdue (3d)</Badge>,
              "Aug 9, 2026",
              <Button key="a" onClick={() => notify("Automated payment reminder dispatched", "success")}>Send Reminder</Button>
            ]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
