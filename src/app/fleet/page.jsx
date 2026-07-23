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

export default function EditorialFleetPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Date selection state for smart rate estimate
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bento gallery show more state
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Business & CMS Landing Page State
  const [biz, setBiz] = useState({
    name: 'BOSS RENT PERERENAN',
    tagline: 'Available Scooter For Rent • Best Service • Best Price • Villa Delivery Available • Clean & Well-Maintained Scooters',
    address: 'Jl. Pantai Pererenan No.119, Pererenan, Kec. Mengwi, Kabupaten Badung, Bali 80351',
    phone: '+62 812-3710-9751',
    phoneRaw: '0812-3710-9751',
    hours: 'Open Daily from 09.00 AM WITA',
    rating: 5.0,
    reviewsCount: 24,
    satisfactionPercent: 100,
    cleanScootersCount: 50,
    heroTitle: 'Clean & Reliable Scooter Rental in Pererenan & Canggu',
    heroSubtitle: 'Explore Bali with confidence! Clean helmets, delivery & pickup in Canggu / Pererenan area, transparent daily & weekly rates, and 24/7 WhatsApp support.',
    instagramUrl: 'https://www.instagram.com/bossrentpererenan?igsh=MWFxZzE3eWI2dWlqZA==',
    instagramHandle: '@bossrentpererenan',
    mapsUrl: 'https://maps.app.goo.gl/SdqrCREMRtkanUGd6',
    mapsEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=115.1180%2C-8.6520%2C115.1270%2C-8.6430&layer=mapnik&marker=-8.6477169%2C115.1226017'
  });

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const [faqs, setFaqs] = useState([
    {
      q: 'What documents are required to rent a scooter at Boss Rent Pererenan?',
      a: 'It is very simple! You only need to present a valid ID / Passport and a Driver’s License (or International Driving Permit for overseas tourists). Verification takes only 3 minutes with no complicated original document holding.'
    },
    {
      q: 'Is villa or hotel delivery service available in Pererenan & Canggu?',
      a: 'Yes! We provide convenient scooter delivery & pickup service directly to your Villa, Hotel, or Resort in Pererenan, Canggu, Batu Bolong, Echo Beach, and Umalas areas upon request.'
    },
    {
      q: 'What amenities are included with every scooter rental?',
      a: 'Every scooter rental comes equipped with 2 clean sanitized helmets, 2 premium raincoats, a sturdy handlebar phone holder for GPS navigation, and a well-maintained scooter with fuel ready to ride.'
    },
    {
      q: 'What should I do if I experience a flat tire or mechanical issue during my rental?',
      a: 'Don’t worry! Our 24/7 Roadside Assistance team is always ready to assist you anywhere in Bali to fix the issue or provide a swap scooter promptly.'
    },
    {
      q: 'How does the security deposit refund process work?',
      a: 'The security deposit is refunded in full (Cash or Bank Transfer) immediately upon scooter return following a quick joint physical check.'
    }
  ]);

  // Animated counters
  const animatedRating = useCountUp(biz.rating || 5.0, 1200, true);
  const animatedReviews = useCountUp(biz.reviewsCount || 24, 1500, false);
  const animatedSatisfaction = useCountUp(biz.satisfactionPercent || 100, 1600, false);
  const animatedFleet = useCountUp(biz.cleanScootersCount || 50, 1400, false);

  // 10 Extended Reviews
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

  // Bento showcase grid photos
  const bentoPhotos = Array.isArray(biz.galleryPhotos) && biz.galleryPhotos.length > 0 ? biz.galleryPhotos : [
    {
      url: '/images/boss_rent_customer_bali.png',
      title: 'Scooter Rental in Pererenan',
      tag: 'Premium Fleet',
      icon: 'fa-solid fa-star',
    },
    {
      url: '/images/boss_rent_bento_1.png',
      title: 'Mint Green Vespa Fleet',
      tag: 'Stylish Scooters',
      icon: 'fa-solid fa-motorcycle',
    },
    {
      url: '/images/boss_rent_fleet_lineup.png',
      title: 'Clean & Regularly Serviced Fleet',
      tag: '100% Maintained',
      icon: 'fa-solid fa-wrench',
    },
    {
      url: '/images/boss_rent_bento_2.png',
      title: 'Pererenan Beach Exploring',
      tag: 'Canggu Area',
      icon: 'fa-solid fa-umbrella-beach',
    },
    {
      url: '/images/boss_rent_bento_3.png',
      title: 'Easy Key Handover Service',
      tag: 'Express Pickup',
      icon: 'fa-solid fa-key',
    },
    {
      url: '/images/boss_rent_bento_5.png',
      title: 'Scenic Countryside Cruising',
      tag: 'Bali Road Trips',
      icon: 'fa-solid fa-route',
    }
  ];

  useEffect(() => {
    // Default dates: Today to 3 days later
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(threeDaysLater.toISOString().split('T')[0]);

    // Load admin business settings from localStorage if available
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        setBiz(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          logoUrl: parsed.logoUrl || prev.logoUrl || '/images/logoCompany.png',
          phone: parsed.phone || prev.phone,
          phoneRaw: parsed.phone || prev.phoneRaw,
          address: parsed.address || prev.address,
          tagline: parsed.tagline || prev.tagline,
          heroTitle: parsed.heroTitle || prev.heroTitle,
          heroSubtitle: parsed.heroSubtitle || prev.heroSubtitle,
          rating: parsed.rating ? parseFloat(parsed.rating) : prev.rating,
          reviewsCount: parsed.reviewsCount ? parseInt(parsed.reviewsCount) : prev.reviewsCount,
          satisfactionPercent: parsed.satisfactionPercent ? parseInt(parsed.satisfactionPercent) : prev.satisfactionPercent,
          cleanScootersCount: parsed.cleanScootersCount ? parseInt(parsed.cleanScootersCount) : prev.cleanScootersCount,
          instagramUrl: parsed.instagramUrl || prev.instagramUrl,
          instagramHandle: parsed.instagramHandle || prev.instagramHandle,
          galleryPhotos: Array.isArray(parsed.galleryPhotos) && parsed.galleryPhotos.length > 0 ? parsed.galleryPhotos : prev.galleryPhotos
        }));

        if (Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
          setFaqs(parsed.faqs);
        }
      }
    } catch {
      // ignore
    }

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
    <div style={{ background: '#0B0C10', color: '#F0F0F5', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      
      {/* ── STICKY TOP EDITORIAL JOURNAL BAR ── */}
      <div style={{ background: '#07070A', borderBottom: '1px solid rgba(212, 175, 55, 0.25)', padding: '9px 16px', fontSize: '11px', textAlign: 'center', color: '#D4AF37', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span className="font-serif-editorial" style={{ fontStyle: 'italic', textTransform: 'none', fontSize: '13px', color: '#F5F5F0' }}>
          The Pererenan Fleet Journal — Volume 2026 Edition
        </span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span><i className="fa-solid fa-shield-halved" style={{ marginRight: '5px' }}></i> Sanitized Helmets & Raincoats Included</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i> {animatedRating} Google Score ({animatedReviews} Reviews)
        </a>
      </div>

      {/* ── EDITORIAL HEADER NAVBAR ── */}
      <header style={{ background: 'rgba(11, 12, 16, 0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', position: 'sticky', top: 0, zIndex: 100, padding: '16px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={biz.logoUrl || "/images/logoCompany.png"}
              alt="BOSS RENT PERERENAN Logo"
              style={{ height: '46px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div className="font-serif-editorial" style={{ fontSize: '22px', fontWeight: 800, color: '#F5F5F0', letterSpacing: '-0.3px' }}>
                {biz.name}
              </div>
              <div style={{ fontSize: '11px', color: '#9898B0', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#D4AF37' }}></i>
                {biz.address}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a
              href={`https://wa.me/${biz.phoneRaw.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-filter-btn active"
              style={{ padding: '10px 22px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '15px' }}></i>
              <span>Book via Concierge</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── EDITORIAL MAGAZINE COVER HERO SECTION ── */}
      <section style={{ position: 'relative', padding: '72px 24px 60px 24px', background: 'radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.08) 0%, rgba(11, 12, 16, 1) 70%)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          
          <div className="editorial-issue-tag" style={{ marginBottom: '16px' }}>
            — ISSUE N° 04 • BALI MOTORCYCLE COLLECTION —
          </div>

          <h1 className="font-serif-editorial" style={{ fontSize: '46px', fontWeight: 800, color: '#F5F5F0', lineHeight: 1.15, marginBottom: '20px', letterSpacing: '-0.5px' }}>
            Quiet Luxury & Bespoke Scooter Rental in Pererenan
          </h1>

          <p style={{ fontSize: '16px', color: '#A0A0B5', lineHeight: 1.7, maxWidth: '720px', margin: '0 auto 42px auto', fontWeight: 400 }}>
            {biz.heroSubtitle}
          </p>

          {/* ── EDITORIAL HERO SHOWCASE FRAME ── */}
          <div className="editorial-card" style={{ maxWidth: '1000px', margin: '0 auto 48px auto', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
              <img
                src="/images/boss_rent_fleet_lineup.png"
                alt="The Pererenan Fleet Collection"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 12, 16, 0.95) 0%, rgba(11, 12, 16, 0.3) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '32px 36px', textAlign: 'left' }}>
                <div className="editorial-issue-tag" style={{ fontSize: '11px', marginBottom: '6px' }}>
                  FEATURED SCOOTER LINEUP
                </div>
                <div className="font-serif-editorial" style={{ fontSize: '28px', color: '#FFF', fontWeight: 800 }}>
                  Immaculate Maintenance & Villa Delivery in Canggu & Pererenan
                </div>
                <div style={{ fontSize: '13px', color: '#A0A0B5', marginTop: '6px' }}>
                  24/7 Roadside Assistance • 2 Clean Helmets Included • Honest Transparent Pricing
                </div>
              </div>
            </div>
          </div>

          {/* ── EDITORIAL STATS STRIP ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', maxWidth: '960px', margin: '0 auto 48px auto' }}>
            <div className="editorial-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
              <div className="font-serif-editorial editorial-gold-text" style={{ fontSize: '36px', fontWeight: 900 }}>
                {animatedRating}★
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F5F0', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Google Verified Score
              </div>
              <div style={{ fontSize: '11px', color: '#8888A0', marginTop: '2px' }}>{animatedReviews} 5-Star Reviews</div>
            </div>

            <div className="editorial-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
              <div className="font-serif-editorial" style={{ fontSize: '36px', fontWeight: 900, color: '#22C55E' }}>
                {animatedSatisfaction}%
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F5F0', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Satisfaction Guarantee
              </div>
              <div style={{ fontSize: '11px', color: '#8888A0', marginTop: '2px' }}>Top-Rated Rental Service</div>
            </div>

            <div className="editorial-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
              <div className="font-serif-editorial" style={{ fontSize: '36px', fontWeight: 900, color: '#3B82F6' }}>
                {animatedFleet}+
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F5F0', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Clean Scooter Fleet
              </div>
              <div style={{ fontSize: '11px', color: '#8888A0', marginTop: '2px' }}>Serviced & Maintained</div>
            </div>

            <div className="editorial-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
              <div className="font-serif-editorial editorial-gold-text" style={{ fontSize: '36px', fontWeight: 900 }}>
                0 Min
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F5F0', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Deposit Hassle
              </div>
              <div style={{ fontSize: '11px', color: '#8888A0', marginTop: '2px' }}>Instant Refund Upon Return</div>
            </div>
          </div>

          {/* ── EDITORIAL DATES & ESTIMATE SELECTOR ── */}
          <div className="editorial-card" style={{ padding: '24px 30px', maxWidth: '800px', margin: '0 auto', border: '1px solid rgba(212, 175, 55, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '12px', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              <i className="fa-solid fa-calendar-days"></i> Select Rental Dates for Instant Rate Calculation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#A0A0B5', marginBottom: '6px', textAlign: 'left' }}>
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', background: '#090A0E', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#F5F5F0', padding: '12px 16px', borderRadius: '10px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#A0A0B5', marginBottom: '6px', textAlign: 'left' }}>
                  Return Date
                </label>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', background: '#090A0E', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#F5F5F0', padding: '12px 16px', borderRadius: '10px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── FLEET CATALOG COLLECTION SECTION ── */}
      <section style={{ padding: '64px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Editorial Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="editorial-issue-tag" style={{ marginBottom: '8px' }}>
            OUR CURATED CATALOG
          </div>
          <h2 className="font-serif-editorial" style={{ fontSize: '36px', fontWeight: 800, color: '#F5F5F0', margin: '0 0 10px 0' }}>
            The Motorcycle Collection
          </h2>
          <p style={{ fontSize: '14.5px', color: '#9898B0', maxWidth: '600px', margin: '0 auto' }}>
            Explore our immaculate scooters maintained to safety standards for your smooth journey around Bali.
          </p>
        </div>

        {/* Quiet Luxury Category Filter Chips */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <button
            className={`editorial-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Collections
          </button>
          <button
            className={`editorial-filter-btn ${selectedCategory === 'vespa' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('vespa')}
          >
            Vespa Series
          </button>
          <button
            className={`editorial-filter-btn ${selectedCategory === 'maxi' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('maxi')}
          >
            Maxi Touring (NMAX/PCX)
          </button>
          <button
            className={`editorial-filter-btn ${selectedCategory === 'urban' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('urban')}
          >
            Urban Classics (Scoopy/Vario)
          </button>
        </div>

        {/* Search input */}
        <div style={{ maxWidth: '450px', margin: '0 auto 48px auto' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37', fontSize: '14px' }}></i>
            <input
              type="text"
              placeholder="Search by bike model (e.g. Vespa, NMAX, Scoopy)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#111219', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#F5F5F0', padding: '12px 18px 12px 44px', borderRadius: '50px', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Fleet Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9898B0' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px', color: '#D4AF37', marginBottom: '14px' }}></i>
            <div className="font-serif-editorial" style={{ fontSize: '18px' }}>Loading Editorial Collection...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="editorial-card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '600px', margin: '0 auto' }}>
            <i className="fa-solid fa-motorcycle" style={{ fontSize: '40px', color: '#D4AF37', marginBottom: '14px' }}></i>
            <div className="font-serif-editorial" style={{ fontSize: '22px', color: '#F5F5F0', marginBottom: '8px' }}>No bikes found</div>
            <p style={{ fontSize: '13px', color: '#9898B0' }}>Try adjusting your search filter or category selection.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px' }}>
            {filtered.map(vehicle => {
              const estimate = calculateEstimate(vehicle);
              const isAvailable = vehicle.status === 'available';

              return (
                <div key={vehicle.id} className="editorial-card">
                  {/* Photo Showcase */}
                  <div className="editorial-card-img-wrap">
                    <img
                      src={vehicle.image_url || '/images/boss_rent_fleet_lineup.png'}
                      alt={vehicle.name}
                      className="editorial-card-img"
                      onError={handleImgError}
                    />
                    
                    {/* Status Badge */}
                    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2 }}>
                      {isAvailable ? (
                        <span style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22C55E', padding: '5px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }}></span>
                          Available for Delivery
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#EF4444', padding: '5px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: 700 }}>
                          Currently Rented
                        </span>
                      )}
                    </div>

                    {/* Plate Tag */}
                    {vehicle.plate_number && (
                      <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 2 }}>
                        <span style={{ background: 'rgba(11, 12, 16, 0.85)', border: '1px solid rgba(212, 175, 55, 0.35)', color: '#D4AF37', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          {vehicle.plate_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '24px' }}>
                    <div className="editorial-issue-tag" style={{ fontSize: '11px', marginBottom: '4px' }}>
                      {vehicle.category ? vehicle.category.toUpperCase() : 'PREMIUM SCOOTER'}
                    </div>

                    <h3 className="font-serif-editorial" style={{ fontSize: '22px', fontWeight: 800, color: '#F5F5F0', margin: '0 0 10px 0', lineHeight: 1.25 }}>
                      {vehicle.name}
                    </h3>

                    {/* Feature Specification Pills */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#A0A0B5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                        <i className="fa-solid fa-gauge-high" style={{ marginRight: '5px', color: '#D4AF37' }}></i>
                        {vehicle.engine_cc ? `${vehicle.engine_cc} cc` : '150 cc'}
                      </span>
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#A0A0B5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                        <i className="fa-solid fa-shield-halved" style={{ marginRight: '5px', color: '#D4AF37' }}></i>
                        2 Helmets
                      </span>
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#A0A0B5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                        <i className="fa-solid fa-truck-fast" style={{ marginRight: '5px', color: '#D4AF37' }}></i>
                        Free Delivery
                      </span>
                    </div>

                    {/* Price & Reserve Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#8888A0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Rate</div>
                        <div className="font-serif-editorial editorial-gold-text" style={{ fontSize: '24px', fontWeight: 900 }}>
                          {formatRupiah(vehicle.rate_per_day)}
                          <span style={{ fontSize: '12px', color: '#8888A0', fontWeight: 400 }}> /day</span>
                        </div>
                        {estimate && estimate.durationDays > 1 && (
                          <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: 700, marginTop: '2px' }}>
                            Est. {estimate.durationDays} Days: {formatRupiah(estimate.total)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="editorial-filter-btn active"
                        onClick={() => handleBookVehicle(vehicle)}
                        style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span>Reserve</span>
                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── EDITORIAL STORY & KINFOLK ARTICLE SPREAD ── */}
      <section style={{ background: '#0F1017', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '80px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div className="editorial-issue-tag" style={{ marginBottom: '12px' }}>
              OUR PHILOSOPHY & PROMISE
            </div>
            <h2 className="font-serif-editorial" style={{ fontSize: '38px', fontWeight: 800, color: '#F5F5F0', lineHeight: 1.2, marginBottom: '24px' }}>
              The Art of Uncompromising Scooter Rental in Bali
            </h2>
            <div className="editorial-quote-block" style={{ marginBottom: '24px' }}>
              “We believe exploring Bali’s coastal roads should be seamless, elegant, and entirely stress-free.”
            </div>
            <p style={{ fontSize: '14.5px', color: '#9898B0', lineHeight: 1.8, marginBottom: '28px' }}>
              From sanitized helmets to free villa delivery in Canggu & Pererenan, Boss Rent ensures every machine in our collection is rigorously inspected before key handover.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', color: '#F5F5F0', fontWeight: 600 }}>
              <div><i className="fa-solid fa-check" style={{ color: '#D4AF37', marginRight: '8px' }}></i> Transparent Daily Rates</div>
              <div><i className="fa-solid fa-check" style={{ color: '#D4AF37', marginRight: '8px' }}></i> 2 Sanitized Helmets Included</div>
              <div><i className="fa-solid fa-check" style={{ color: '#D4AF37', marginRight: '8px' }}></i> Free Villa & Hotel Delivery</div>
              <div><i className="fa-solid fa-check" style={{ color: '#D4AF37', marginRight: '8px' }}></i> 24/7 Bali Roadside Team</div>
            </div>
          </div>

          <div className="editorial-card" style={{ padding: '0', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <img
              src="/images/boss_rent_customer_bali.png"
              alt="Bespoke Villa Delivery Service"
              style={{ width: '100%', height: '420px', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* ── REVIEWS MAGAZINE CAROUSEL ── */}
      <section style={{ padding: '72px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div className="editorial-issue-tag" style={{ marginBottom: '8px' }}>
            GUEST TESTIMONIALS
          </div>
          <h2 className="font-serif-editorial" style={{ fontSize: '34px', fontWeight: 800, color: '#F5F5F0', margin: 0 }}>
            What Our Renters Say
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {reviews.map((rev, idx) => (
            <div key={idx} className="editorial-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="font-serif-editorial" style={{ fontSize: '18px', fontWeight: 800, color: '#F5F5F0' }}>
                  {rev.name}
                </div>
                <div style={{ color: '#F59E0B', fontSize: '13px' }}>
                  {'★'.repeat(rev.rating)}
                </div>
              </div>
              <p style={{ fontSize: '13.5px', color: '#A0A0B5', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '16px' }}>
                “{rev.comment}”
              </p>
              <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {rev.badge}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EDITORIAL FAQ ACCORDION ── */}
      <section style={{ background: '#0F1017', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '72px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="editorial-issue-tag" style={{ marginBottom: '8px' }}>
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="font-serif-editorial" style={{ fontSize: '34px', fontWeight: 800, color: '#F5F5F0', margin: 0 }}>
              Rental Guidelines & Information
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="editorial-card"
                  style={{ padding: '20px 24px', cursor: 'pointer', borderColor: isOpen ? 'rgba(212, 175, 55, 0.4)' : 'rgba(255, 255, 255, 0.08)' }}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div className="font-serif-editorial" style={{ fontSize: '17px', fontWeight: 700, color: isOpen ? '#D4AF37' : '#F5F5F0' }}>
                      {faq.q}
                    </div>
                    <div style={{ color: '#D4AF37', fontSize: '16px', fontWeight: 900 }}>
                      {isOpen ? '−' : '+'}
                    </div>
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: '13.5px', color: '#A0A0B5', marginTop: '14px', lineHeight: 1.7, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EDITORIAL FOOTER ── */}
      <footer style={{ background: '#07070A', borderTop: '1px solid rgba(212, 175, 55, 0.25)', padding: '52px 32px 32px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="font-serif-editorial" style={{ fontSize: '26px', fontWeight: 800, color: '#F5F5F0', marginBottom: '8px' }}>
            {biz.name}
          </div>
          <p style={{ fontSize: '13px', color: '#9898B0', maxWidth: '600px', margin: '0 auto 28px auto' }}>
            {biz.address} • Phone: {biz.phone}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
            <a
              href={`https://wa.me/${biz.phoneRaw.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-filter-btn active"
              style={{ padding: '10px 24px', textDecoration: 'none' }}
            >
              <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Contact WA Concierge
            </a>
            <a
              href={biz.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-filter-btn"
              style={{ padding: '10px 24px', textDecoration: 'none' }}
            >
              <i className="fa-brands fa-instagram" style={{ marginRight: '6px' }}></i> Instagram
            </a>
          </div>
          <div style={{ fontSize: '11px', color: '#66667A', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '20px' }}>
            © 2026 {biz.name}. All Rights Reserved. Quiet Luxury Scooter Rentals in Pererenan & Canggu, Bali.
          </div>
        </div>
      </footer>

    </div>
  );
}
