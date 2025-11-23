"use client";

import { useEffect } from "react";
import { useFlowStore } from "~/store/use-flow-store";
import WalkthroughModal from "~/components/modals/walkthrough-modal";
import WelcomeCreditsModal from "~/components/modals/welcome-credits-modal";
import { useUser } from "~/hooks/auth";

export default function Initialize() {
  const dirty = useFlowStore((s) => s.dirty);
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    const hasDirtyItems = Object.values(dirty).some(Boolean);

    if (hasDirtyItems) {
      window.onbeforeunload = () =>
        "You have unsaved changes. Are you sure you want to leave?";
    } else {
      window.onbeforeunload = null;
    }

    return () => {
      window.onbeforeunload = null;
    };
  }, [dirty]);

  const showTour = user && !isLoading && !user.completedWalkthrough;

  return (
    <>
      {/* {showSignIn && <WebSignInOverlay />} */}
      {showTour && <WalkthroughModal open />}
      <WelcomeCreditsModal
        open={!!user && !showTour && !user.claimedFreeCredits}
      />
    </>
  );
}
