"use client";

import { useRouter } from "next/navigation";
import { Clock, Percent, Send, Warehouse } from "lucide-react";
import { Button, Card, DataTable, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";

export default function DealHealthPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const goCustomerPortal = () => { notify("Customer loaded", "info"); router.push("/customer-portal"); };
  const goApprovalDetail = () => { notify("Approval Detail loaded", "info"); router.push("/approval-detail"); };
  const goFulfillmentDetail = () => { notify("Fulfillment Detail loaded", "info"); router.push("/fulfillment-detail"); };

  return (
    <>
      <PageHead
        eyebrow="AI Risk Radar"
        title="Deal Health & Anomaly Detector"
        subtitle="Automated detection of stalled negotiations, excessive margin concessions, and stock bottlenecks."
        actions={
          <>
            <Button tone="primary" onClick={() => notify("Account notifications dispatched to sales reps", "success")}><Send size={15} /> Ping Reps</Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-3">
        <Metric title="Stalled / Gone Quiet" value="3 Deals" detail="No interaction > 14 days" tone="red" icon={<Clock size={14} />} onClick={goCustomerPortal} />
        <Metric title="Margin Erosion Risk" value="2 Deals" detail="Concessions > 15% limit" tone="amber" icon={<Percent size={14} />} onClick={goApprovalDetail} />
        <Metric title="Inventory Bottlenecks" value="1 Item" detail="Requires split dispatch" tone="blue" icon={<Warehouse size={14} />} onClick={goFulfillmentDetail} />
      </div>
      <Card title="Prioritized Anomaly Worklist">
        <DataTable
          headers={["Deal Identifier", "Detected Risk Factor", "Sales Rep", "Remediation Action"]}
          rows={[
            ["Q-1042", "Concession over cap on Services (16%)", "M. Shah", <Button key="a" tone="primary" onClick={goApprovalDetail}>Resolve Gating</Button>],
            ["Q-1039", "No customer engagement in 14 days", "D. Kumar", <Button key="a" onClick={goCustomerPortal}>Open Portal</Button>],
            ["ORD-8021", "Docking Station shortage in primary warehouse", "East Depot", <Button key="a" onClick={goFulfillmentDetail}>Execute Split</Button>]
          ]}
        />
      </Card>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
