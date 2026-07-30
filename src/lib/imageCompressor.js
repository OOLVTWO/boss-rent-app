/**
 * Mengompresi dan meresize file gambar dari storage lokal perangkat
 * @param {File} file - Berkas gambar
 * @param {number} maxWidth - Ukuran lebar maksimum dalam piksel
 * @param {number} quality - Kualitas kompresi JPEG (0.1 - 1.0)
 * @returns {Promise<string>} Base64 Data URL gambar yang terkompresi
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File harus berupa gambar (JPG, PNG, WEBP).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar dari perangkat.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat dibaca.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
