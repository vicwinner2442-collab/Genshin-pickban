-- Local migration prepared for the profile page. Apply when database changes are authorized.
-- Avatars use the existing character catalog; emails remain in auth.users.
alter table public.profiles
  add column if not exists avatar_character_slug text references public.characters(slug) on delete set null;
