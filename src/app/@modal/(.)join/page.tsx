"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { JoinForm } from "~/app/(home)/(auth)/join/_components/join-form";

export default function JoinModal() {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent className="border-border-default rounded-none bg-black sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-white">
            JOIN DEEPFISH AI
          </DialogTitle>
        </DialogHeader>
        <JoinForm />
      </DialogContent>
    </Dialog>
  );
}
