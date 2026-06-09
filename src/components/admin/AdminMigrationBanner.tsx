type AdminMigrationBannerProps = {
  migrationCode: string;
  feature: string;
  className?: string;
};

/** Shown when a Supabase migration has not been applied yet. */
export function AdminMigrationBanner({ migrationCode, feature, className }: AdminMigrationBannerProps) {
  return (
    <div className={className ?? "admin-pricing-migration-banner"} role="status">
      Run migration <code>{migrationCode}</code> in Supabase to enable {feature}.
    </div>
  );
}
