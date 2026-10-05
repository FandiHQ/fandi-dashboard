import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";
import "./globals.css";

// Archivo variable with the width axis: display type is weight 900 at
// font-stretch 112-115% (Azul Bloque section 2).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Fandi — Experiencias VIP en Eventos en Vivo",
  description:
    "Plataforma de engagement en tiempo real para eventos masivos. Subastas, oportunidades e insignias con tus artistas favoritos.",
  metadataBase: new URL("https://fandi.app"),
  openGraph: {
    title: "Fandi — Experiencias VIP en Eventos en Vivo",
    description:
      "Interactúa de verdad con tus ídolos. Subastas en vivo, oportunidades VIP e insignias coleccionables.",
    url: "https://fandi.app",
    siteName: "Fandi",
    images: [
      {
        url: "/fandi-logo.png",
        width: 1200,
        height: 630,
        alt: "Fandi — VIP Experiences at Live Events",
      },
    ],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fandi — Experiencias VIP en Eventos en Vivo",
    description:
      "Subastas en vivo, oportunidades VIP e insignias con tus artistas favoritos.",
    images: ["/fandi-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body
        className={`${archivo.variable} ${spaceMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
              {children}
              <Toaster richColors position="top-center" />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
