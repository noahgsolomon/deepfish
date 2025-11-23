"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "~/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";

const FormSchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

interface OneTimePasswordProps {
  attempt: any; // This should be properly typed with Clerk's types
}

export default function OneTimePassword({ attempt }: OneTimePasswordProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: "",
    },
  });

  const pin = useWatch({
    control: form.control,
    name: "pin",
  });

  const { setActive } = useClerk();

  useEffect(() => {
    if (pin.length === 6) {
      form.handleSubmit(onSubmit)();
    }
  }, [pin]);

  // ---------- DEBUG HELPERS ----------
  useEffect(() => {
    console.log("[OTP] Component mounted", {
      attemptStatus: attempt?.status,
      attemptObj: attempt,
    });

    return () => {
      console.log("[OTP] Component unmounted");
    };
  }, []);

  // Capture mutation lifecycle events for syncUser
  const trpc = useTRPC();
  const syncUser = useMutation(
    trpc.user.syncUser.mutationOptions({
      onMutate: () => {
        console.log("[OTP] syncUser.mutate() called");
      },
      onSuccess: (data) => {
        console.log("[OTP] syncUser SUCCESS", data);
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      },
      onError: (error: unknown) => {
        console.error("[OTP] syncUser ERROR", error);
      },
    }),
  );

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log("[OTP] onSubmit triggered", data);
    try {
      let verificationResult;

      console.log("[OTP] Attempt status", attempt.status);

      if (attempt.status === "needs_first_factor") {
        console.log("[OTP] attemptFirstFactor() calling");
        verificationResult = await attempt.attemptFirstFactor({
          strategy: "email_code",
          code: data.pin,
        });
      } else {
        console.log("[OTP] attemptEmailAddressVerification() calling");
        verificationResult = await attempt.attemptEmailAddressVerification({
          code: data.pin,
        });
      }

      console.log("[OTP] Verification result", verificationResult);

      if (verificationResult?.status === "complete") {
        try {
          console.log("Verification Result:", verificationResult);
          console.log("Attempt Object:", attempt);

          const sessionId =
            verificationResult.createdSessionId || verificationResult.sessionId;
          if (!sessionId) {
            console.warn("[OTP] No sessionId returned from verificationResult");
          }

          console.log("[OTP] Calling syncUser.mutateAsync() ...");
          if (sessionId) {
            console.log("[OTP] setActive with session", sessionId);
            try {
              await setActive({ session: sessionId });
            } catch (e) {
              console.error("[OTP] setActive error", e);
            }
          }

          syncUser.mutate();
        } catch (err) {
          console.error("[OTP] Error during verification->sync pipeline", err);
          console.error("Failed to sync user:", err);
          toast({
            title: "Error",
            description: "Failed to sync user",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error("[OTP] onSubmit top-level error", err);
      toast({
        title: "Error",
        description: "Invalid code",
        variant: "destructive",
      });
      form.setValue("pin", "");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col items-center justify-center gap-2"
      >
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col items-center justify-center gap-2">
              <FormLabel className="font-mono text-white">
                Enter the code sent to your email.
              </FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 border-l bg-black text-lg text-white"
                      index={0}
                    />
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 bg-black text-lg text-white"
                      index={1}
                    />
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 bg-black text-lg text-white"
                      index={2}
                    />
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 bg-black text-lg text-white"
                      index={3}
                    />
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 bg-black text-lg text-white"
                      index={4}
                    />
                    <InputOTPSlot
                      className="border-border-default h-16 w-16 bg-black text-lg text-white"
                      index={5}
                    />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
