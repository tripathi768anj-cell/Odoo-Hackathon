"use client";

import { useRouter } from "next/navigation";
import { Box, Layers, Plus, SlidersHorizontal, Tag } from "lucide-react";
import { Badge, Button, Card, DataTable, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function ProductsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const goProductDetail = () => { notify("Product Detail loaded", "info"); router.push("/product-detail"); };
  const goDiscountSetup = () => { notify("Discount Setup loaded", "info"); router.push("/discount-setup"); };
  const goQuoteBuilder = () => { notify("Quotation Detail loaded", "info"); router.push("/quote-builder"); };
  const goBillingDetail = () => { notify("Billing loaded", "info"); router.push("/billing-detail"); };

  return (
    <>
      <PageHead
        eyebrow="Catalog Master"
        title="Product & Service Catalog"
        subtitle="Configure standard pricing, category rules, tax rates, and discount boundaries."
        actions={
          <>
            <Button tone="primary" onClick={goProductDetail}><Plus size={15} /> New Product</Button>
            <Button onClick={goDiscountSetup}><SlidersHorizontal size={15} /> Discount Rules</Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-3">
        <Metric title="Catalog Items" value="118 Active" detail="Across 14 categories" tone="blue" icon={<Tag size={14} />} onClick={goProductDetail} />
        <Metric title="Pricelist Regions" value="3 Tiers" detail="USD, EUR, Global Enterprise" tone="green" icon={<Layers size={14} />} onClick={goDiscountSetup} />
        <Metric title="Configurable Bundles" value="42 Bundles" detail="Hardware + Care Attach" tone="amber" icon={<Box size={14} />} onClick={goQuoteBuilder} />
      </div>
      <Card title="Products & Services Catalog">
        <DataTable
          headers={["Product Name", "Category", "Variants", "List Price", "Tax %", "Status", "Actions"]}
          rows={[
            ["Laptop Pro 14", "Hardware", "3 configurations", "₹1,200", "15.0%", <Badge tone="green" key="s">Active</Badge>, <Button key="a" tone="primary" onClick={goProductDetail}>Edit</Button>],
            ["Onsite Setup Service", "Services", "1 standard", "₹450", "10.0%", <Badge tone="green" key="s">Active</Badge>, <Button key="a" onClick={goProductDetail}>Edit</Button>],
            ["Enterprise Care Plan 2yr", "Subscription", "Monthly/Annual", "₹300/mo", "0.0%", <Badge tone="blue" key="s">Active</Badge>, <Button key="a" onClick={goBillingDetail}>Billing</Button>]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
