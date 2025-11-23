"use client";

import SettingsModal from "./settings-modal";
import HistoryDetailsModal from "./history-details-modal";
import RegisterWorkflowModal from "./register-workflow-modal";
import GiftModal from "./gift-modal";
import GiftsHistoryModal from "./gifts-history-modal";

export default function Modals() {
  return (
    <>
      <SettingsModal />
      <HistoryDetailsModal />
      <RegisterWorkflowModal />
      <GiftModal />
      <GiftsHistoryModal />
    </>
  );
}

export { default as WalkthroughModal } from "./walkthrough-modal";
export { default as WelcomeCreditsModal } from "./welcome-credits-modal";
