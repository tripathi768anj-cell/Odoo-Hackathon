"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button, Metric, PageHead, PrototypeBadge, ToastStack, useToast } from "../../components/ui";
import { downloadCsv } from "../../lib/csv";
import { INITIAL_LINES, LineItem, QuoteStage, money } from "../../lib/demo-types";

export default function ReportsPage() {
  const router = useRouter();
  const { toast, kind, notify, dismiss } = useToast();

  const [quoteStage] = useState<QuoteStage>("Draft");
  const [lines] = useState<LineItem[]>(INITIAL_LINES);

  const totals = useMemo(() => {
    const gross = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const net = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
    const concession = gross - net;
    return { gross, net, concession, blended: gross ? (concession / gross) * 100 : 0 };
  }, [lines]);

  return (
    <>
      <PageHead
        eyebrow="Executive Analytics"
        title="Revenue & Performance Reports"
        subtitle="Key metrics on quote-to-cash turnaround, approval SLA velocity, and product performance."
        actions={
          <>
            <Button
              onClick={async () => {
                const { downloadReportPdf } = await import("../../lib/pdf");
                downloadReportPdf({
                  period: "August 2026",
                  kpis: [["Quotes generated", "26"], ["Avg approval SLA", "3.4 hrs"], ["Top volume driver", "Laptop Pro 14 (₹72,400)"], ["Escalations in governance", "3"]],
                  pipeline: [["Q-1042", "Acme Corp", money(totals.net)], ["Q-1039", "Beta Industries", "₹18,200"], ["Q-1035", "Nova Retail", "₹54,200"]]
                });
                notify("Executive PDF report compiled", "success");
              }}
            >
              <Download size={15} /> Export PDF
            </Button>
            <Button
              onClick={() => {
                downloadCsv(
                  "dealflow-report.csv",
                  ["Quote Reference", "Customer Account", "Stage Status", "Total Value"],
                  [
                    ["Q-1042", "Acme Corp", quoteStage, totals.net],
                    ["Q-1039", "Beta Industries", "Negotiation", 18200],
                    ["Q-1035", "Nova Retail", "Confirmed", 54200]
                  ]
                );
                notify("CSV dataset downloaded", "success");
              }}
            >
              <FileSpreadsheet size={15} /> Export Sheet
            </Button>
            <PrototypeBadge />
          </>
        }
      />
      <div className="grid grid-4">
        <Metric title="Quotes Generated" value="26 Quotes" detail="Current fiscal month" tone="blue" trend="+18% MoM" onClick={() => { notify("Quotations loaded", "info"); router.push("/quotations"); }} />
        <Metric title="Avg Approval SLA" value="3.4 Hours" detail="Down 12% from last month" tone="green" trend="Target < 6h" onClick={() => { notify("Approvals loaded", "info"); router.push("/approvals"); }} />
        <Metric title="Top Volume Driver" value="Laptop Pro 14" detail="₹72,400 active pipeline" tone="steel" onClick={() => { notify("Products loaded", "info"); router.push("/products"); }} />
        <Metric title="Escalation Count" value="3 Flagged" detail="Currently in governance" tone="red" onClick={() => { notify("Deal Health loaded", "info"); router.push("/deal-health"); }} />
      </div>
      <ToastStack toast={toast} kind={kind} onDismiss={dismiss} />
    </>
  );
}
