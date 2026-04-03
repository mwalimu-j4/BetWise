import { Edit, Eye, Plus, XCircle } from "lucide-react";
import { eventFilters, events } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  adminFilterRowClassName,
} from "../../components/ui";

export default function Events() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Events & Sports"
        subtitle="Manage live and upcoming events"
        actions={
          <AdminButton>
            <Plus size={13} />
            Add Event
          </AdminButton>
        }
      />

      <div className={adminFilterRowClassName}>
        {eventFilters.map((filter) => (
          <AdminButton
            key={filter}
            variant={filter === "All" ? "solid" : "ghost"}
          >
            {filter}
          </AdminButton>
        ))}
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <AdminCard
            className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            key={event.id}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {event.status === "live" ? (
                <span className="animate-admin-pulse h-2 w-2 shrink-0 rounded-full bg-admin-live shadow-[0_0_6px_var(--admin-live)]" />
              ) : null}
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={event.status} />
                  <span className="text-[11px] text-admin-text-muted">
                    {event.league}
                  </span>
                  <span className="text-[11px] text-admin-text-muted">-</span>
                  <span className="text-[11px] text-admin-text-muted">
                    {event.date}
                  </span>
                </div>
                <p className="text-base font-semibold text-admin-text-primary">
                  {event.home} <span className="text-admin-text-muted">vs</span>{" "}
                  {event.away}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[276px]">
              <div>
                <p className="text-xl font-bold text-admin-blue">
                  {event.markets}
                </p>
                <p className="text-[11px] text-admin-text-muted">Markets</p>
              </div>
              <div>
                <p className="text-xl font-bold text-admin-gold">
                  {event.totalBets.toLocaleString()}
                </p>
                <p className="text-[11px] text-admin-text-muted">Bets</p>
              </div>
              <div>
                <p className="text-xl font-bold text-admin-red">
                  {event.exposure}
                </p>
                <p className="text-[11px] text-admin-text-muted">Exposure</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <AdminButton size="sm" variant="ghost">
                <Eye size={13} />
              </AdminButton>
              <AdminButton size="sm" variant="ghost">
                <Edit size={13} />
              </AdminButton>
              <AdminButton size="sm" variant="ghost">
                <XCircle size={13} />
              </AdminButton>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
