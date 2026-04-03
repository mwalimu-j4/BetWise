import { Edit, Eye, Plus, XCircle } from "lucide-react";
import { eventFilters, events } from "../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
} from "../components/ui";

export default function EventsPage() {
  return (
    <div className="admin-panel">
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

      <div className="admin-filter-row">
        {eventFilters.map((filter) => (
          <AdminButton
            key={filter}
            variant={filter === "All" ? "solid" : "ghost"}
          >
            {filter}
          </AdminButton>
        ))}
      </div>

      <div className="admin-event-list">
        {events.map((event) => (
          <AdminCard className="admin-event-card" key={event.id}>
            <div className="admin-event-card__primary">
              {event.status === "live" ? <span className="admin-live-dot" /> : null}
              <div>
                <div className="admin-event-card__meta">
                  <StatusBadge status={event.status} />
                  <span className="admin-text-muted admin-text-xs">
                    {event.league}
                  </span>
                  <span className="admin-text-muted admin-text-xs">-</span>
                  <span className="admin-text-muted admin-text-xs">
                    {event.date}
                  </span>
                </div>
                <p className="admin-event-card__title">
                  {event.home} <span className="admin-text-muted">vs</span>{" "}
                  {event.away}
                </p>
              </div>
            </div>

            <div className="admin-event-card__stats">
              <div>
                <p className="admin-event-card__value admin-text-blue">
                  {event.markets}
                </p>
                <p className="admin-event-card__label">Markets</p>
              </div>
              <div>
                <p className="admin-event-card__value admin-text-gold">
                  {event.totalBets.toLocaleString()}
                </p>
                <p className="admin-event-card__label">Bets</p>
              </div>
              <div>
                <p className="admin-event-card__value admin-text-red">
                  {event.exposure}
                </p>
                <p className="admin-event-card__label">Exposure</p>
              </div>
            </div>

            <div className="admin-inline-group admin-inline-group--tight">
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
