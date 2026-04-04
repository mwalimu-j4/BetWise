import { Download, Eye } from "lucide-react";
import { reports } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  adminToneTextClass,
} from "../../components/ui";

export default function Reports() {
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
            <AdminCard
              className="space-y-4"
              interactive
              key={report.title}
            >
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
                  <AdminButton size="sm" variant="ghost">
                    <Eye size={11} />
                    View
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost">
                    <Download size={11} />
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}


