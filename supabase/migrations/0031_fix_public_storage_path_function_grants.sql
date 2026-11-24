-- Fix public image access: storage_public_select_approved policy (anon) calls
-- is_managed_attachment_path, but execute was revoked from anon in 0023.
-- The function is immutable and only validates path format; granting execute
-- to anon is safe and required for public signed URL generation.

grant execute on function public.is_managed_attachment_path(text) to anon;
