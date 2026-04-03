import { Download, Eye } from "lucide-react";
import { reports } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
} from "../../components/ui";

export default function Reports() {
  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Reports & Analytics"
        subtitle="Financial, operational, and compliance reports"
      />

      <div className="admin-grid admin-grid--reports">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <AdminCard className="admin-report-card" interactive key={report.title}>
              <div className="admin-report-card__header">
                <div className="admin-card__icon" data-tone={report.tone}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="admin-report-card__title">{report.title}</p>
                  <p className="admin-report-card__description">
                    {report.description}
                  </p>
                </div>
              </div>
              <div className="admin-report-card__footer">
                <span className="admin-text-muted admin-text-xs">
                  Last: {report.lastGenerated}
                </span>
                <div className="admin-inline-group admin-inline-group--tight">
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
