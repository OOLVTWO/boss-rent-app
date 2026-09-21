/**
 * Foto serah terima (motor + customer) di Supabase Storage.
 *
 * Kolom transactions.handover_image_url sekarang menyimpan REFERENSI pendek:
 *   "storage://handover-photos/2026/09/<uuid>.jpg"
 * Data lama berupa base64 ("data:image/...") tetap didukung untuk ditampilkan
 * sampai dipindahkan lewat Pengaturan → Data & Backup.
 *
 * Bucket bersifat PRIVAT (berisi wajah customer). Browser admin yang login
 * mengakses lewat signed URL sementara.
 */
import { compressImageToBlob } from '@/lib/imageCompressor';

export const HANDOVER_BUCKET = 'handover-photos';
const REF_PREFIX = `storage://${HANDOVER_BUCKET}/`;

export const HANDOVER_COMPRESS = { maxWidth: 1280, maxHeight: 1280, quality: 0.8 };

export function isStorageRef(value) {
  return typeof value === 'string' && value.startsWith(REF_PREFIX);
}

export function isLegacyDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

export function refToPath(ref) {
  return isStorageRef(ref) ? ref.slice(REF_PREFIX.length) : null;
}

function newObjectPath(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${y}/${m}/${id}.jpg`;
}

/**
 * Kompres lalu unggah. `source` = File dari input ATAU data URL (migrasi foto lama).
 * @returns {Promise<string>} referensi "storage://handover-photos/..."
 */
export async function uploadHandoverPhoto(supabase, source) {
  const blob = await compressImageToBlob(source, HANDOVER_COMPRESS);
  const path = newObjectPath();
  const { error } = await supabase.storage
    .from(HANDOVER_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (error) throw new Error(`Gagal mengunggah foto: ${error.message}`);
  return `${REF_PREFIX}${path}`;
}

/** Ubah nilai kolom menjadi URL yang bisa dipakai di <img src>. */
export async function resolvePhotoSrc(supabase, value, expiresInSec = 3600) {
  if (!value) return null;
  if (!isStorageRef(value)) return value; // base64 lama / URL biasa
  const { data, error } = await supabase.storage
    .from(HANDOVER_BUCKET)
    .createSignedUrl(refToPath(value), expiresInSec);
  if (error) throw new Error(`Gagal memuat foto: ${error.message}`);
  return data?.signedUrl || null;
}

/**
 * Untuk dirender ke canvas (invoice visual): unduh sebagai data URL supaya
 * canvas tidak "tainted" oleh gambar lintas-origin.
 */
export async function resolvePhotoDataUrl(supabase, value) {
  if (!value) return null;
  if (!isStorageRef(value)) return value;
  const { data, error } = await supabase.storage.from(HANDOVER_BUCKET).download(refToPath(value));
  if (error || !data) throw new Error(`Gagal memuat foto: ${error?.message || 'tidak ditemukan'}`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca foto.'));
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(data);
  });
}

/** Hapus file di Storage (best-effort; nilai non-Storage diabaikan). */
export async function removeHandoverPhoto(supabase, value) {
  const path = refToPath(value);
  if (!path) return;
  const { error } = await supabase.storage.from(HANDOVER_BUCKET).remove([path]);
  if (error) console.warn('Gagal menghapus foto lama dari Storage:', error.message);
}
