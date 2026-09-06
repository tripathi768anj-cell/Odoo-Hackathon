"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { downloadCsv } from "../../lib/csv";
import { INITIAL_LINES, LineItem, QuoteStage, money } from "../../lib/demo-types";
import { ApiError, billingApi, Invoice } from "../../lib/api-client";

export default function InvoicesPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines] = useState<LineItem[]>(INITIAL_LINES);
  const [, setQuoteStage] = useState<QuoteStage>("Draft");
  const [, setSubscriptionActive] = useState(false);

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  useEffect(() => {
    billingApi.invoices({ limit: 100 }).then((result) => setInvoices(result.invoices)).catch((error) => {
      notify(error instanceof ApiError ? error.message : "Could not load invoices from the backend.", "error");
    }).finally(() => setLoading(false));
  }, [notify]);

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
        subtitle="Track accounts receivable, payment statuses, and Razorpay settlement data from the backend."
        actions={
          <>
            <Button tone="primary" onClick={generateInvoice}><Plus size={15} /> Generate Invoice</Button>
            <Button
              onClick={() => {
                downloadCsv(
                  "dealflow-invoices.csv",
                  ["Invoice ID", "Account", "Billed Amount", "Payment Status", "Due Date"],
                  [
                    ...invoices.map((invoice) => [
                      invoice.number,
                      invoice.customerId,
                      invoice.grandTotal,
                      invoice.status,
                      invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "Not issued",
                    ]),
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
        {loading ? <div className="notice blue">Loading invoices from the backend...</div> : null}
        <DataTable
          headers={["Invoice ID", "Account", "Billed Amount", "Payment Status", "Due Date", "Actions"]}
          rows={invoices.map((invoice) => [
            <strong key="i">{invoice.number}</strong>,
            invoice.customerId,
            <span className="mono" key="m">{invoice.currency} {invoice.grandTotal}</span>,
            <Badge tone={invoice.status === "paid" ? "green" : invoice.status === "issued" || invoice.status === "partial" ? "amber" : "neutral"} key="s">
              {invoice.status === "paid" ? <CheckCircle2 size={11} /> : <Clock size={11} />} {invoice.status}
            </Badge>,
            invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "Not issued",
            <Button key="a" tone="primary" onClick={() => { notify("Invoice Detail loaded", "info"); router.push("/invoice-detail"); }}>Inspect Invoice</Button>
          ])}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
