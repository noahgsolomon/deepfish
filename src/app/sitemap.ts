import { MetadataRoute } from "next";

import { staticServerApi } from "~/lib/trpc/server-client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://deepfi.sh";
  const currentDate = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  let workflowPages: MetadataRoute.Sitemap = [];
  try {
    const slugs = await staticServerApi.workflow.getAllWorkflowSlugs.query();

    const workflowEntries = await Promise.all(
      slugs.map(async (slugObj) => {
        try {
          const workflow =
            await staticServerApi.workflow.getWorkflowBySlug.query({
              slug: slugObj.slug,
            });

          return {
            url: `${baseUrl}/workflow/${encodeURIComponent(slugObj.slug)}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.8,
            images: workflow?.data?.avatar
              ? [
                  workflow.data.avatar.startsWith("/")
                    ? `${baseUrl}${workflow.data.avatar}`
                    : workflow.data.avatar,
                ]
              : undefined,
          };
        } catch (error) {
          console.error(
            `Failed to fetch workflow details for ${slugObj.slug}:`,
            error,
          );
          return {
            url: `${baseUrl}/workflow/${encodeURIComponent(slugObj.slug)}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.8,
          };
        }
      }),
    );

    workflowPages = workflowEntries;
  } catch (error) {
    console.error("Failed to fetch workflows for sitemap:", error);
  }

  return [...staticPages, ...workflowPages];
}
