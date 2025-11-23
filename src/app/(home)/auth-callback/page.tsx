import { Suspense } from "react";
import AuthCallbackContent from "./wrapper";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}
