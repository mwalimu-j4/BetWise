import { Bell, X } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationCount: number;
}

export function NotificationDialog({
  open,
  onOpenChange,
  notificationCount,
}: NotificationDialogProps) {
  const notifications = [
    {
      id: 1,
      title: "New Bet Matched",
      description: "Your bet on Team A has been matched at 1.50 odds",
      timestamp: "5 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "Withdrawal Approved",
      description: "Your withdrawal of KES 5,000 has been approved",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "Odds Updated",
      description: "Match odds for Barcelona vs Real Madrid have been updated",
      timestamp: "1 hour ago",
      read: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-admin-border bg-[rgba(10,14,26,0.98)] text-admin-text-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={20} className="text-admin-accent" />
            Notifications
            {notificationCount > 0 && (
              <span className="ml-auto flex items-center justify-center h-5 w-5 rounded-full bg-admin-red text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-admin-text-muted">
            {notificationCount === 0
              ? "You're all caught up!"
              : `You have ${notificationCount} new notifications`}
          </DialogDescription>
        </DialogHeader>

        {notificationCount > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition ${
                  notification.read
                    ? "border-admin-border/50 bg-white/1"
                    : "border-admin-accent/30 bg-admin-accent-dim"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        notification.read
                          ? "text-admin-text-primary"
                          : "text-admin-accent"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-admin-text-muted mt-1">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-admin-text-muted/60 mt-2">
                      {notification.timestamp}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-admin-accent shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Bell size={32} className="mx-auto mb-2 text-admin-text-muted/40" />
            <p className="text-sm text-admin-text-muted">
              No new notifications
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-admin-border">
          <Button
            variant="outline"
            className="flex-1 h-8 text-xs border-admin-border"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
