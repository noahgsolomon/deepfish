"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "~/hooks/use-toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Gift, ArrowLeft, Loader2, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useUser } from "~/hooks/auth";

interface ClaimGiftClientProps {
  gift: {
    id: number;
    uuid: string;
    credits: number;
    message: string | null;
    imageUrl: string | null;
    status: "pending" | "claimed" | "canceled";
    claimed: boolean;
    createdAt: Date | string;
    claimedAt: Date | string | null;
    claimedUserId: number | null;
    senderId: number;
    sender: {
      id: number;
      firstName: string | null;
      lastName: string | null;
    };
    claimedUser?: {
      id: number;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
}

export default function ClaimGiftClient({ gift }: ClaimGiftClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: user } = useUser();

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const trpc = useTRPC();

  const claimGift = useMutation(
    trpc.gift.claimGift.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Gift claimed!",
          description: "The credits have been added to your account.",
          variant: "success",
        });
        setClaiming(false);
        setClaimed(true);

        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        const confettiInterval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(confettiInterval);
            return;
          }

          const particleCount = 50 * (timeLeft / duration);

          confetti({
            angle: randomInRange(55, 125),
            spread: randomInRange(50, 70),
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });
          confetti({
            angle: randomInRange(55, 125),
            spread: randomInRange(50, 70),
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to claim gift. Please try again.",
          variant: "destructive",
        });
        setClaiming(false);
      },
    }),
  );

  const handleClaim = async () => {
    if (!user) {
      router.push("/join");
      return;
    }

    setClaiming(true);
    claimGift.mutate({ uuid: gift.uuid });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const isAlreadyClaimed = gift.status === "claimed" || gift.claimed;
  const isCanceled = gift.status === "canceled";
  const canClaim = !isAlreadyClaimed && !isCanceled && !claimed;

  if (claimed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Card className="bg-surface-secondary border-border-default mx-4 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 font-mono text-lg text-white">
              <Gift className="h-5 w-5 text-green-400" />
              GIFT CLAIMED!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="font-mono text-lg text-green-400">
              ✓ {gift.credits} credits added to your account!
            </div>
            <div className="text-text-emphasis font-mono text-sm">
              Thank you for claiming your gift from {gift.sender.firstName}{" "}
              {gift.sender.lastName}
            </div>
            <Button
              onClick={() => router.push("/")}
              className="w-full border border-blue-500/30 bg-blue-500/20 font-mono text-blue-400 hover:bg-blue-500/30"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to DeepFish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="bg-surface-secondary border-border-default w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 font-mono text-lg text-white">
            <Gift className="h-5 w-5 text-yellow-400" />
            GIFT FOR YOU
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row">
            {/* gift image */}
            <div className="flex-shrink-0">
              <div className="bg-surface-tertiary border-border-subtle w-fit rounded-none border p-2">
                <img
                  src={gift.imageUrl || "/stamp.png"}
                  alt="Gift image"
                  className="h-32 w-32 rounded-none object-cover"
                />
              </div>
            </div>

            {/* gift info */}
            <div className="flex-1 space-y-4">
              <div className="text-center md:text-left">
                <div className="mb-2 font-mono text-4xl font-bold text-yellow-400">
                  {gift.credits} CREDIT{gift.credits > 1 ? "S" : ""}
                </div>
                <div className="text-text-secondary font-mono text-sm">
                  From: {gift.sender.firstName} {gift.sender.lastName}
                </div>
                <div className="text-text-muted font-mono text-xs">
                  Created {formatDate(gift.createdAt)}
                </div>
              </div>

              {gift.message && (
                <div className="bg-surface-tertiary border-border-subtle rounded-none border p-4">
                  <div className="text-text-emphasis font-mono text-sm">
                    "{gift.message}"
                  </div>
                </div>
              )}

              {isAlreadyClaimed && (
                <div className="text-center md:text-left">
                  <div className="mb-2 font-mono text-sm text-green-400">
                    ✓ This gift has already been claimed
                  </div>
                  {gift.claimedUser && (
                    <div className="text-text-secondary font-mono text-xs">
                      Claimed by: {gift.claimedUser.firstName ?? "Anonymous"}{" "}
                      {gift.claimedUser.lastName ?? ""}
                    </div>
                  )}
                  <div className="text-text-muted font-mono text-xs">
                    Claimed on {formatDate(gift.claimedAt!)}
                  </div>
                </div>
              )}

              {isCanceled && (
                <div className="text-center md:text-left">
                  <div className="font-mono text-sm text-red-400">
                    This gift has been canceled
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push("/")}
                  className="flex-1 font-mono"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to App
                </Button>

                {canClaim && (
                  <Button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="h-8 w-8 flex-1 border border-green-500/30 bg-green-500/20 font-mono text-green-400 hover:bg-green-500/30"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        CLAIMING...
                      </>
                    ) : !user ? (
                      "SIGN IN TO CLAIM"
                    ) : (
                      "CLAIM GIFT"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
