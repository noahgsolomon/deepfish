"use client";

import { useEffect } from "react";
import { useTRPC } from "~/trpc/client";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

export default function Sync() {
  const { isSignedIn } = useUser();
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const syncUser = useMutation(
    trpc.user.syncUser.mutationOptions({
      onSuccess: () => {
        const from = searchParams.get("from");
        console.log("Sync successful, redirecting to", from || "/");
        window.location.href = from ? `/${from.replace(/^\//, "")}` : "/";
      },
      onError: (error) => {
        console.error("Sync failed:", error);
      },
    }),
  );

  useEffect(() => {
    if (isSignedIn) {
      console.log("User is signed in, attempting sync");
      syncUser.mutate();
    } else {
      console.log("Waiting for user to be signed in");
    }
  }, [isSignedIn]);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center">
        <div>
          <p>Syncing user</p>
        </div>
      </div>
    </>
  );
}
