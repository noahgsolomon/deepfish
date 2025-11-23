"use client";

import { useEffect } from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";

export default function AuthCallback() {
  const { isSignedIn } = useUser();
  const trpc = useTRPC();
  const syncUser = useMutation(
    trpc.user.syncUser.mutationOptions({
      onSuccess: () => {
        const from = searchParams.get("from");
        window.location.href = from ? `/${from.replace(/^\//, "")}` : "/";
      },
    }),
  );

  const searchParams = useSearchParams();

  useEffect(() => {
    if (isSignedIn) {
      syncUser.mutate();
    }
  }, [isSignedIn]);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center">
        <div>
          <p>Syncing user</p>
        </div>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={`/sync${
          searchParams.get("from") ? `?from=${searchParams.get("from")}` : ""
        }`}
        continueSignUpUrl={`/sync${
          searchParams.get("from") ? `?from=${searchParams.get("from")}` : ""
        }`}
        redirectUrl={`/sync${
          searchParams.get("from") ? `?from=${searchParams.get("from")}` : ""
        }`}
        afterSignInUrl={`/sync${
          searchParams.get("from") ? `?from=${searchParams.get("from")}` : ""
        }`}
        afterSignUpUrl={`/sync${
          searchParams.get("from") ? `?from=${searchParams.get("from")}` : ""
        }`}
      />
    </>
  );
}
