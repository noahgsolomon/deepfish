"use client";

import { useToast } from "~/hooks/use-toast";
import { useModalStore } from "~/store/use-modal-store";
import {
  EyeIcon,
  EyeOffIcon,
  Coins,
  Calendar,
  CreditCard,
  Plus,
  Minus,
  Gift,
  Infinity as InfinityIcon,
  Crown,
  Headphones,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "~/hooks/auth";

export default function SettingsModal() {
  const settingsOpen = useModalStore((s) => s.settingsOpen);
  const setSettingsOpen = useModalStore((s) => s.setSettingsOpen);
  const setGiftOpen = useModalStore((s) => s.setGiftOpen);
  const { toast } = useToast();
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("billing");
  const [creditPackQuantity, setCreditPackQuantity] = useState(1);
  const trpc = useTRPC();

  const createCheckoutSession = useMutation(
    trpc.stripe.createCheckoutSession.mutationOptions({
      onSuccess: ({ url }: { url: string | null }) => {
        if (url) {
          window.open(url, "_blank");
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to start subscription process",
          variant: "destructive",
        });
      },
    }),
  );

  const createPaymentSession = useMutation(
    trpc.stripe.createPaymentSession.mutationOptions({
      onSuccess: ({ url }: { url: string | null }) => {
        if (url) {
          window.open(url, "_blank");
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to start payment process",
          variant: "destructive",
        });
      },
    }),
  );

  const createPortalSession = useMutation(
    trpc.stripe.createPortalSession.mutationOptions({
      onSuccess: ({ url }: { url: string | null }) => {
        if (url) {
          window.open(url, "_blank");
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to open billing portal",
          variant: "destructive",
        });
      },
    }),
  );

  const handleSubscribe = async (priceId: string) => {
    createCheckoutSession.mutate({ priceId });
  };

  const handleBuyCredits = async (priceId: string) => {
    createPaymentSession.mutate({ priceId, quantity: creditPackQuantity });
  };

  const handleManageSubscription = async () => {
    createPortalSession.mutate();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const subscriptionPriceId =
    process.env.NODE_ENV === "production"
      ? "price_1RWnLlInwFcDVnE4IsIi18sj"
      : "price_1RYAkOInwFcDVnE4yxXSK0wa";
  const oneTimePriceId =
    process.env.NODE_ENV === "production"
      ? "price_1RYA9PInwFcDVnE4XLakZP90"
      : "price_1RYAkdInwFcDVnE4l4HA0RIo";

  const handleGiftClick = () => {
    console.log("Gift button clicked");
    setGiftOpen(true);
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="bg-surface-primary max-h-[70vh] !w-[90vw] overflow-y-auto text-white sm:max-w-[90vw] md:h-[625px] md:!max-w-xl lg:!max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="pb-2 font-mono text-base">
            SETTINGS
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/*<TabsList className="bg-surface-tertiary border-border-default grid w-full grid-cols-2 border">
            <TabsTrigger
              value="billing"
              className="font-mono data-[state=active]:bg-white/10"
            >
              BILLING
            </TabsTrigger>
          </TabsList>*/}

          <TabsContent
            value="billing"
            className="relative mt-4 flex min-h-[450px] flex-col gap-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="bg-surface-secondary border-border-default flex flex-col">
                <CardHeader className="flex-shrink-0 pb-2">
                  <CardTitle className="font-mono text-sm text-white">
                    Monthly Plan
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white">$29.99</span>
                    <span className="text-text-secondary font-mono text-xs">
                      /month
                    </span>
                  </div>
                  <CardDescription className="text-text-secondary font-mono text-xs">
                    Full access to all features
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pt-0 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-yellow-500/50 bg-yellow-500/30 px-1.5 py-0.5 font-mono text-xs text-yellow-400">
                      <Coins className="h-3 w-3" />
                      200 credits
                    </span>
                    <span className="inline-flex items-center gap-1 border border-purple-500/50 bg-purple-500/30 px-1.5 py-0.5 font-mono text-xs text-purple-400">
                      <Crown className="h-3 w-3" />
                      Premium models
                    </span>
                    <span className="inline-flex items-center gap-1 border border-orange-500/50 bg-orange-500/30 px-1.5 py-0.5 font-mono text-xs text-orange-400">
                      <Headphones className="h-3 w-3" />
                      Priority support
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex-shrink-0 pt-0">
                  <Button
                    onClick={() => handleSubscribe(subscriptionPriceId)}
                    className="h-8 w-full border border-blue-500/30 bg-blue-500/20 font-mono text-xs text-blue-400 hover:bg-blue-500/30"
                    disabled={
                      user?.subscribed || createCheckoutSession.isPending
                    }
                  >
                    {createCheckoutSession.isPending
                      ? "LOADING..."
                      : user?.subscribed
                        ? "SUBSCRIBED"
                        : "SUBSCRIBE"}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-surface-secondary border-border-default flex flex-col">
                <CardHeader className="flex-shrink-0 pb-2">
                  <CardTitle className="font-mono text-sm text-white">
                    Credit Pack
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white">$9.99</span>
                    <span className="text-text-secondary font-mono text-xs">
                      each
                    </span>
                  </div>
                  <CardDescription className="text-text-secondary font-mono text-xs">
                    50 workflow credits per pack
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 pt-0 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-yellow-500/50 bg-yellow-500/30 px-1.5 py-0.5 font-mono text-xs text-yellow-400">
                      <Coins className="h-3 w-3" />
                      {creditPackQuantity * 50} Credits
                    </span>
                    <span className="inline-flex items-center gap-1 border border-green-500/50 bg-green-500/30 px-1.5 py-0.5 font-mono text-xs text-green-400">
                      <Clock className="h-3 w-3" />
                      Never expires
                    </span>
                    <span className="inline-flex items-center gap-1 border border-cyan-500/50 bg-cyan-500/30 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
                      <CreditCard className="h-3 w-3" />
                      One payment
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-text-emphasis font-mono text-xs">
                      Quantity:
                    </label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="default"
                          size="icon"
                          className="border-border-default h-6 w-6 border bg-white/10 font-mono hover:bg-white/20"
                          onClick={() =>
                            setCreditPackQuantity(
                              Math.max(1, creditPackQuantity - 1),
                            )
                          }
                          disabled={creditPackQuantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <span className="min-w-[2ch] text-center font-mono text-sm text-white">
                          {creditPackQuantity}
                        </span>

                        <Button
                          variant="default"
                          size="icon"
                          className="border-border-default h-6 w-6 border bg-white/10 font-mono hover:bg-white/20"
                          onClick={() =>
                            setCreditPackQuantity(
                              Math.min(10, creditPackQuantity + 1),
                            )
                          }
                          disabled={creditPackQuantity >= 10}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-text-secondary font-mono text-xs">
                        {creditPackQuantity * 50} credits
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-shrink-0 pt-0">
                  <div className="flex w-full gap-1">
                    <Button
                      onClick={() => handleBuyCredits(oneTimePriceId)}
                      className="h-8 flex-1 border border-green-500/30 bg-green-500/20 font-mono text-xs text-green-400 hover:bg-green-500/30"
                      disabled={createPaymentSession.isPending}
                    >
                      {createPaymentSession.isPending ? (
                        "LOADING..."
                      ) : (
                        <>
                          BUY{" "}
                          {creditPackQuantity > 1
                            ? `${creditPackQuantity} `
                            : ""}
                          CREDIT{creditPackQuantity > 1 ? " PACKS" : " PACK"}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleGiftClick}
                      className="h-8 w-8 flex-shrink-0 border border-fuchsia-500/30 bg-fuchsia-500/20 px-0 font-mono text-fuchsia-400 hover:bg-fuchsia-500/30"
                    >
                      <Gift className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
            <Card className="bg-surface-secondary border-border-default">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                  <CreditCard className="h-4 w-4" />
                  ACCOUNT STATUS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-text-secondary h-4 w-4" />
                    <span className="text-text-emphasis font-mono text-sm">
                      Subscription:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="focus:ring-ring border-border-default inline-flex items-center border px-2 py-0.5 font-mono text-xs font-semibold text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
                      {user?.subscribed ? "ACTIVE" : "NONE"}
                    </span>
                    {user?.subscribed && user?.stripeCurrentPeriodEnd && (
                      <span className="text-text-secondary font-mono text-xs">
                        until {formatDate(user.stripeCurrentPeriodEnd)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="text-text-secondary h-4 w-4" />
                    <span className="text-text-emphasis font-mono text-sm">
                      Credit Balance:
                    </span>
                  </div>
                  <span className="focus:ring-ring inline-flex items-center border border-yellow-500/50 px-2 py-0.5 font-mono text-xs font-semibold text-yellow-400 transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
                    {user?.creditBalance || 0} CREDITS
                  </span>
                </div>

                {user?.subscribed && (
                  <div className="pt-1">
                    <Button
                      onClick={handleManageSubscription}
                      variant="default"
                      className="border-border-default h-8 w-full font-mono text-xs text-white hover:bg-white/10"
                      disabled={createPortalSession.isPending}
                    >
                      {createPortalSession.isPending
                        ? "LOADING..."
                        : "MANAGE SUBSCRIPTION"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
