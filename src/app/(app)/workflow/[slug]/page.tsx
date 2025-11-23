import WorkflowClient from "./page-client";
import type { Metadata } from "next";
import {
  getServerQueryClient,
  HydrateClient,
  trpcQueryOptions,
} from "~/trpc/server";
import { staticServerApi } from "~/lib/trpc/server-client";

// Dynamic when there's a runId, static otherwise
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  try {
    const slugs = await staticServerApi.workflow.getAllWorkflowSlugs.query();
    return slugs;
  } catch (error) {
    console.error("Failed to generate static params for workflows:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  try {
    const workflow = await staticServerApi.workflow.getWorkflowBySlug.query({
      slug: decodedSlug,
    });

    if (!workflow?.data) {
      return {
        title: "Workflow Not Found",
        description: "The requested workflow could not be found.",
      };
    }

    const { title, description, avatar } = workflow.data;
    const { keywords, pageTitle } = workflow;
    const workflowImage = avatar?.startsWith("/")
      ? `https://deepfi.sh${avatar}`
      : avatar;

    return {
      title: pageTitle || `${title} - AI Generator | DeepFish`,
      description:
        description ||
        `Generate amazing content with ${title} on DeepFish. Free to start, no credit card required.`,
      keywords: keywords.split(", "),
      openGraph: {
        title: pageTitle || `${title} - AI Workflow`,
        description: description || `Run ${title} AI workflow on DeepFish`,
        images: [
          {
            url: workflowImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
        siteName: "DeepFish",
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle || `${title} - AI Workflow`,
        description: description || `Run ${title} AI workflow on DeepFish`,
        images: [workflowImage],
        creator: "@deepfishlol",
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
    };
  } catch (error) {
    console.error("Failed to generate metadata for workflow:", error);
    return {
      title: "AI Workflow | DeepFish",
      description: "Run AI workflows on DeepFish",
    };
  }
}

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const resolvedSearchParams = await searchParams;
  const runId = resolvedSearchParams?.runId as string | undefined;

  const queryClient = getServerQueryClient();

  await queryClient.fetchQuery(
    trpcQueryOptions.workflow.getWorkflowBySlug.queryOptions({
      slug: decodedSlug,
    }),
  );

  await queryClient.prefetchQuery(
    trpcQueryOptions.workflow.getUserActiveRuns.queryOptions(),
  );

  // Prefetch run data if runId is present in URL
  if (runId) {
    await queryClient.prefetchQuery(
      trpcQueryOptions.workflow.getRunByEventId.queryOptions({
        eventId: runId,
      }),
    );
  }

  return (
    <HydrateClient>
      <WorkflowClient slug={decodedSlug} />
    </HydrateClient>
  );
}
