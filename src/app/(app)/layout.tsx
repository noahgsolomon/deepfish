import { StatusBar } from "~/components/status-bar";
import { Sidebar } from "~/components/sidebar";
import TopBar from "~/components/top-bar";
import { HistoryPanel } from "~/components/panels/history-panel";
import { QueuePanel } from "~/components/panels/queue-panel";
import type React from "react";
import FlowPanel from "~/components/panels/flow-panel";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import Initialize from "./initialize";
import MobileBottomBar from "~/components/mobile-bottom-bar";
import {
  getServerQueryClient,
  HydrateClient,
  trpcQueryOptions,
} from "~/trpc/server";
import { staticServerApi } from "~/lib/trpc/server-client";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: {
    default:
      "DeepFish AI - Generative AI Platform | FLUX, Veo 3, HiDream & 100+ Models",
    template: "%s | DeepFish AI - Generative AI Platform",
  },
  description:
    "DeepFish AI - Professional generative AI platform for creating stunning images, videos, and 3D content. Use FLUX, Google Veo 3, HiDream, GPT-Image-1, anime models like Illustrious XL, and 100+ cutting-edge AI models. No-code visual workflow composer.",
  keywords: [
    "anime character generator",
    "waifu generator",
    "anime background generator",
    "manga panel generator",
    "lofi anime art",
    "AI workflow composer",
    "no-code AI platform",
    "visual AI programming",
    "AI model chaining",
    "multi-model AI pipeline",
    "text to image AI",
    "image to image AI",
  ],

  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "DeepFish",
  },
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
  },
  openGraph: {
    title: {
      default:
        "DeepFish AI - Generative AI Platform | FLUX, Veo 3, HiDream & 100+ Models",
      template: "%s | DeepFish AI - Generative AI Platform",
    },
    description:
      "Professional generative AI platform. Create stunning AI-generated images, videos & 3D content with FLUX, Google Veo 3, HiDream, anime models and 100+ cutting-edge AI models. No coding required.",
    type: "website",
    images: ["/app-icon.png"],
    siteName: "DeepFish AI",
    locale: "en_US",
    url: "https://deepfi.sh",
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default:
        "DeepFish AI - Generative AI Platform | FLUX, Veo 3, HiDream & 100+ Models",
      template: "%s | DeepFish AI - Generative AI Platform",
    },
    description:
      "Create anime, manga, realistic images & videos with FLUX, Google Veo 3, HiDream & more. Visual workflow composer.",
    site: "@deepfishlol",
    creator: "@deepfishlol",
    images: ["/app-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 5,
  userScalable: true,
};

const getCachedWorkflows = unstable_cache(
  async () => {
    const response = await staticServerApi.workflow.getAllWorkflows.query({});

    return response;
  },
  ["workflows-cache-v2"],
  {
    revalidate: 60 * 60 * 24,
    tags: ["workflows"],
  },
);

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getServerQueryClient();

  await queryClient.prefetchQuery(
    trpcQueryOptions.workflow.getUserActiveRuns.queryOptions(),
  );

  await queryClient.prefetchQuery(trpcQueryOptions.user.getUser.queryOptions());

  queryClient.setQueryData(
    trpcQueryOptions.workflow.getAllWorkflows.queryKey({}),
    await getCachedWorkflows(),
  );

  return (
    <HydrateClient>
      <div className="relative flex h-screen overflow-hidden bg-black text-white">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <div className="ml-0 flex flex-1 flex-col overflow-y-auto bg-black pb-8 sm:ml-10 md:ml-14">
            {children}
          </div>
          <StatusBar />
        </main>
        <QueuePanel />
        <HistoryPanel />
        <FlowPanel />
        <Initialize />
        <MobileBottomBar />
        <SpeedInsights />
      </div>
    </HydrateClient>
  );
}
