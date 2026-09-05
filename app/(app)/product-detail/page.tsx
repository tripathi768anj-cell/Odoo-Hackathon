"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function ProductDetailPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [productStatus, setProductStatus] = useState("Draft");

  return (
    <>
      <PageHead
        eyebrow="Catalog Item Editor"
        title="Product Definition: Laptop Pro 14"
        subtitle="Configure pricing tiers, tax classifications, inventory rules, and recurring billing."
        actions={
          <>
            <Button onClick={() => { notify("Discount Setup loaded", "info"); router.push("/discount-setup"); }}>Discount Rules</Button>
            <Button tone="primary" onClick={() => { setProductStatus("Active"); notify("Product catalog changes committed", "success"); }}>
              <Check size={15} /> Save Product
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      <Card title="Product Master Parameters">
        <div className="form-grid">
          <label>Product Name<input defaultValue="Laptop Pro 14" /></label>
          <label>Category<input defaultValue="Hardware" /></label>
          <label>Base Price (₹)<input defaultValue="1200" type="number" /></label>
          <label>Applicable Tax (%)<input defaultValue="15" type="number" /></label>
          <label>Recurring Subscription<select defaultValue="no"><option value="no">No (one-time purchase)</option><option value="yes">Yes (recurring plan)</option></select></label>
          <label>Available Stock on Hand<input defaultValue="42" type="number" /></label>
        </div>
        <div className="notice green" style={{ marginTop: 14 }}>
          <div className="cluster">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Product status: {productStatus}</span>
          </div>
          <Badge tone={productStatus === "Active" ? "green" : "amber"}>{productStatus}</Badge>
        </div>
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
