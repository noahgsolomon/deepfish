import { Suspense } from "react";
import SyncContent from "./wrapper";

export const dynamic = "force-dynamic";

export default function SyncPage() {
  return (
    <Suspense>
      <SyncContent />
    </Suspense>
  );
}
