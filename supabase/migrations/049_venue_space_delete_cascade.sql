-- Allow deleting a hall: drop booking ↔ hall links automatically (bookings are kept).

ALTER TABLE public.booking_spaces
  DROP CONSTRAINT IF EXISTS booking_spaces_space_id_fkey;

ALTER TABLE public.booking_spaces
  ADD CONSTRAINT booking_spaces_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES public.venue_spaces(id) ON DELETE CASCADE;
