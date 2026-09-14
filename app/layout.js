import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Weltladen St. Ursula – Kassensystem",
    template: "%s · Weltladen St. Ursula",
  },
  description:
    "Kassensystem der Schülerfirma Weltladen St. Ursula in Villingen. Faire Produkte, verkauft von Schülerinnen und Schülern der St. Ursula Schulen.",
  applicationName: "Weltladen Kasse",
  authors: [{ name: "Jill Manuel Hils" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Weltladen Kasse",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#D31329",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
