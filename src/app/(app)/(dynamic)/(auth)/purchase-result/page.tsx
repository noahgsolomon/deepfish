import PurchaseResultClient from "./page-client";

// Force dynamic rendering since this page handles payment results
export const dynamic = "force-dynamic";

export default function PurchaseResultPage() {
  return <PurchaseResultClient />;
}
