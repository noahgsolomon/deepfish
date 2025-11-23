"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  CheckCircle,
  ArrowLeft,
  Crown,
  Coins,
  Gift,
  InfinityIcon,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useUser } from "~/hooks/auth";

function PurchaseSuccessPageInner() {
  const searchParams = useSearchParams();
  const [purchaseType, setPurchaseType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  const { data: user } = useUser();

  useEffect(() => {
    const initPurchase = async () => {
      try {
        const type = searchParams?.get("type");
        const qtyParam = searchParams?.get("quantity");

        if (!type) {
          setError("Invalid purchase parameters");
          setIsLoading(false);
          return;
        }

        setPurchaseType(type);
        if (qtyParam) {
          setQuantity(parseInt(qtyParam, 10));
        }

        // Set current balance from user data
        if (user?.creditBalance !== undefined) {
          setCurrentBalance(user.creditBalance);
        }

        // Trigger confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
        };

        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(interval);
            return;
          }

          const particleCount = 50 * (timeLeft / duration);

          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);

        setIsLoading(false);
      } catch (err) {
        console.error("Purchase result error:", err);
        setError("Something went wrong processing your purchase");
        setIsLoading(false);
      }
    };

    initPurchase();
  }, [searchParams, user]);

  const getPurchaseInfo = () => {
    if (!purchaseType) return null;

    if (purchaseType === "subscription") {
      return {
        icon: <Crown className="h-16 w-16 text-yellow-400" />,
        title: "Welcome to DeepFish PRO!",
        subtitle: "Your subscription is now active",
        description: "You now have unlimited access to all features",
        features: [
          "Unlimited generations",
          "Priority processing",
          "Access to all models",
          "Advanced features",
        ],
      };
    }

    if (purchaseType === "credits") {
      const creditAmount = quantity * 100;
      return {
        title: "Credits Added Successfully!",
        subtitle: `+${creditAmount} credits`,
        description: `Your new balance: ${currentBalance} credits`,
        features: [`${creditAmount} credits have been added to your account`],
      };
    }

    if (purchaseType === "gift") {
      const creditAmount = quantity * 100;
      return {
        icon: <Gift className="h-16 w-16 text-blue-400" />,
        title: "Gift Purchased Successfully!",
        subtitle: `${creditAmount} credit gift`,
        description: "Your gift link has been created",
        features: [
          `Gift contains ${creditAmount} credits`,
          "Share the link with your recipient",
          "They can claim it anytime",
        ],
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Card className="bg-surface-secondary border-border-default mx-4 w-full max-w-md">
          <CardContent className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-text-secondary font-mono text-sm">
                Processing your purchase...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Card className="bg-surface-secondary border-border-default mx-4 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-400">
              <AlertCircle className="h-6 w-6" />
              Purchase Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary text-center font-mono text-sm">
              {error}
            </p>
            <Link href="/dashboard" className="block">
              <Button variant="default" className="w-full font-mono">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const purchaseInfo = getPurchaseInfo();

  if (!purchaseInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Card className="bg-surface-secondary border-border-default mx-4 w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-text-secondary text-center font-mono text-sm">
              Invalid purchase type
            </p>
            <Link href="/dashboard" className="mt-4 block">
              <Button variant="default" className="w-full font-mono">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="bg-surface-secondary border-border-default w-full max-w-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">{purchaseInfo.icon}</div>
          <div className="space-y-2">
            <CardTitle className="font-mono text-2xl text-white">
              {purchaseInfo.title}
            </CardTitle>
            <p className="font-mono text-lg text-green-400">
              {purchaseInfo.subtitle}
            </p>
            <p className="text-text-secondary font-mono text-sm">
              {purchaseInfo.description}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-surface-tertiary border-border-subtle rounded-lg border p-4">
            <div className="space-y-2">
              {purchaseInfo.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  <span className="text-text-emphasis font-mono text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/dashboard" className="block">
              <Button variant="default" className="w-full font-mono">
                Go to Dashboard0
              </Button>
            </Link>
            {purchaseType === "subscription" && (
              <Link href="/pricing" className="block">
                <Button
                  variant="outline"
                  className="border-border-default hover:border-border-strong w-full font-mono"
                >
                  View Subscription Details
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PurchaseResultClient() {
  return (
    <Suspense>
      <PurchaseSuccessPageInner />
    </Suspense>
  );
}
