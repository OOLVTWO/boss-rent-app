import "@/styles/globals.css";

export const metadata = {
  title: "Boss Rent Pererenan — Scooter Rental Bali",
  description: "Penyewaan sepeda motor matic resmi & admin panel Boss Rent Pererenan",
  icons: {
    icon: [
      { url: '/images/logoCompany.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/images/logoCompany.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        {/* Font Awesome v6 — framework ikon utama seluruh desain aplikasi */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
