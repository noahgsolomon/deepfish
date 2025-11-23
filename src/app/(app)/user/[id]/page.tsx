import { redirect } from "next/navigation";
import { staticServerApi } from "~/lib/trpc/server-client";
import UserPageClient from "./user-page-client";
import type { Metadata } from "next";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const userIds = await staticServerApi.user.getUsersWithPublicFlows.query();
    return userIds;
  } catch (error) {
    console.error(
      "Failed to generate static params for users with public flows:",
      error,
    );
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const user = await staticServerApi.user.getUserById.query(Number(id));

    if (!user) {
      return {
        title: "User Not Found",
        description: "The requested user could not be found.",
      };
    }

    const displayName =
      user.firstName || user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Anonymous";

    return {
      title: `${displayName} | DeepFish AI`,
      description: `View ${displayName}'s profile, flows, and workflows on DeepFish`,
      openGraph: {
        title: `${displayName} | DeepFish AI`,
        description: `View ${displayName}'s profile, flows, and workflows on DeepFish`,
        images: [
          {
            url: user.imageUrl || "/yumemonos/1.png",
            width: 400,
            height: 400,
            alt: displayName,
          },
        ],
        type: "profile",
        siteName: "DeepFish AI",
      },
      twitter: {
        card: "summary",
        title: `${displayName} | DeepFish AI`,
        description: `View ${displayName}'s profile on DeepFish AI`,
        images: [user.imageUrl || "/yumemonos/1.png"],
        creator: "@deepfishlol",
      },
    };
  } catch (error) {
    console.error("Failed to generate metadata for user:", error);
    return {
      title: "User Profile | DeepFish",
      description: "View user profile on DeepFish",
    };
  }
}

const UserPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const userId = Number(id);

  const user = await staticServerApi.user.getUserById.query(userId);

  if (!user) {
    redirect("/");
  }

  const userFlows =
    await staticServerApi.flow.listUserPublicFlows.query(userId);
  const userWorkflows =
    await staticServerApi.workflow.getUserPublicWorkflows.query(userId);

  return (
    <UserPageClient
      initialUser={user}
      initialFlows={userFlows}
      initialWorkflows={userWorkflows}
      userId={userId}
    />
  );
};

export default UserPage;
