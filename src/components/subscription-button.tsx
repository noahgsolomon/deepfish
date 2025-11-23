"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  createCheckoutSession,
  createPortalSession,
} from "~/lib/stripe-client";
import { useToast } from "~/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SubscriptionButtonProps {
  isSubscribed: boolean;
  priceId: string;
}

export function SubscriptionButton({
  isSubscribed,
  priceId,
}: SubscriptionButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscription = async () => {
    try {
      setIsLoading(true);

      if (isSubscribed) {
        // Open customer portal to manage subscription
        const portalUrl = await createPortalSession();
        window.location.href = portalUrl;
      } else {
        // Create new subscription
        const checkoutUrl = await createCheckoutSession(priceId);
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process subscription request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSubscription}
      disabled={isLoading}
      variant={"rainbow"}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isSubscribed ? "Manage Subscription" : "Subscribe"}
    </Button>
  );
}
