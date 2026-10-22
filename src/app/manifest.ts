import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Opa's Score",
    short_name: "Opa's Score",
    description: "Football, Formule 1 et tous tes sports, rien que pour toi.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0D12",
    theme_color: "#0B0D12",
    orientation: "portrait",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
