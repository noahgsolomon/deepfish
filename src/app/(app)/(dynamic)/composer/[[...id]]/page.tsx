import { eq } from "drizzle-orm";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { flows } from "~/server/db/schema";
import Composer from "../content";

type Props = {
  params: Promise<{ id?: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!Array.isArray(id) || id.length === 0) {
    return {};
  }

  const flow = await db.query.flows.findFirst({
    where: eq(flows.id, id[0]),
    columns: { name: true, thumbnail: true },
  });

  const redirectedThumbnail = flow?.thumbnail?.startsWith(
    "https://app.deepfi.sh",
  )
    ? flow.thumbnail.replace("https://app.", "https://")
    : flow?.thumbnail;

  return {
    title: flow?.name || "new flow",
    openGraph: {
      title: flow?.name,
      type: "website",
      images: [redirectedThumbnail ?? "/app-icon.png"],
      siteName: "DeepFish AI",
      locale: "en_US",
      url: `https://deepfi.sh/composer/${id[0]}`,
    },
    twitter: {
      card: "summary_large_image",
      title: flow?.name,
      description:
        "Create anime, manga, realistic images & videos with FLUX, Google Veo 3, HiDream & more. Visual workflow composer.",
      site: "@deepfishlol",
      creator: "@deepfishlol",
      images: [redirectedThumbnail ?? "/app-icon.png"],
    },
  };
}

export default async function ComposerPage({ params }: Props) {
  const { id } = await params;

  if (!Array.isArray(id) || id.length === 0) {
    redirect("/");
  }

  const slug = id[0];

  return <Composer slug={slug} />;
}
