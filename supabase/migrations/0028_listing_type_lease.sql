-- Allow lease as a first-class public listing type.

alter table public.listings
  drop constraint if exists listings_type_check;

alter table public.listings
  add constraint listings_type_check
  check (listing_type = any (array['rent'::text, 'sale'::text, 'lease'::text]));
