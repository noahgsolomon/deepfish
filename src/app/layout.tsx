import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
import AppProviders from "./app-providers";

const jetbrainsMono = localFont({
  src: "../../public/fonts/JetBrainsMono-VariableFont_wght.ttf",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://deepfi.sh";

export const metadata: Metadata = {
  title: {
    default:
      "DeepFish AI - Generative AI Platform | Advanced AI Workflow Composer for Image, Video & 3D Generation",
    template: "%s | DeepFish AI - Generative AI Platform",
  },
  description:
    "Transform your creative workflow with DeepFish's generative AI platform. Create stunning images, videos & 3D content using FLUX, Stable Diffusion XL, and 100+ AI models. Chain multiple AI models together with our no-code workflow composer. Start free today!",
  keywords: [
    "generative AI platform",
    "AI image generator",
    "AI video generator",
    "AI workflow composer",
    "FLUX image generation",
    "FLUX.1 Dev",
    "Google Veo 3",
    "HiDream AI",
    "GPT-Image-1",
    "anime AI generator",
    "manga AI generator",
    "Illustrious XL anime",
    "Animagine XL",
    "anime art generator",
    "waifu generator",
    "kawaii AI art",
    "text to image",
    "text to video",
    "AI creative tools",
    "generative AI",
    "AI workflow automation",
    "no-code AI platform",
    "AI automation platform",
    "ComfyUI alternative",
    "AI model chaining",
    "multi-model AI pipeline",
    "DeepFish AI",
    "AI content creation",
    "Midjourney alternative",
    "DALL-E alternative",
    "Leonardo AI alternative",
    "AI image upscaling",
    "AI video generation platform",
    "3D AI generation",
    "Hunyuan 3D",
    "AI workflow builder",
    "visual AI programming",
    "Stable Diffusion 3.5",
    "uncensored AI art",
  ],
  authors: [{ name: "DeepFish Team" }],
  creator: "DeepFish",
  publisher: "DeepFish",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DeepFish AI - Generative AI Platform for Creative Professionals",
    description:
      "Transform your creative workflow with DeepFish's generative AI platform. Create images, videos & 3D content using FLUX, Veo 3, Stable Diffusion XL, and 100+ AI models. No coding required.",
    url: siteUrl,
    siteName: "DeepFish AI - Generative AI Platform",
    images: [
      {
        url: "/app-icon.png",
        width: 1200,
        height: 630,
        alt: "DeepFish AI - Advanced AI Workflow Composer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepFish AI - Generative AI Platform | FLUX, Veo 3 & 100+ Models",
    description:
      "Transform your creative workflow with DeepFish's generative AI platform. Create images, videos & 3D content using FLUX, Veo 3, Stable Diffusion XL, and 100+ AI models. No coding required.",
    site: "@deepfishlol",
    creator: "@deepfishlol",
    images: ["/app-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const locale = "en";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DeepFish AI",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web, macOS",
    description:
      "Advanced AI workflow composer for creating images, videos, and 3D content",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "100",
    },
  };

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} dark min-h-screen bg-black text-white antialiased select-text`}
      >
        <AppProviders>
          {children}
          {modal}
          <SpeedInsights />
        </AppProviders>
      </body>
    </html>
  );
}
