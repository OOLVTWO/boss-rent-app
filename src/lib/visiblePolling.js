/**
 * Polling yang hanya berjalan saat tab browser TERLIHAT.
 *
 * Sebelumnya beberapa halaman memanggil Supabase setiap 60 detik tanpa henti,
 * termasuk saat tab dibiarkan terbuka di latar belakang semalaman — setiap
 * panggilan menghabiskan kuota egress. Sekarang polling berhenti saat tab
 * disembunyikan dan langsung menyegarkan data sekali saat tab dibuka lagi.
 *
 * @returns {() => void} fungsi untuk menghentikan polling (pakai di cleanup useEffect)
 */
export function startVisiblePolling(callback, intervalMs = 60000) {
  if (typeof document === 'undefined') return () => {};
  let timer = null;

  const start = () => {
    if (timer === null) timer = setInterval(callback, intervalMs);
  };
  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      callback();
      start();
    } else {
      stop();
    }
  };

  if (document.visibilityState === 'visible') start();
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
