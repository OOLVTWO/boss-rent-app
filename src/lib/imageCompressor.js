/**
 * Kompresi & resize gambar di browser (canvas → JPEG).
 *
 * Mendukung dua gaya pemanggilan:
 *   compressImage(file, 800, 0.7)                                  // lama
 *   compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 })
 *
 * CATATAN BUG LAMA: sebelumnya fungsi hanya menerima angka, sementara
 * halaman Transaksi & Customer memanggilnya dengan objek. `lebar > {objek}`
 * selalu false → foto TIDAK pernah di-resize dan tersimpan resolusi penuh
 * kamera (3–4 MB per foto). Sekarang objek opsi didukung dengan benar.
 */

function normalizeOptions(maxWidthOrOpts, quality) {
  if (maxWidthOrOpts && typeof maxWidthOrOpts === 'object') {
    const maxWidth = Number(maxWidthOrOpts.maxWidth) || 800;
    return {
      maxWidth,
      maxHeight: Number(maxWidthOrOpts.maxHeight) || maxWidth,
      quality: Number(maxWidthOrOpts.quality) || 0.7,
    };
  }
  // Gaya lama: hanya membatasi lebar (perilaku halaman Data Motor tidak berubah).
  return {
    maxWidth: Number(maxWidthOrOpts) || 800,
    maxHeight: Infinity,
    quality: Number(quality) || 0.7,
  };
}

/** Hitung dimensi baru dengan menjaga rasio, dibatasi maxWidth & maxHeight. */
export function fitDimensions(width, height, maxWidth, maxHeight = Infinity) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat.'));
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Format gambar tidak dapat dibaca.'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

async function drawToCanvas(source, opts) {
  let src = source;
  if (typeof source !== 'string') {
    if (!source || !source.type || !source.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar (JPG, PNG, WEBP).');
    }
    src = await readFileAsDataUrl(source);
  }
  const img = await loadImage(src);
  const { width, height } = fitDimensions(img.width, img.height, opts.maxWidth, opts.maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/** Hasil: Base64 Data URL (JPEG). Dipakai halaman Data Motor (foto katalog). */
export async function compressImage(file, maxWidthOrOpts = 800, quality = 0.7) {
  const opts = normalizeOptions(maxWidthOrOpts, quality);
  const canvas = await drawToCanvas(file, opts);
  return canvas.toDataURL('image/jpeg', opts.quality);
}

/**
 * Hasil: Blob JPEG siap diunggah ke Supabase Storage.
 * `source` boleh File dari input kamera/galeri ATAU data URL (untuk migrasi foto lama).
 */
export async function compressImageToBlob(source, maxWidthOrOpts = { maxWidth: 1280, maxHeight: 1280, quality: 0.8 }) {
  const opts = normalizeOptions(maxWidthOrOpts);
  const canvas = await drawToCanvas(source, opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal mengompres gambar.'))),
      'image/jpeg',
      opts.quality
    );
  });
}
