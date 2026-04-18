/** Column flags for upcoming bookings export (PDF + CSV) */
export type UpcomingListExportColumns = {
  code: boolean;
  client: boolean;
  phone: boolean;
  eventDate: boolean;
  slot: boolean;
  eventType: boolean;
  package: boolean;
  total: boolean;
  status: boolean;
};

export const UPCOMING_EXPORT_COLUMNS_DEFAULT: UpcomingListExportColumns = {
  code: true,
  client: true,
  phone: true,
  eventDate: true,
  slot: true,
  eventType: true,
  package: true,
  total: true,
  status: true,
};

export const UPCOMING_EXPORT_COLUMN_LABELS: { key: keyof UpcomingListExportColumns; label: string }[] = [
  { key: "code", label: "Booking code" },
  { key: "client", label: "Client (name · email)" },
  { key: "phone", label: "Phone" },
  { key: "eventDate", label: "Event date" },
  { key: "slot", label: "Time slot" },
  { key: "eventType", label: "Event type" },
  { key: "package", label: "Package" },
  { key: "total", label: "Total (£)" },
  { key: "status", label: "Status" },
];
