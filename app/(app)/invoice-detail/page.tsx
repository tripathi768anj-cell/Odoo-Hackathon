"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, Stepper, ToastStack, useToast } from "../../components/ui";
import { INITIAL_LINES, LineItem, money } from "../../lib/demo-types";
import { ApiError, billingApi, Invoice } from "../../lib/api-client";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function InvoiceDetailPage() {
  const { toast, kind, notify, dismiss } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [lines] = useState<LineItem[]>(INITIAL_LINES);

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  useEffect(() => {
    billingApi.invoices({ status: "issued", limit: 100 }).then((result) => {
      const payable = result.invoices.find((candidate) => candidate.status === "issued" || candidate.status === "partial");
      setInvoice(payable ?? null);
    }).catch((error) => {
      notify(error instanceof ApiError ? error.message : "Could not load invoices.", "error");
    }).finally(() => setLoading(false));
  }, [notify]);

  const invoicePaid = invoice?.status === "paid";

  const receivePayment = async () => {
    if (!invoice) return;
    setPaymentLoading(true);
    try {
      const { data } = await billingApi.createRazorpayOrder(invoice.id);
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
          document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");
      const Razorpay = window.Razorpay;
      const checkout = new Razorpay({
        key: data.keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "DealFlow 360",
        description: `Invoice ${invoice.number}`,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verified = await billingApi.verifyRazorpayPayment(invoice.id, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setInvoice(verified.data.invoice);
            notify("Razorpay payment verified and reconciled.", "success");
          } catch (error) {
            notify(error instanceof ApiError ? error.message : "Payment verification failed.", "error");
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      });
      checkout.open();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not start Razorpay checkout.", "error");
      setPaymentLoading(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Billing Reconciliation"
        title={loading ? "Loading invoice..." : `Invoice ${invoice?.number ?? ""}`}
        subtitle="Pay securely through Razorpay. The backend verifies the payment signature before reconciliation."
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
            <Button tone="success" disabled={!invoice || invoicePaid || paymentLoading} onClick={receivePayment}>
              <CheckCircle2 size={15} /> {invoicePaid ? "Payment Settled" : paymentLoading ? "Opening Razorpay..." : "Pay with Razorpay"}
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
              <strong key="i">{invoice?.number ?? "No invoice"}</strong>,
              <span className="mono" key="m">{invoice?.balance ?? money(totals.net)}</span>,
              <Badge tone={invoicePaid ? "green" : "amber"} key="s">
                {invoicePaid ? "Paid & Reconciled" : "Open / Unpaid"}
              </Badge>,
              invoice?.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "Not available"
            ]
          ]}
        />
      </Card>
      <Card title="Online Payment">
        <div className="notice blue">
          {loading
            ? "Checking for an invoice that can be paid..."
            : !invoice
              ? "No backend invoice is available yet. Convert an approved quote to an order and issue an invoice first."
              : invoicePaid
                ? "This invoice has already been paid and reconciled."
                : "Pay this invoice securely with Razorpay."}
        </div>
        <div className="cluster" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <span className="subtle">
            {invoice ? `${invoice.number} · ${invoice.currency} ${invoice.balance} outstanding` : "Invoice required"}
          </span>
          <Button tone="success" disabled={!invoice || invoicePaid || paymentLoading} onClick={receivePayment}>
            <CheckCircle2 size={15} /> {invoicePaid ? "Payment Settled" : paymentLoading ? "Opening Razorpay..." : "Pay with Razorpay"}
          </Button>
        </div>
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
