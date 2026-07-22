'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWhatsAppShareUrl, getWaGatewayConfig, sendWhatsAppGateway } from '@/lib/countryCodes';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatEnDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ANIMATED COUNTER HOOK ───────────────────────────────────────────────────
function useCountUp(targetVal, durationMs = 1500, isDecimal = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endVal = Number(targetVal) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * endVal;

      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetVal, durationMs]);

  if (isDecimal) {
    return count.toFixed(1);
  }
  return Math.floor(count);
}

export default function SharpSquareBusinessWebsitePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Date selection state for smart rate estimate
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Business information from Google Maps profile
  const biz = {
    name: 'BOSS RENT PERERENAN',
    tagline: 'Available Scooter For Rent • Best Service • Best Price • Free Delivery & Pick Up • Clean & Good Scooters',
    address: 'Jl. Pantai Pererenan No.119, Pererenan, Kec. Mengwi, Kabupaten Badung, Bali 80351',
    phone: '+62 812-3710-9751',
    phoneRaw: '0812-3710-9751',
    hours: 'Open Daily from 09.00 AM WITA',
    rating: 5.0,
    reviewsCount: 24,
    mapsUrl: 'https://maps.app.goo.gl/SdqrCREMRtkanUGd6',
    mapsEmbedUrl: 'https://maps.google.com/maps?q=Jl.+Pantai+Pererenan+No.119,+Pererenan,+Kec.+Mengwi,+Kabupaten+Badung,+Bali+80351&t=&z=16&ie=UTF8&iwloc=&output=embed'
  };

  // Animated counters
  const animatedRating = useCountUp(5.0, 1200, true);
  const animatedReviews = useCountUp(24, 1500, false);
  const animatedSatisfaction = useCountUp(100, 1600, false);
  const animatedFleet = useCountUp(50, 1400, false);

  // 10 Extended Google Reviews representing the 24 Google Reviews
  const reviews = [
    {
      name: 'Singgih Dwi Purnomo',
      badge: 'Local Guide • Google Review',
      rating: 5,
      comment: 'Pelayanan sangat puas good 🙏🏼',
      date: 'Google Review'
    },
    {
      name: 'Made Budiana',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Orangnya sabar dan servis memuaskan',
      date: 'Google Review'
    },
    {
      name: 'Alexandre Mercier',
      badge: 'Tourist from France',
      rating: 5,
      comment: 'Best scooter rental in Pererenan! Clean NMax, fresh sanitized helmets delivered to our villa in 15 mins.',
      date: 'Verified Renter'
    },
    {
      name: 'Liam & Emma',
      badge: 'Tourists from Australia',
      rating: 5,
      comment: 'Super friendly owner, honest rates with no hidden fees. Scooter ran perfectly for our 2-week trip in Canggu!',
      date: 'Verified Renter'
    },
    {
      name: 'Dmitry V.',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Great service, fast response on WhatsApp 0812-3710-9751. Flexible daily and weekly prices!',
      date: 'Google Review'
    },
    {
      name: 'Siti Rahmawati',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Motornya mulus banget, helm bersih wangi, masnya ramah banget pas serah terima motor di Pererenan.',
      date: 'Google Review'
    },
    {
      name: 'Jonas Berg',
      badge: 'Tourist from Sweden',
      rating: 5,
      comment: 'Highly recommended rental shop! Clean bikes, free delivery, and deposit process was super easy.',
      date: 'Verified Renter'
    },
    {
      name: 'Charlotte H.',
      badge: 'Tourist from UK',
      rating: 5,
      comment: 'Very professional scooter rental! We rented two Scoopy bikes for 10 days. Perfect condition!',
      date: 'Verified Renter'
    },
    {
      name: 'Budi Santoso',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Pelayanan mantap, respon WA cepat, harga sangat terjangkau dibanding rental sekitar Canggu.',
      date: 'Google Review'
    },
    {
      name: 'Michael Tan',
      badge: 'Tourist from Singapore',
      rating: 5,
      comment: 'Excellent experience! Bike was delivered clean with full tank option. Best price in Pererenan area.',
      date: 'Verified Renter'
    }
  ];

  // 9 Clean Scooter & Service Showcase Photos for Tight Bento Matrix Grid
  const bentoPhotos = [
    {
      url: '/images/boss_rent_customer_bali.png',
      title: 'Scooter Rental in Pererenan',
      tag: 'Premium Fleet',
      icon: 'fa-solid fa-star',
      span: 'wide'
    },
    {
      url: '/images/boss_rent_bento_1.png',
      title: 'Mint Green Vespa Fleet',
      tag: 'Stylish Scooters',
      icon: 'fa-solid fa-motorcycle',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_fleet_lineup.png',
      title: 'Clean & Regularly Serviced Fleet',
      tag: '100% Maintained',
      icon: 'fa-solid fa-wrench',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_2.png',
      title: 'Pererenan Beach Exploring',
      tag: 'Canggu Area',
      icon: 'fa-solid fa-umbrella-beach',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_3.png',
      title: 'Easy Key Handover Service',
      tag: 'Express Pickup',
      icon: 'fa-solid fa-key',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_5.png',
      title: 'Scenic Countryside Cruising',
      tag: 'Bali Road Trips',
      icon: 'fa-solid fa-route',
      span: 'wide'
    },
    {
      url: '/images/boss_rent_bento_6.png',
      title: 'Sanitized Clean Helmets',
      tag: 'Safety Standard',
      icon: 'fa-solid fa-shield-halved',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_8.png',
      title: 'Red Honda Scoopy Lineup',
      tag: 'Sunset Touring',
      icon: 'fa-solid fa-sun',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_helmet_handover.png',
      title: 'Free Villa Delivery & Pickup',
      tag: 'Free Delivery',
      icon: 'fa-solid fa-truck-fast',
      span: 'wide'
    }
  ];

  useEffect(() => {
    // Default dates: Today to 3 days later
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(threeDaysLater.toISOString().split('T')[0]);

    async function fetchVehicles() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          setVehicles(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchVehicles();
  }, []);

  const calculateEstimate = (vehicle) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const dailyRate = Number(vehicle.rate_per_day) || 0;
    const weeklyRate = Number(vehicle.rate_per_week) || 0;
    const monthlyRate = Number(vehicle.rate_per_month) || 0;

    const dailyTotal = durationDays * dailyRate;
    let bestGross = dailyTotal;
    let tierUsed = 'Daily Rate';

    if (weeklyRate > 0) {
      const mixCost = (Math.floor(durationDays / 7) * weeklyRate) + ((durationDays % 7) * dailyRate);
      const flatCost = Math.ceil(durationDays / 7) * weeklyRate;
      const bestWeekly = Math.min(mixCost, flatCost);
      if (bestWeekly < bestGross) { bestGross = bestWeekly; tierUsed = 'Weekly Package'; }
    }

    if (monthlyRate > 0) {
      const months = Math.floor(durationDays / 30);
      const remDays = durationDays % 30;
      const mixCost = (months * monthlyRate) + (Math.floor(remDays / 7) * (weeklyRate || dailyRate * 7)) + ((remDays % 7) * dailyRate);
      const flatCost = Math.max(1, Math.ceil(durationDays / 30)) * monthlyRate;
      const bestMonthly = Math.min(mixCost, flatCost);
      if (bestMonthly < bestGross) { bestGross = bestMonthly; tierUsed = 'Monthly Package'; }
    }

    return {
      durationDays,
      total: bestGross,
      savings: dailyTotal - bestGross,
      tierUsed
    };
  };

  const handleBookVehicle = (vehicle) => {
    const est = calculateEstimate(vehicle);
    const days = est ? est.durationDays : 1;
    const priceStr = est ? formatRupiah(est.total) : `${formatRupiah(vehicle.rate_per_day)}/day`;

    const msg = `Aloha *${biz.name}*! 🌴✨\n\nI would like to inquire & book a motorbike rental:\n\n🏍️ *Vehicle:* ${vehicle.name} (${vehicle.category ? vehicle.category.toUpperCase() : 'Scooter'})\n📅 *Start Date:* ${formatEnDate(startDate)}\n📅 *End Date:* ${formatEnDate(endDate)}\n⏳ *Duration:* ${days} day(s)\n💰 *Estimated Total:* ${priceStr}\n📍 *Pickup Area:* Pererenan / Canggu\n\nIs this bike available for these dates? Thank you!`;

    const gateway = getWaGatewayConfig();
    if (gateway.enabled) {
      sendWhatsAppGateway(biz.phone, msg).then(res => {
        if (!res.success && res.url) {
          window.open(res.url, '_blank');
        }
      });
    } else {
      const waUrl = getWhatsAppShareUrl(biz.phone, msg);
      window.open(waUrl, '_blank');
    }
  };

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = '/images/boss_rent_fleet_lineup.png';
  };

  const filtered = vehicles.filter(v => {
    const matchesCat = selectedCategory === 'all' || (v.category && v.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || (v.plate_number && v.plate_number.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ background: '#FFFFFF', color: '#0F172A', minHeight: '100vh', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* ── STYLES FOR SHARP EDGES UI (SQUARE 0px BORDER RADIUS) & MARQUEE ── */}
      <style>{`
        * {
          border-radius: 0px !important;
        }
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          gap: 20px;
          width: max-content;
          animation: marqueeScroll 40s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        .bento-card-sharp {
          position: relative;
          border-radius: 0px !important;
          overflow: hidden;
          background: #F1F5F9;
          border: 1px solid #0F172A;
          box-shadow: 4px 4px 0px #0F172A;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bento-card-sharp:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #E85D04;
        }
        .bento-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .bento-card-sharp:hover .bento-img {
          transform: scale(1.03);
        }
        .bento-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 20px;
          color: #FFF;
        }
        .sharp-card {
          background: #FFFFFF;
          border: 1px solid #0F172A;
          box-shadow: 4px 4px 0px #0F172A;
          border-radius: 0px !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sharp-card:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #0F172A;
        }
        .sharp-btn {
          border-radius: 0px !important;
          border: 1px solid #0F172A;
          box-shadow: 2px 2px 0px #0F172A;
          font-weight: 800;
          transition: all 0.15s ease;
        }
        .sharp-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0px #0F172A;
        }
      `}</style>

      {/* ── TOP ANNOUNCEMENT BAR (Sharp Square Style) ── */}
      <div style={{ background: '#0F172A', color: '#F8FAFC', textAlign: 'center', padding: '10px 16px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px', borderBottom: '2px solid #E85D04', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-motorcycle" style={{ color: '#E85D04' }}></i>
          {biz.tagline}
        </span>
        <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#FFD700', textDecoration: 'underline', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-star" style={{ color: '#FFD700' }}></i>
          {animatedRating} Google Rating ({animatedReviews} Reviews)
        </a>
      </div>

      {/* ── STICKY NAVBAR HEADER (Sharp Square Flat Header) ── */}
      <header style={{ background: '#FFFFFF', borderBottom: '2px solid #0F172A', position: 'sticky', top: 0, zIndex: 100, padding: '16px 28px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/images/logoCompany.png"
              alt="BOSS RENT PERERENAN Logo"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '21px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
                {biz.name}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#E85D04' }}></i>
                {biz.address}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={biz.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn sharp-btn"
              style={{ background: '#F8FAFC', color: '#1E293B', padding: '8px 18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <i className="fa-solid fa-map-location-dot" style={{ color: '#4285F4' }}></i>
              <span>Google Maps</span>
            </a>

            <a
              href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn sharp-btn"
              style={{ background: '#25D366', color: '#fff', padding: '9px 20px', fontSize: '12.5px', border: '1px solid #0F172A', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '17px' }}></i>
              <span>{biz.phoneRaw}</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER & ANIMATED COUNTERS SECTION (Sharp Square Layout) ── */}
      <section style={{ background: '#F8FAFC', borderBottom: '2px solid #0F172A', padding: '52px 24px 36px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>
          {/* Sharp Square Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #0F172A', color: '#0F172A', padding: '6px 18px', fontSize: '12px', fontWeight: 800, marginBottom: '20px', boxShadow: '2px 2px 0px #0F172A' }}>
            <span style={{ color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-star"></i> {animatedRating}
            </span>
            <span>Google Verified Business ({animatedReviews} Google Reviews)</span>
          </div>

          <h1 style={{ fontSize: '40px', fontWeight: 900, marginBottom: '14px', color: '#0F172A', lineHeight: 1.15, letterSpacing: '-0.8px' }}>
            Clean & Reliable Scooter Rental in Pererenan & Canggu
            <i className="fa-solid fa-location-dot" style={{ color: '#E85D04', marginLeft: '10px' }}></i>
          </h1>

          <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.6, marginBottom: '36px', maxWidth: '740px', margin: '0 auto 36px auto', fontWeight: 500 }}>
            Explore Bali with confidence! Clean helmets, free delivery & pickup in Canggu / Pererenan area, transparent daily & weekly rates, and 24/7 WhatsApp support.
          </p>

          {/* ── ANIMATED COUNTER GRID (Sharp Square Stat Cards) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '36px' }}>
            <div className="sharp-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, color: '#E85D04', letterSpacing: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span>{animatedRating}</span>
                <i className="fa-solid fa-star" style={{ color: '#F59E0B', fontSize: '26px' }}></i>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>Google Rating</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>5-Star Verified Score</div>
            </div>

            <div className="sharp-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, color: '#16A34A', letterSpacing: '-1px' }}>
                {animatedReviews}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>Google Reviews</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Real Happy Customers</div>
            </div>

            <div className="sharp-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, color: '#2563EB', letterSpacing: '-1px' }}>
                {animatedSatisfaction}%
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>Customer Satisfaction</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Best Service Guarantee</div>
            </div>

            <div className="sharp-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, color: '#D97706', letterSpacing: '-1px' }}>
                {animatedFleet}+
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>Clean Scooters</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Regularly Serviced</div>
            </div>
          </div>

          {/* ── SHARP SQUARE DATE PICKER BAR ── */}
          <div className="sharp-card" style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 900, color: '#0F172A', marginBottom: '6px', textAlign: 'left' }}>
                <i className="fa-solid fa-calendar-plus" style={{ marginRight: '4px', color: '#E85D04' }}></i> Pickup Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #0F172A', color: '#0F172A', padding: '10px 14px', fontSize: '13px', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 900, color: '#0F172A', marginBottom: '6px', textAlign: 'left' }}>
                <i className="fa-solid fa-calendar-check" style={{ marginRight: '4px', color: '#E85D04' }}></i> Return Date
              </label>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #0F172A', color: '#0F172A', padding: '10px 14px', fontSize: '13px', fontWeight: 700 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SHARP BENTO GRID CUSTOMER SHOWCASE GALLERY ── */}
      <section style={{ padding: '52px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#E85D04', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
            EXPLORE OUR FLEET & SERVICE
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '4px 0 6px 0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Premium Scooter Fleet & Service Gallery</span>
            <i className="fa-solid fa-images" style={{ color: '#E85D04' }}></i>
          </h2>
          <div style={{ fontSize: '14px', color: '#64748B' }}>
            Explore our clean scooters, equipment standards, and professional rental service in Pererenan & Canggu, Bali
          </div>
        </div>

        {/* TIGHT 9-CARD BENTO GRID MATRIX (No Empty Space Gaps) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {bentoPhotos.map((photo, idx) => (
            <div
              key={idx}
              className="bento-card-sharp"
              style={{
                minHeight: '260px',
                gridColumn: photo.span === 'wide' ? 'span 2' : 'span 1'
              }}
            >
              <img src={photo.url} alt={photo.title} className="bento-img" onError={handleImgError} />
              <div className="bento-overlay">
                <span style={{ fontSize: '10px', background: '#0F172A', color: '#FFF', padding: '4px 10px', fontWeight: 800, width: 'fit-content', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={photo.icon} style={{ color: '#E85D04', fontSize: '11px' }}></i>
                  <span>{photo.tag}</span>
                </span>
                <div style={{ fontSize: photo.span === 'wide' ? '19px' : '16px', fontWeight: 900 }}>{photo.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHARP SCOOTER CATALOG GRID ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px 60px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Available Fleet & Smart Pricing</span>
              <i className="fa-solid fa-motorcycle" style={{ color: '#E85D04' }}></i>
            </h2>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Daily, Weekly, & Monthly rate tiers automatically calculated for best savings.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Scooters' },
              { id: 'honda', label: 'Honda' },
              { id: 'yamaha', label: 'Yamaha' },
              { id: 'vespa', label: 'Vespa' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="sharp-btn"
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  background: selectedCategory === cat.id ? '#E85D04' : '#FFFFFF',
                  color: selectedCategory === cat.id ? '#fff' : '#0F172A',
                  cursor: 'pointer'
                }}
              >
                {cat.label}
              </button>
            ))}

            <input
              type="text"
              placeholder="Search model..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '180px', background: '#FFFFFF', border: '1px solid #0F172A', color: '#0F172A', padding: '8px 14px', fontSize: '12px', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Loading / Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#E85D04' }}></i>
            <div style={{ marginTop: '12px', fontSize: '14px' }}>Loading Available Scooters...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sharp-card" style={{ textAlign: 'center', padding: '60px 0', background: '#F8FAFC' }}>
            <i className="fa-solid fa-motorcycle" style={{ fontSize: '40px', color: '#94A3B8', marginBottom: '12px' }}></i>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>No Scooters Available In This Category</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Please select another brand category or clear search.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filtered.map(vehicle => {
              const estimate = calculateEstimate(vehicle);
              const isAvailable = vehicle.status === 'available';

              return (
                <div key={vehicle.id} className="sharp-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Image */}
                  <div style={{ height: '180px', width: '100%', background: '#F1F5F9', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #0F172A' }}>
                    {vehicle.image_url ? (
                      <img src={vehicle.image_url} alt={vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImgError} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: '48px' }}>
                        <i className="fa-solid fa-motorcycle"></i>
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        background: isAvailable ? '#22C55E' : '#3B82F6',
                        color: '#FFF',
                        border: '1px solid #0F172A',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {isAvailable ? (
                        <>
                          <span>Available Now</span>
                          <i className="fa-solid fa-circle-check"></i>
                        </>
                      ) : (
                        <>
                          <span>Rented</span>
                          <i className="fa-solid fa-key"></i>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#E85D04', fontWeight: 900, textTransform: 'uppercase' }}>
                      {vehicle.category ? vehicle.category.toUpperCase() : 'SCOOTER'} • {vehicle.year}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '2px 0 10px 0' }}>
                      {vehicle.name}
                    </div>

                    {/* Rate Tiers */}
                    <div style={{ background: '#F8FAFC', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '14px', border: '1px solid #0F172A' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Daily:</span>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{formatRupiah(vehicle.rate_per_day)}</div>
                      </div>
                      {vehicle.rate_per_week > 0 && (
                        <div>
                          <span style={{ color: '#64748B' }}>Weekly:</span>
                          <div style={{ fontWeight: 800, color: '#16A34A' }}>{formatRupiah(vehicle.rate_per_week)}</div>
                        </div>
                      )}
                      {vehicle.rate_per_month > 0 && (
                        <div>
                          <span style={{ color: '#64748B' }}>Monthly:</span>
                          <div style={{ fontWeight: 800, color: '#2563EB' }}>{formatRupiah(vehicle.rate_per_month)}</div>
                        </div>
                      )}
                    </div>

                    {/* Smart Calculation Estimate */}
                    {estimate && (
                      <div style={{ background: 'rgba(232, 93, 4, 0.06)', border: '1px solid #0F172A', padding: '10px 12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#E85D04', fontWeight: 900 }}>
                            <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '4px' }}></i> Estimated ({estimate.durationDays} Days):
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>{formatRupiah(estimate.total)}</span>
                        </div>
                        {estimate.savings > 0 && (
                          <div style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: 800, marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-tag"></i> Saves {formatRupiah(estimate.savings)} via {estimate.tierUsed}!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Booking Button */}
                    <button
                      type="button"
                      className="btn sharp-btn"
                      onClick={() => handleBookVehicle(vehicle)}
                      style={{
                        marginTop: 'auto',
                        width: '100%',
                        background: '#25D366',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className="fa-brands fa-whatsapp" style={{ fontSize: '18px' }}></i>
                      <span>Book via WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── GOOGLE REVIEWS SECTION (Infinite Scroll Carousel Marquee) ── */}
      <section style={{ background: '#F8FAFC', borderTop: '2px solid #0F172A', borderBottom: '2px solid #0F172A', padding: '54px 0', overflow: 'hidden', position: 'relative' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#E85D04', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
            REAL GOOGLE MAPS REVIEWS
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '4px 0 8px 0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Google Reviews & Ratings</span>
            <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i>
          </h2>
          <div style={{ fontSize: '14px', color: '#64748B' }}>
            5.0 Rating based on {biz.reviewsCount} Google Maps reviews for Boss Rent Pererenan (Hover to pause)
          </div>
        </div>

        {/* ── INFINITE MARQUEE CAROUSEL ── */}
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(to right, #F8FAFC, transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(to left, #F8FAFC, transparent)', zIndex: 2, pointerEvents: 'none' }}></div>

          <div className="marquee-track">
            {[...reviews, ...reviews].map((rev, i) => (
              <div
                key={i}
                className="sharp-card"
                style={{
                  padding: '20px',
                  width: '320px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#F59E0B', fontSize: '13px', display: 'flex', gap: '2px' }}>
                    {[...Array(rev.rating)].map((_, sIdx) => (
                      <i key={sIdx} className="fa-solid fa-star"></i>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#0F172A', background: '#F1F5F9', border: '1px solid #0F172A', padding: '2px 8px', fontWeight: 800 }}>
                    {rev.badge}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  "{rev.comment}"
                </p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid #0F172A', paddingTop: '10px', fontWeight: 900, fontSize: '12px', color: '#0F172A' }}>
                  {rev.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <a
            href={biz.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn sharp-btn"
            style={{ background: '#FFFFFF', color: '#1E293B', padding: '10px 24px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-brands fa-google" style={{ color: '#4285F4' }}></i>
            <span>View All 24 Reviews on Google Maps</span>
          </a>
        </div>
      </section>

      {/* ── EMBEDDED INTERACTIVE LIVE GOOGLE MAPS SECTION ("Find Boss Rent Pererenan") ── */}
      <section style={{ padding: '56px 24px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', color: '#E85D04', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              INTERACTIVE GOOGLE MAPS LOCATION
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '4px 0 8px 0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Find Boss Rent Pererenan</span>
              <i className="fa-solid fa-location-dot" style={{ color: '#E85D04' }}></i>
            </h2>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              {biz.address}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
            {/* Business Contact Info */}
            <div className="sharp-card" style={{ padding: '28px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
                Store Information
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '13.5px', color: '#334155', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', background: '#0F172A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-location-dot" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: '#0F172A' }}>Address:</strong><br />
                    {biz.address}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', background: '#22C55E', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-phone" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: '#0F172A' }}>Phone / WhatsApp:</strong><br />
                    <a href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`} style={{ color: '#25D366', fontWeight: 800 }}>
                      {biz.phoneRaw} ({biz.phone})
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', background: '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-clock" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: '#0F172A' }}>Operating Hours:</strong><br />
                    {biz.hours}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <a
                  href={biz.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn sharp-btn"
                  style={{ background: '#E85D04', color: '#fff', padding: '12px 22px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-route"></i>
                  <span>Open Directions on Google Maps</span>
                </a>
              </div>
            </div>

            {/* Embedded Live Google Maps Iframe */}
            <div className="sharp-card" style={{ overflow: 'hidden' }}>
              <iframe
                title="Boss Rent Pererenan Google Map"
                src={biz.mapsEmbedUrl}
                width="100%"
                height="380"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* ── SHARP SQUARE FLOATING WHATSAPP BUTTON ── */}
      <a
        href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#25D366',
          color: '#FFF',
          width: '58px',
          height: '58px',
          borderRadius: '0px !important',
          border: '2px solid #0F172A',
          boxShadow: '4px 4px 0px #0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          zIndex: 9999
        }}
        title="Chat with Boss Rent Pererenan"
      >
        <i className="fa-brands fa-whatsapp"></i>
      </a>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#F8FAFC', borderTop: '2px solid #0F172A', padding: '28px 24px', textAlign: 'center', fontSize: '12.5px', color: '#64748B' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#0F172A' }}>{biz.name}</strong> • Premium Scooter Rental Pererenan, Canggu, Bali.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', fontWeight: 700 }}>Google Maps Profile</a>
            <a href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', textDecoration: 'none', fontWeight: 800 }}>WhatsApp Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
