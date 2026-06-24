export type EnquiryStatus = "new" | "contacted" | "quoted" | "converted" | "lost";

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  function_type: string | null;
  hear_about: string | null;
  message: string | null;
  event_date?: string | null;
  event_slot_key?: string | null;
  guest_count?: number | null;
  status: EnquiryStatus;
  notes: string | null;
  follow_up_notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  booking_code: string | null;
  enquiry_id: string | null;
  client_name: string | null;
  client_email: string;
  client_phone: string | null;
  client_address: string | null;
  event_date: string;
  /** Time slot key, or null = full-venue / whole day */
  event_slot_key?: string | null;
  event_type: string | null;
  package_name: string | null;
  package_id: string | null;
  status: BookingStatus;
  total_cents: number | null;
  deposit_cents: number | null;
  balance_cents: number | null;
  special_requirements: string | null;
  notes: string | null;
  extras: string | null;
  created_at: string;
  updated_at: string;
}
