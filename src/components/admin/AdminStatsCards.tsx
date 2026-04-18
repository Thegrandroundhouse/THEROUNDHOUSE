"use client";

export type AdminStatItem = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  variant?: "default" | "gold" | "accent" | "ok";
};

export function AdminStatsCards({ items, ariaLabel = "Summary" }: { items: AdminStatItem[]; ariaLabel?: string }) {
  return (
    <section className="admin-stats-unified" aria-label={ariaLabel}>
      {items.map((item, i) => (
        <article
          key={i}
          className={
            "admin-stats-unified-card" +
            (item.variant === "gold"
              ? " admin-stats-unified-card--gold"
              : item.variant === "accent"
                ? " admin-stats-unified-card--accent"
                : item.variant === "ok"
                  ? " admin-stats-unified-card--ok"
                  : "")
          }
        >
          <span className="admin-stats-unified-label">{item.label}</span>
          <strong className="admin-stats-unified-value">{item.value}</strong>
          {item.hint ? <span className="admin-stats-unified-hint">{item.hint}</span> : null}
        </article>
      ))}
    </section>
  );
}
