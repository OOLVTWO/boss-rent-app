/**
 * AI Diagnostic & Predictive Maintenance Engine
 * Boss Rent Pererenan
 */

export function analyzeVehicleHealth(vehicle, transactions = []) {
  const currentKm = Number(vehicle.current_km) || 15000;
  const lastServiceKm = Number(vehicle.last_service_km) || 0;
  const lastServicedAt = vehicle.last_serviced_at ? new Date(vehicle.last_serviced_at) : null;

  const vehicleTx = transactions.filter(t => t.vehicle_id === vehicle.id);

  // Filter issues: ONLY count issues reported AFTER last_serviced_at (unresolved issues)
  const unresolvedIssuesTx = vehicleTx.filter(t => {
    if (!t.issues_reported || !t.issues_reported.trim()) return false;
    if (!lastServicedAt) return true; // if never serviced, all issues count
    const txDate = new Date(t.updated_at || t.created_at);
    return txDate > lastServicedAt; // only issues reported AFTER last service
  });

  const recentIssues = unresolvedIssuesTx.map(t => t.issues_reported);

  // Calculate total rental KM from completed transactions
  const totalRentalKm = vehicleTx.reduce((sum, t) => {
    const kmStart = Number(t.km_start) || 0;
    const kmEnd = Number(t.km_end) || 0;
    return sum + (kmEnd > kmStart ? kmEnd - kmStart : 0);
  }, 0);

  // Service intervals (standard scooter maintenance in Indonesia)
  const oilInterval = 2000; // Oli mesin per 2.000 KM
  const cvtInterval = 6000; // Servis CVT & Roller per 6.000 KM

  // Calculate KM driven since last service
  const kmDrivenSinceService = lastServiceKm > 0 ? Math.max(0, currentKm - lastServiceKm) : (currentKm % oilInterval);
  const kmToNextOil = Math.max(0, oilInterval - (kmDrivenSinceService % oilInterval));
  const kmToNextCvt = Math.max(0, cvtInterval - (kmDrivenSinceService % cvtInterval));

  let healthScore = 100;
  const warnings = [];
  const recommendations = [];

  // 1. Analyze UNRESOLVED reported issues (Keywords matching for AI diagnosis)
  const allIssuesText = recentIssues.join(' ').toLowerCase();

  if (allIssuesText.includes('rem') || allIssuesText.includes('blong') || allIssuesText.includes('bunyi')) {
    healthScore -= 25;
    warnings.push('⚠️ Terdeteksi keluhan pada sistem pengereman.');
    recommendations.push('Periksa ketebalan kampas rem depan/belakang & minyak rem.');
  }

  if (allIssuesText.includes('mesin') || allIssuesText.includes('kasar') || allIssuesText.includes('panas') || allIssuesText.includes('mogok')) {
    healthScore -= 30;
    warnings.push('🚨 Terdeteksi keluhan pada performa mesin.');
    recommendations.push('Segera ganti oli mesin, cek busi, dan periksa pasokan bahan bakar.');
  }

  if (allIssuesText.includes('cvt') || allIssuesText.includes('gredek') || allIssuesText.includes('tarikan') || allIssuesText.includes('vbelt')) {
    healthScore -= 20;
    warnings.push('⚠️ Terdeteksi getaran (gredek) pada transmisi CVT.');
    recommendations.push('Bersihkan mangkok CVT, periksa roller & v-belt.');
  }

  if (allIssuesText.includes('ban') || allIssuesText.includes('bocor') || allIssuesText.includes('goyang')) {
    healthScore -= 15;
    warnings.push('⚠️ Keluhan kestabilan / kondisi ban.');
    recommendations.push('Cek tekanan angin ban & ketebalan alur ban.');
  }

  // 2. Mileage-based health deductions (based on KM driven since last service)
  if (kmToNextOil <= 300) {
    healthScore -= 15;
    warnings.push(`🛢️ Mendekati jadwal ganti oli mesin (tersisa ~${kmToNextOil} KM).`);
    recommendations.push('Jadwalkan penggantian oli mesin (MPX/Yamalube).');
  }

  if (kmToNextCvt <= 500) {
    healthScore -= 10;
    warnings.push(`⚙️ Mendekati jadwal servis CVT berkala (tersisa ~${kmToNextCvt} KM).`);
    recommendations.push('Jadwalkan pembersihan & pemeriksaan CVT.');
  }

  // 3. Status based health adjustments
  if (vehicle.status === 'maintenance') {
    healthScore = Math.min(healthScore, 45);
    warnings.push('🔧 Motor sedang dalam status perawatan di bengkel.');
  }

  // Bound score 10 - 100
  healthScore = Math.max(10, Math.min(100, healthScore));

  let statusLevel = 'Sehat';
  let badgeColor = 'var(--accent-green)';
  if (healthScore < 60) {
    statusLevel = 'Perlu Servis Urgent';
    badgeColor = 'var(--accent-red)';
  } else if (healthScore < 85) {
    statusLevel = 'Perlu Cek Berkala';
    badgeColor = 'var(--accent-amber)';
  }

  return {
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    plateNumber: vehicle.plate_number,
    currentKm,
    totalRentalKm,
    lastServiceKm,
    lastServicedAt,
    healthScore,
    statusLevel,
    badgeColor,
    warnings,
    recommendations: recommendations.length > 0 ? recommendations : ['Motor dalam kondisi prima 100%. Servis & perbaikan telah diselesaikan.'],
    kmToNextOil,
    kmToNextCvt,
    recentIssues // only unresolved issues after last service!
  };
}
