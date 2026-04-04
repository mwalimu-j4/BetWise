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
    <div className="space-y-6">
      <AdminSectionHeader
        title="Platform Settings"
        subtitle="System configuration and admin preferences"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {settingsGroups.map((section) => (
          <AdminCard key={section.title}>
            <AdminCardHeader title={section.title} />
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-admin-border py-2 last:border-b-0"
                  key={item}
                >
                  <span className="text-sm text-admin-text-secondary">
                    {item}
                  </span>
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


