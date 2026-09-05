"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, Inbox } from "lucide-react";
import { Badge, Button, Card, DataTable, Empty, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { QuoteStage } from "../../lib/demo-types";

export default function ApprovalsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [approvalFilter, setApprovalFilter] = useState("All");
  const [returnedQuotes] = useState<string[]>([]);
  const [quoteStage, setQuoteStage] = useState<QuoteStage>("Draft");
  const [, setApprovalDecision] = useState("Finance review pending");

  const approveQuote = () => {
    setQuoteStage("Approved");
    setApprovalDecision("Approved by Sales Ops & Finance Director");
    notify("Q-1042 approved. Stock reservation allocated.", "success");
    router.push("/fulfillment");
  };

  const q1042Status = returnedQuotes.includes("Q-1042") ? "Returned" : quoteStage === "Approved" || quoteStage === "Fulfillment" || quoteStage === "Subscribed" || quoteStage === "Invoiced" || quoteStage === "Paid" ? "Approved" : "Pending";
  const all: { id: string; row: React.ReactNode[]; status: string }[] = [
    {
      id: "Q-1042",
      status: q1042Status,
      row: [
        <strong key="q">Q-1042</strong>,
        "Acme Corp",
        <Badge tone="red" key="r">Major Deal</Badge>,
        "Sales Ops + Finance Director",
        <span className="mono" key="w">₹42,400</span>,
        "M. Shah / Sarah J.",
        <Badge tone="amber" key="t">1h left</Badge>,
        <Button key="a" tone="primary" onClick={() => { notify("Approval Detail loaded", "info"); router.push("/approval-detail"); }}>Open Review <ArrowRight size={14} aria-hidden="true" /></Button>
      ]
    },
    {
      id: "Q-1039",
      status: "Pending",
      row: [
        <strong key="q">Q-1039</strong>,
        "Beta Industries",
        <Badge tone="amber" key="r">Mid Tier</Badge>,
        "Sales Team Lead",
        <span className="mono" key="w">₹18,200</span>,
        "David K.",
        <Badge tone="neutral" key="t">3h left</Badge>,
        <Button key="a" onClick={() => { notify("Approval Detail loaded", "info"); router.push("/approval-detail"); }}>Open Review <ArrowRight size={14} aria-hidden="true" /></Button>
      ]
    },
    {
      id: "Q-1044",
      status: "Approved",
      row: [
        <strong key="q">Q-1044</strong>,
        "Nova Retail",
        <Badge tone="green" key="r">Standard</Badge>,
        "Auto Gating",
        <span className="mono" key="w">₹5,100</span>,
        "Liam P.",
        <Badge tone="green" key="t">Approved</Badge>,
        <Button key="a" onClick={() => notify("Small quote approved via automated rules", "success")}>OK</Button>
      ]
    }
  ];
  const shown = approvalFilter === "All" ? all : all.filter((r) => r.status === approvalFilter);

  return (
    <>
      <PageHead
        eyebrow="Governance & Risk Matrix"
        title="Discount & Concession Approvals"
        subtitle="Quotes exceeding rep discount limits requiring management and finance sign-off."
        actions={
          <>
            <div className="tabs">
              {["All", "Pending", "Returned", "Approved"].map((filter) => (
                <Button key={filter} tone={approvalFilter === filter ? "primary" : undefined} onClick={() => setApprovalFilter(filter)}>
                  {filter}
                </Button>
              ))}
            </div>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-3">
        <Metric title="Pending Sign-Off" value="₹117,800" detail="4 quotes awaiting review" tone="amber" icon={<Clock size={14} />} />
        <Metric title="Average SLA Response" value="3.4 hrs" detail="Target SLA: under 6.0 hrs" tone="green" icon={<CheckCircle2 size={14} />} />
        <Metric title="Primary Exception" value="Service Discount" detail="Setup Services > 10% Cap" tone="red" icon={<AlertTriangle size={14} />} />
      </div>
      <Card
        title={`${approvalFilter} Approvals Queue`}
        action={
          <Button tone="primary" onClick={approveQuote}>
            <Check size={15} aria-hidden="true" /> Approve All
          </Button>
        }
      >
        {!shown.length ? (
          <Empty
            icon={<Inbox size={32} aria-hidden="true" />}
            title={`No ${approvalFilter.toLowerCase()} approval requests`}
            hint="All items in this queue have been processed or resolved."
            action={<Button onClick={() => setApprovalFilter("All")}>Show All Requests</Button>}
          />
        ) : (
          <DataTable
            headers={["Quote ID", "Account Name", "Deal Category", "Required Approvers", "Contract Value", "Deal Owner", "SLA Status", "Actions"]}
            rows={shown.map((r) => r.row)}
          />
        )}
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
