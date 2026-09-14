// app/manifest.js - [Web-App-Manifest, damit /pos als Vollbild-App auf dem Tablet läuft]
export default function manifest() {
  return {
    name: "Weltladen St. Ursula – Kasse",
    short_name: "Weltladen Kasse",
    description:
      "Kassensystem der Schülerfirma Weltladen St. Ursula in Villingen.",
    lang: "de",
    dir: "ltr",
    start_url: "/pos",
    scope: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#0B2F5C",
    theme_color: "#D31329",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Live-Kasse", url: "/pos" },
      { name: "Systemsteuerung", url: "/admin" },
    ],
  };
}
