"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { QuoteStage } from "../../lib/demo-types";

export default function BillingDetailPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [, setSubscriptionActive] = useState(false);
  const [, setQuoteStage] = useState<QuoteStage>("Draft");

  const generateInvoice = () => {
    setSubscriptionActive(true);
    setQuoteStage("Invoiced");
    notify("Invoice INV-1042 generated from subscription", "success");
    router.push("/invoices");
  };

  return (
    <>
      <PageHead
        eyebrow="Contract Billing"
        title="Billing Schedule: Acme Care Plan 2yr"
        subtitle="Automated subscription billing schedule, recurring terms, and invoice generation."
        actions={
          <>
            <Button onClick={() => { setSubscriptionActive(true); notify("Subscription terms updated", "success"); }}>Update Plan</Button>
            <Button tone="danger" onClick={() => notify("Cancellation queue triggered", "error")}>Cancel Plan</Button>
            <Button tone="primary" onClick={generateInvoice}><Receipt size={15} /> Generate Invoice</Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Recurring Line Items & Schedule">
        <DataTable
          headers={["Service Line", "Quantity", "Recurring Rate", "Cadence"]}
          rows={[
            ["Enterprise Care Plan 2yr", "1", "₹300.00", "Monthly"],
            ["Priority Engineer SLA", "1", "₹150.00", "Monthly"]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
