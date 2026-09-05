"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { QuoteStage } from "../../lib/demo-types";

export default function FulfillmentDetailPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [fulfillmentAccepted, setFulfillmentAccepted] = useState(false);
  const [, setQuoteStage] = useState<QuoteStage>("Draft");

  const acceptSplit = () => {
    setFulfillmentAccepted(true);
    setQuoteStage("Fulfillment");
    notify("Split fulfillment accepted. Plan initiated.", "success");
    router.push("/subscriptions");
  };

  return (
    <>
      <PageHead
        eyebrow="Smart Inventory Routing"
        title="Fulfillment Routing: Q-1042"
        subtitle="Multi-warehouse split allocation for Acme Corp to prevent backorders and meet SLA."
        actions={
          <>
            <Button tone="primary" onClick={acceptSplit}><PackageCheck size={15} /> Accept Suggested Split</Button>
            <Button onClick={() => notify("Manual routing editor opened", "info")}>Manual Allocation</Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Recommended Split Allocation">
        <DataTable
          headers={["Fulfillment Center", "Assigned Products", "Package Count", "Carrier Logistics Cost"]}
          rows={[
            ["Main Warehouse (Chicago)", "Laptop Pro 14 x2", "1 Box", "₹42.00"],
            ["East Depot (New York)", "Docking Station Fallback x1", "1 Box", "₹18.00"],
            ["Digital Delivery Hub", "Enterprise Care Plan 2yr", "Instant Provision", "₹0.00"]
          ]}
        />
        <div className="notice green" style={{ marginTop: 14 }}>
          <div className="cluster">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Split routing satisfies delivery date (Sep 12) without incurring out-of-stock delays.</span>
          </div>
          <Badge tone={fulfillmentAccepted ? "green" : "amber"}>{fulfillmentAccepted ? "Split Active" : "Pending Acceptance"}</Badge>
        </div>
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
