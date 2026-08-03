import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Kunci timezone ke WITA (UTC+8) agar test helper tanggal deterministik
    // di mesin / CI mana pun — bisnis berjalan di Bali.
    env: { TZ: 'Asia/Makassar' },
  },
});
