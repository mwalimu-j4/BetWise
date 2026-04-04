import { useState } from "react";
import { Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { settingsGroups } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
} from "../../components/ui";

export default function Settings() {
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [settingValue, setSettingValue] = useState("");
  const [settingEnabled, setSettingEnabled] = useState(false);

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
                  <Dialog>
                    <DialogTrigger asChild>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedSetting(item);
                          setSettingValue("");
                          setSettingEnabled(false);
                        }}
                      >
                        <Edit size={10} />
                        Edit
                      </AdminButton>
                    </DialogTrigger>
                    <DialogContent className="border-admin-border bg-admin-card">
                      <DialogHeader>
                        <DialogTitle>Edit Setting</DialogTitle>
                        <DialogDescription>
                          Update {selectedSetting}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {selectedSetting?.includes("Max") ||
                        selectedSetting?.includes("Min") ||
                        selectedSetting?.includes("Fee") ? (
                          <div>
                            <label className="text-sm font-semibold text-admin-text-primary">
                              Value
                            </label>
                            <Input
                              type="number"
                              value={settingValue}
                              onChange={(e) => setSettingValue(e.target.value)}
                              placeholder="Enter value"
                              className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-admin-text-primary">
                              Enabled
                            </label>
                            <Switch
                              checked={settingEnabled}
                              onCheckedChange={setSettingEnabled}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                        <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                          Save
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
