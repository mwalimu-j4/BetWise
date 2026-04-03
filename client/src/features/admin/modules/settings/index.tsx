import { Edit } from "lucide-react";
import { settingsGroups } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
} from "../../components/ui";

export default function Settings() {
  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Platform Settings"
        subtitle="System configuration and admin preferences"
      />

      <div className="admin-grid admin-grid--double">
        {settingsGroups.map((section) => (
          <AdminCard key={section.title}>
            <AdminCardHeader title={section.title} />
            <div className="admin-setting-list">
              {section.items.map((item) => (
                <div className="admin-setting-row" key={item}>
                  <span className="admin-text-secondary">{item}</span>
                  <AdminButton size="sm" variant="ghost">
                    <Edit size={10} />
                    Edit
                  </AdminButton>
                </div>
              ))}
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
