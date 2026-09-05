"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function SubscriptionsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [subscriptionActive] = useState(false);

  return (
    <>
      <PageHead
        eyebrow="Recurring Revenue Engine"
        title="Subscriptions & Care Plans"
        subtitle="Monitor recurring service contracts, MRR generation, and SLA renewal dates."
        actions={
          <>
            <Button tone="primary" onClick={() => { notify("Billing loaded", "info"); router.push("/billing-detail"); }}><Plus size={15} /> New Subscription Plan</Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Active Contracts & Service Plans">
        <DataTable
          headers={["Subscriber", "Service Plan", "Billing Cadence", "Next Renewal", "Contract State", "Action"]}
          rows={[
            [
              <strong key="s">Acme Corp</strong>,
              "Enterprise Care Plan 2yr",
              "Monthly (₹300/mo)",
              "Sep 15, 2026",
              <Badge tone={subscriptionActive ? "green" : "amber"} key="st">
                {subscriptionActive ? "Active" : "Draft"}
              </Badge>,
              <Button key="a" tone="primary" onClick={() => { notify("Billing loaded", "info"); router.push("/billing-detail"); }}>Manage</Button>
            ],
            [
              <strong key="s">Beta Industries</strong>,
              "Support SLA Gold",
              "Quarterly (₹1,200/qtr)",
              "Oct 1, 2026",
              <Badge tone="green" key="st">Active</Badge>,
              <Button key="a" onClick={() => { notify("Billing loaded", "info"); router.push("/billing-detail"); }}>Manage</Button>
            ],
            [
              <strong key="s">Delta LLC</strong>,
              "Cloud Infrastructure Retainer",
              "Monthly (₹500/mo)",
              "Past Due",
              <Badge tone="red" key="st">Payment Retry</Badge>,
              <Button key="a" onClick={() => { notify("Invoice Detail loaded", "info"); router.push("/invoice-detail"); }}>View Invoice</Button>
            ]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
