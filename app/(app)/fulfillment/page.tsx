"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, PackageCheck, RefreshCw, Truck, Warehouse } from "lucide-react";
import { Badge, Button, Card, DataTable, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function FulfillmentPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [fulfillmentAccepted] = useState(false);

  return (
    <>
      <PageHead
        eyebrow="Logistics & Warehousing"
        title="Fulfillment & Stock Overview"
        subtitle="Multi-warehouse inventory allocation, split shipment rules, and packing slips."
        actions={
          <>
            <Button tone="primary" onClick={() => notify("Realtime inventory refreshed from ERP", "success")}><RefreshCw size={15} /> Refresh Stock</Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-3">
        <Metric title="Central Warehouse" value="88% Cap" detail="Capacity utilized (Optimal)" tone="amber" icon={<Warehouse size={14} />} meter={{ pct: 88, tone: "warn" }} />
        <Metric title="Pending Shipments" value="7 Orders" detail="₹162,400 total value staged" tone="blue" icon={<Truck size={14} />} />
        <Metric title="Split Required" value="1 Item" detail="Docking Station inventory fallback" tone="red" icon={<AlertTriangle size={14} />} />
      </div>
      <Card title="Staged Orders Ready for Dispatch">
        <DataTable
          headers={["Order Ref", "Customer Account", "Item Manifest", "Dispatch Origin", "Status", "Action"]}
          rows={[
            [
              <strong key="o">Q-1042 / ORD-8021</strong>,
              "Acme Corp",
              "2x Laptop, 1x Setup, 1x Care Plan",
              "Main Warehouse + East Depot",
              <Badge tone={fulfillmentAccepted ? "green" : "amber"} key="s">
                {fulfillmentAccepted ? <PackageCheck size={11} /> : <Clock size={11} />} {fulfillmentAccepted ? "Split Allocated" : "Awaiting Split"}
              </Badge>,
              <Button key="a" tone="primary" onClick={() => { notify("Fulfillment Detail loaded", "info"); router.push("/fulfillment-detail"); }}>Open Split</Button>
            ],
            [
              <strong key="o">Q-1038 / ORD-8019</strong>,
              "Delta LLC",
              "10x Laptop Pro 14",
              "Main Warehouse",
              <Badge tone="green" key="s"><CheckCircle2 size={11} /> Ready</Badge>,
              <Button key="a" onClick={() => notify("Pick slip sent to thermal printer", "success")}>Print Pick Slip</Button>
            ],
            [
              <strong key="o">Q-1035 / ORD-8014</strong>,
              "Nova Retail",
              "5x Docking Station, 5x Mouse",
              "East Coast Depot",
              <Badge tone="blue" key="s"><Truck size={11} /> In Transit</Badge>,
              <Button key="a" onClick={() => notify("Carrier tracking live window opened", "info")}>Track Shipment</Button>
            ]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
