import { redirect } from "next/navigation";
import { NavBar } from "~/components/nav-bar";
import { trpcServerCaller } from "~/trpc/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const caller = await trpcServerCaller();
  const user = await caller.user.getUser();
  if (user) {
    redirect("/dashboard");
  }
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
