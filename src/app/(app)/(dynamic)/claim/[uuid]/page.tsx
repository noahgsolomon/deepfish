import { notFound } from "next/navigation";
import { trpcServerCaller } from "~/trpc/server";
import ClaimGiftClient from "./page-client";

// Force dynamic rendering since we need to fetch gift data
export const dynamic = "force-dynamic";

export default async function ClaimGiftPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const caller = await trpcServerCaller();

  try {
    const gift = await caller.gift.getGiftByUuid({ uuid });

    if (!gift) {
      notFound();
    }

    return <ClaimGiftClient gift={gift} />;
  } catch (error) {
    notFound();
  }
}
