export type EnquiriesListExportColumns = {
  name: boolean;
  email: boolean;
  phone: boolean;
  functionType: boolean;
  eventDate: boolean;
  slot: boolean;
  hearAbout: boolean;
  message: boolean;
  status: boolean;
  notes: boolean;
  followUp: boolean;
  lastContact: boolean;
  created: boolean;
};

export const ENQUIRIES_EXPORT_COLUMNS_DEFAULT: EnquiriesListExportColumns = {
  name: true,
  email: true,
  phone: true,
  functionType: true,
  eventDate: true,
  slot: true,
  hearAbout: false,
  message: false,
  status: true,
  notes: false,
  followUp: false,
  lastContact: false,
  created: true,
};

export const ENQUIRIES_EXPORT_COLUMN_LABELS: { key: keyof EnquiriesListExportColumns; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "functionType", label: "Function type" },
  { key: "eventDate", label: "Event date" },
  { key: "slot", label: "Time slot" },
  { key: "hearAbout", label: "Hear about" },
  { key: "message", label: "Message" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
  { key: "followUp", label: "Follow-up notes" },
  { key: "lastContact", label: "Last contact" },
  { key: "created", label: "Created" },
];
