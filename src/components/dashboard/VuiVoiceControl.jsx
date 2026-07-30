'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VuiVoiceControl() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const router = useRouter();
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSupported(false);
        return;
      }

      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'id-ID';

      recog.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(text);
        processVoiceCommand(text.toLowerCase());
      };

      recog.onerror = () => {
        setListening(false);
        setFeedback('Gagal mengenali suara. Coba lagi.');
        setTimeout(() => setFeedback(''), 3000);
      };

      recog.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const processVoiceCommand = (cmd) => {
    if (cmd.includes('transaksi') || cmd.includes('sewa')) {
      setFeedback('Navigasi ke Halaman Transaksi...');
      setTimeout(() => { router.push('/transactions'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('motor') || cmd.includes('armada')) {
      setFeedback('Navigasi ke Data Motor...');
      setTimeout(() => { router.push('/vehicles'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('ketersediaan') || cmd.includes('stok')) {
      setFeedback('Navigasi ke Ketersediaan...');
      setTimeout(() => { router.push('/availability'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('tracking') || cmd.includes('lacak')) {
      setFeedback('Navigasi ke Tracking Sewa...');
      setTimeout(() => { router.push('/tracking'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('pengaturan') || cmd.includes('setting')) {
      setFeedback('Navigasi ke Pengaturan...');
      setTimeout(() => { router.push('/settings'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('pengeluaran') || cmd.includes('biaya')) {
      setFeedback('Navigasi ke Pengeluaran...');
      setTimeout(() => { router.push('/expenses'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('dashboard') || cmd.includes('beranda')) {
      setFeedback('Navigasi ke Dashboard...');
      setTimeout(() => { router.push('/dashboard'); setFeedback(''); setTranscript(''); }, 1000);
    } else if (cmd.includes('bantuan') || cmd.includes('tolong')) {
      setFeedback('Perintah suara: Sebutkan "Transaksi", "Data Motor", "Ketersediaan", "Tracking", "Pengaturan"');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Browser Anda tidak mendukung perintah suara Web Speech API. Silakan gunakan Chrome/Edge/Safari.');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      setFeedback('Mendengarkan suara...');
      recognitionRef.current.start();
      setListening(true);
    }
  };

  if (!supported) return null;

  return (
    <div className="vui-voice-container">
      <button
        type="button"
        className={`vui-voice-btn ${listening ? 'listening' : ''}`}
        onClick={toggleListening}
        title={listening ? 'Sedang mendengarkan... (Klik untuk stop)' : 'Klik untuk Perintah Suara (VUI)'}
      >
        <i className={`fa-solid ${listening ? 'fa-microphone-lines fa-bounce' : 'fa-microphone'}`}></i>
        <span className="vui-btn-label">{listening ? 'Mendengarkan...' : 'Perintah Suara AI'}</span>
      </button>

      {(listening || transcript || feedback) && (
        <div className="vui-voice-popover">
          <div className="vui-status-head">
            <span className="vui-pulse-dot"></span>
            <strong>VUI Voice Assistant</strong>
          </div>
          {transcript && <div className="vui-transcript">"{transcript}"</div>}
          {feedback && <div className="vui-feedback">{feedback}</div>}
        </div>
      )}
    </div>
  );
}
