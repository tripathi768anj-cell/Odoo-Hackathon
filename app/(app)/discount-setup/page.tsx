"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function DiscountSetupPage() {
  const { toast, kind, notify, dismiss } = useToast();

  const [discountRulesSaved, setDiscountRulesSaved] = useState(false);

  return (
    <>
      <PageHead
        eyebrow="Governance Configuration"
        title="Discount Tiers & Approval Thresholds"
        subtitle="Configure allowable discount caps by customer tier and set automated escalation paths."
        actions={
          <>
            <Button tone="primary" onClick={() => { setDiscountRulesSaved(true); notify("Discount governance policies saved", "success"); }}>Save Configuration</Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="split">
        <Card title="Discount Caps by Customer Tier">
          <DataTable
            headers={["Customer Tier", "Maximum Allowed Discount %"]}
            rows={[
              ["Bronze Tier", <input key="i" defaultValue="5" type="number" aria-label="Bronze cap" />],
              ["Silver Tier", <input key="i" defaultValue="10" type="number" aria-label="Silver cap" />],
              ["Gold Enterprise Tier", <input key="i" defaultValue="15" type="number" aria-label="Gold cap" />]
            ]}
          />
        </Card>
        <Card title="Category Specific Discount Caps">
          <DataTable
            headers={["Category", "Category Cap %"]}
            rows={[
              ["Hardware", <input key="i" defaultValue="15" type="number" aria-label="Hardware cap" />],
              ["Services", <input key="i" defaultValue="10" type="number" aria-label="Services cap" />],
              ["Subscription Care", <input key="i" defaultValue="10" type="number" aria-label="Subscription cap" />]
            ]}
          />
        </Card>
      </div>
      <Card title="Approval Escalation Authority Matrix">
        <DataTable
          headers={["Concession Severity", "Governance & Escalation Path"]}
          rows={[
            ["Within Tier & Category Cap", "Auto-Approved / Direct to Quote"],
            ["Exceeds Cap by < 5%", "Sales Team Lead Approval Required"],
            ["Exceeds Cap by > 5% or Service Concession", "Sales Operations Lead + Finance Director Approval"]
          ]}
        />
        <div className="notice" style={{ marginTop: 14 }}>
          <div className="cluster">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Configuration Status: {discountRulesSaved ? "Active & Enforced in Quote Builder" : "Pending Save"}</span>
          </div>
          <Badge tone={discountRulesSaved ? "green" : "amber"}>{discountRulesSaved ? "Enforced" : "Draft"}</Badge>
        </div>
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
