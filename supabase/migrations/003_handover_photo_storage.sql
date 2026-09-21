-- ============================================================
-- Boss Rent Pererenan — Migration 003: Storage foto serah terima
-- Foto serah terima (motor + customer) tidak lagi disimpan sebagai
-- base64 di kolom transactions.handover_image_url. File disimpan di
-- bucket PRIVAT "handover-photos"; kolom hanya menyimpan referensi
-- pendek "storage://handover-photos/<path>". Admin melihat foto lewat
-- signed URL sementara. Aman dijalankan ulang (idempotent).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('handover-photos', 'handover-photos', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Hanya admin yang login yang bisa melihat/mengunggah/menghapus.
-- Publik (anon) tidak punya akses sama sekali (foto berisi wajah customer).
drop policy if exists "handover_photos_admin_select" on storage.objects;
create policy "handover_photos_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'handover-photos');

drop policy if exists "handover_photos_admin_insert" on storage.objects;
create policy "handover_photos_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'handover-photos');

drop policy if exists "handover_photos_admin_update" on storage.objects;
create policy "handover_photos_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'handover-photos')
  with check (bucket_id = 'handover-photos');

drop policy if exists "handover_photos_admin_delete" on storage.objects;
create policy "handover_photos_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'handover-photos');
