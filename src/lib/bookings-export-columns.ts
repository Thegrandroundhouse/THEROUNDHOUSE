/** Shared column flags for bookings list PDF + CSV export */
export type BookingsListExportColumns = {
  code: boolean;
  client: boolean;
  phone: boolean;
  eventDate: boolean;
  eventType: boolean;
  package: boolean;
  total: boolean;
  deposit: boolean;
  status: boolean;
};

export const BOOKINGS_EXPORT_COLUMNS_DEFAULT: BookingsListExportColumns = {
  code: true,
  client: true,
  phone: true,
  eventDate: true,
  eventType: true,
  package: true,
  total: true,
  deposit: true,
  status: true,
};

export const BOOKINGS_EXPORT_COLUMN_LABELS: { key: keyof BookingsListExportColumns; label: string }[] = [
  { key: "code", label: "Booking code" },
  { key: "client", label: "Client (name, email)" },
  { key: "phone", label: "Phone" },
  { key: "eventDate", label: "Event date" },
  { key: "eventType", label: "Event type" },
  { key: "package", label: "Package" },
  { key: "total", label: "Total" },
  { key: "deposit", label: "Deposit" },
  { key: "status", label: "Status" },
];
