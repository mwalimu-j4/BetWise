import { useState } from "react";
import { Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reports } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  adminToneTextClass,
} from "../../components/ui";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<
    (typeof reports)[0] | null
  >(null);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Reports & Analytics"
        subtitle="Financial, operational, and compliance reports"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <AdminCard className="space-y-4" interactive key={report.title}>
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${adminToneTextClass(
                    report.tone,
                  )}`}
                  style={{ backgroundColor: `var(--admin-${report.tone}-dim)` }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-admin-text-primary">
                    {report.title}
                  </p>
                  <p className="mt-1 text-xs text-admin-text-muted">
                    {report.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11px] text-admin-text-muted">
                  Last: {report.lastGenerated}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye size={11} />
                        View
                      </AdminButton>
                    </DialogTrigger>
                    <DialogContent className="border-admin-border bg-admin-card max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{report.title}</DialogTitle>
                        <DialogDescription>
                          {report.description}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedReport && (
                        <ScrollArea className="h-[400px] w-full pr-4">
                          <div className="space-y-6">
                            <div>
                              <p className="text-xs font-semibold text-admin-text-muted uppercase">
                                Report Summary
                              </p>
                              <p className="mt-2 text-sm text-admin-text-primary">
                                {selectedReport.description}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-admin-text-muted">
                                  Last Generated
                                </p>
                                <p className="mt-1 font-semibold text-admin-text-primary">
                                  {selectedReport.lastGenerated}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-admin-text-muted">
                                  Frequency
                                </p>
                                <p className="mt-1 font-semibold text-admin-text-primary">
                                  Daily
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-admin-text-muted uppercase">
                                Key Metrics
                              </p>
                              <div className="mt-2 space-y-2 text-sm text-admin-text-primary">
                                <p>• Total Records: 1,250+</p>
                                <p>• Data Points: 15+</p>
                                <p>• Coverage: Complete</p>
                                <p>• Format: PDF, CSV, JSON</p>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      )}
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1">
                          Close
                        </Button>
                        <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                          Export PDF
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <AdminButton size="sm" variant="ghost">
                        <Download size={11} />
                      </AdminButton>
                    </DialogTrigger>
                    <DialogContent className="border-admin-border bg-admin-card">
                      <DialogHeader>
                        <DialogTitle>Download Report</DialogTitle>
                        <DialogDescription>
                          Choose format and download {report.title}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <button className="w-full border border-admin-border rounded-lg p-3 text-left text-sm hover:bg-admin-surface transition">
                          📄 PDF Report
                        </button>
                        <button className="w-full border border-admin-border rounded-lg p-3 text-left text-sm hover:bg-admin-surface transition">
                          📊 CSV Export
                        </button>
                        <button className="w-full border border-admin-border rounded-lg p-3 text-left text-sm hover:bg-admin-surface transition">
                          ⚙️ JSON Data
                        </button>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                        <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                          Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
