import { redirect } from "next/navigation";
import { trpcServerCaller } from "~/trpc/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caller = await trpcServerCaller();
  const user = await caller.user.getUser();
  if (!user) {
    redirect("/");
  }
  return children;
}
