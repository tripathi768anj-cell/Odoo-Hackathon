"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShieldAlert, X } from "lucide-react";
import { Badge, Button, Card, DataTable, PageHead, PrototypeBadge, Stepper, ToastStack, useToast } from "../../components/ui";
import { QuoteStage } from "../../lib/demo-types";

export default function ApprovalDetailPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [quoteStage, setQuoteStage] = useState<QuoteStage>("Draft");
  const [approvalDecision, setApprovalDecision] = useState("Finance review pending");
  const [, setReturnedQuotes] = useState<string[]>([]);

  const approveQuote = () => {
    setQuoteStage("Approved");
    setApprovalDecision("Approved by Sales Ops & Finance Director");
    notify("Q-1042 approved. Stock reservation allocated.", "success");
    router.push("/fulfillment");
  };

  const returnQuote = () => {
    setApprovalDecision("Returned to sales rep for discount adjustment");
    setReturnedQuotes((q) => (q.includes("Q-1042") ? q : [...q, "Q-1042"]));
    notify("Q-1042 returned to sales rep with feedback note", "info");
  };

  return (
    <>
      <PageHead
        eyebrow="Audit & Verification"
        title="Approval Review: Quote Q-1042"
        subtitle="Verify discount thresholds, margin impact, and sign-off hierarchy for Acme Corp."
        actions={
          <>
            <Button tone="success" onClick={approveQuote}><Check size={15} aria-hidden="true" /> Approve</Button>
            <Button onClick={returnQuote}><RotateCcw size={15} /> Return for Reason</Button>
            <Button tone="danger" onClick={() => { setApprovalDecision("Rejected"); notify("Q-1042 rejected by approver", "error"); }}><X size={15} aria-hidden="true" /> Reject</Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid">
        <Card title="Line Item Concession Breakdown">
          <DataTable
            headers={["Line Item", "Concession Applied", "Maximum Allowed Cap", "Authorized Escalation Role"]}
            rows={[
              ["Laptop Pro 14", "12.0%", "15.0%", <Badge tone="green" key="1">Sales Ops</Badge>],
              ["Onsite Setup Service", "16.0%", "10.0%", <Badge tone="red" key="2">Finance Director</Badge>],
              ["Extended Warranty 2-Year", "10.0%", "10.0%", <Badge tone="blue" key="3">Auto Compliant</Badge>]
            ]}
          />
          <div className="notice red" style={{ marginTop: 14 }}>
            <div className="cluster">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>Onsite Setup Service discount exceeds standard policy by 6.0%. Requires Finance Director override.</span>
            </div>
            <Badge tone="red">{approvalDecision}</Badge>
          </div>
        </Card>
        <Card title="Approval Hierarchy & Audit History">
          <Stepper active={quoteStage === "Approved" ? 2 : 1} />
          <DataTable
            headers={["Approval Tier", "Approver Identity", "Timestamp", "Audit Notes"]}
            rows={[
              ["Sales Ops Lead", "Sarah Jenkins", "Aug 29, 2:40 PM", "Approved under Gold Account Program"],
              ["Finance Director", "Naveen Kapoor", "Awaiting Review", "Evaluating margin impact on professional services"],
              ["Warehouse Fulfillment", "East Depot Logistics", "Pending Sign-off", "Pre-allocation staged in warehouse"]
            ]}
          />
        </Card>
      </div>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
