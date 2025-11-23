"use client";

import { useState } from "react";
import { useToast } from "~/hooks/use-toast";
import { useModalStore } from "~/store/use-modal-store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useTRPC } from "~/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gift, Clock, User, Trash2, Copy } from "lucide-react";
import Image from "next/image";

interface GiftCardProps {
  gift: any;
  type: "sent" | "claimed";
  onClaim?: (uuid: string) => void;
  onCancel?: (giftId: number) => void;
  isClaimLoading?: boolean;
  isCancelLoading?: boolean;
  onCopyLink?: (uuid: string) => void;
  cancelingGiftId?: number | null;
}

function GiftCard({
  gift,
  type,
  onClaim,
  onCancel,
  isClaimLoading,
  isCancelLoading,
  onCopyLink,
  cancelingGiftId,
}: GiftCardProps) {
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="bg-surface-tertiary border-border-default border p-4">
      <div className="flex gap-4">
        {/* gift image */}
        <div className="flex-shrink-0">
          <img
            src={gift.imageUrl || "/stamp.png"}
            alt="Gift image"
            className="border-border-subtle h-16 w-16 rounded-none border object-cover"
          />
        </div>

        {/* gift info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {type === "claimed" && (
                <Image
                  src={gift.sender.imageUrl || "/yumemonos/1.png"}
                  alt="Sender avatar"
                  width={24}
                  height={24}
                  className="border-border-default h-6 w-6 rounded-none border"
                />
              )}
              <div>
                <div className="font-mono text-sm">
                  {type === "claimed"
                    ? `From: ${gift.sender.firstName} ${gift.sender.lastName}`
                    : `Gift: ${gift.uuid.slice(0, 8)}...`}
                </div>
                <div className="text-text-secondary font-mono text-xs">
                  {formatDate(gift.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="border border-pink-500/50 bg-pink-500/30 px-2 py-1 font-mono text-sm text-pink-400">
                {gift.credits} credits
              </div>
              {type === "sent" && gift.status === "pending" && (
                <>
                  {onCopyLink && (
                    <Button
                      onClick={() => onCopyLink(gift.uuid)}
                      className="h-8 w-8 border border-green-500/30 bg-green-500/20 p-0 font-mono text-green-400 hover:bg-green-500/30"
                      title="Copy gift link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {onCancel && (
                    <Button
                      onClick={() => onCancel(gift.id)}
                      disabled={cancelingGiftId === gift.id}
                      className="h-8 w-8 border border-red-500/30 bg-red-500/20 p-0 font-mono text-red-400 hover:bg-red-500/30"
                      title="Cancel gift"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {gift.message && (
            <div className="text-text-emphasis font-mono text-sm">
              "{gift.message}"
            </div>
          )}

          {type === "claimed" ? (
            gift.status === "pending" ? (
              <Button
                onClick={() => onClaim?.(gift.uuid)}
                disabled={isClaimLoading}
                className="h-8 w-full border border-green-500/30 bg-green-500/20 font-mono text-xs text-green-400 hover:bg-green-500/30"
              >
                {isClaimLoading ? "CLAIMING..." : "CLAIM GIFT"}
              </Button>
            ) : (
              <div className="text-text-secondary flex items-center gap-1 font-mono text-xs">
                <Clock className="h-3 w-3" />
                Claimed on {formatDate(gift.claimedAt!)}
              </div>
            )
          ) : (
            <div className="text-text-secondary flex items-center gap-1 font-mono text-xs">
              <Clock className="h-3 w-3" />
              {gift.status === "claimed"
                ? `Claimed on ${formatDate(gift.claimedAt!)}`
                : gift.status === "canceled"
                  ? `Cancelled on ${formatDate(gift.claimedAt!)}`
                  : "Pending"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GiftsHistoryModal() {
  const giftsHistoryOpen = useModalStore((s) => s.giftsHistoryOpen);
  const setGiftsHistoryOpen = useModalStore((s) => s.setGiftsHistoryOpen);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"sent" | "claimed">("sent");
  const [cancelingGiftId, setCancelingGiftId] = useState<number | null>(null);
  const trpc = useTRPC();

  const { data: sentGifts, isLoading: sentLoading } = useQuery({
    ...trpc.gift.getGifts.queryOptions({ type: "sent" }),
    enabled: giftsHistoryOpen && activeTab === "sent",
  });

  const { data: claimedGifts, isLoading: claimedLoading } = useQuery({
    ...trpc.gift.getGifts.queryOptions({ type: "claimed" }),
    enabled: giftsHistoryOpen && activeTab === "claimed",
  });

  const claimGift = useMutation(
    trpc.gift.claimGift.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Gift claimed",
          description: "You have successfully claimed your gift.",
          variant: "success",
        });
        // Refetch gifts data
        window.location.reload();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to claim gift. Please try again.",
          variant: "destructive",
        });
      },
    }),
  );

  const cancelGift = useMutation(
    trpc.gift.cancelGift.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Gift cancelled",
          description: "Your gift has been cancelled and credits returned.",
          variant: "success",
        });
        // Refetch gifts data
        window.location.reload();
        setCancelingGiftId(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to cancel gift. Please try again.",
          variant: "destructive",
        });
        setCancelingGiftId(null);
      },
    }),
  );

  const handleClaim = async (uuid: string) => {
    claimGift.mutate({ uuid });
  };

  const handleCancel = async (giftId: number) => {
    setCancelingGiftId(giftId);
    cancelGift.mutate({ giftId });
  };

  const handleCopyLink = async (uuid: string) => {
    const giftLink = `${window.location.origin}/claim/${uuid}`;
    await navigator.clipboard.writeText(giftLink);
    toast({
      title: "Copied!",
      description: "Gift link copied to clipboard",
      variant: "success",
    });
  };

  return (
    <Dialog open={giftsHistoryOpen} onOpenChange={setGiftsHistoryOpen}>
      <DialogContent className="bg-surface-primary max-h-[70vh] !w-[90vw] overflow-y-auto text-white sm:max-w-[90vw] md:!max-w-xl lg:!max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pb-2 font-mono text-base">
            <Gift className="h-4 w-4" />
            GIFT HISTORY
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "sent" | "claimed")}
        >
          <TabsList className="bg-surface-tertiary border-border-default grid w-full grid-cols-2 border">
            <TabsTrigger
              value="sent"
              className="font-mono data-[state=active]:bg-white/10"
            >
              SENT
            </TabsTrigger>
            <TabsTrigger
              value="claimed"
              className="font-mono data-[state=active]:bg-white/10"
            >
              CLAIMED
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claimed" className="mt-4 space-y-4">
            {claimedLoading ? (
              <div className="text-text-secondary text-center font-mono">
                Loading...
              </div>
            ) : claimedGifts?.length === 0 ? (
              <div className="text-text-secondary text-center font-mono">
                No gifts claimed yet
              </div>
            ) : (
              claimedGifts?.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  type="claimed"
                  onClaim={handleClaim}
                  isClaimLoading={claimGift.isPending}
                  onCopyLink={handleCopyLink}
                  cancelingGiftId={cancelingGiftId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-4">
            {sentLoading ? (
              <div className="text-text-secondary text-center font-mono">
                Loading...
              </div>
            ) : sentGifts?.length === 0 ? (
              <div className="text-text-secondary text-center font-mono">
                No gifts sent yet
              </div>
            ) : (
              sentGifts?.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  type="sent"
                  onCancel={handleCancel}
                  isCancelLoading={cancelGift.isPending}
                  onCopyLink={handleCopyLink}
                  cancelingGiftId={cancelingGiftId}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
