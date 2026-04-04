import { Bell } from "lucide-react";

type NotificationButtonProps = {
  count: number;
};

export default function NotificationButton({ count }: NotificationButtonProps) {
  return (
    <button
      aria-label="Notifications"
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-admin-border bg-admin-surface/50 text-admin-text-secondary transition hover:bg-admin-hover hover:text-admin-text-primary"
      type="button"
    >
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-admin-accent text-[8px] font-bold text-accent-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}
