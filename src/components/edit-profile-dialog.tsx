"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useUser } from "@clerk/nextjs";
import { toast } from "~/hooks/use-toast";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";

export function EditProfileDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const trpc = useTRPC();

  const updateUser = useMutation(
    trpc.user.updateUser.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        onClose();
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "message" in error
            ? (error as { message?: string }).message || ""
            : "Failed to update profile";
        toast({
          title: "Error",
          description: message || "Failed to update profile",
          variant: "destructive",
        });
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateUser.mutate({
      firstName,
      lastName,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-none border-white bg-black sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-white">
            EDIT PROFILE
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-mono text-white">EMAIL</Label>
            <Input
              type="email"
              value={user?.emailAddresses[0]?.emailAddress || ""}
              disabled
              className="rounded-none border-white bg-black font-mono text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-white">FIRST NAME</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-none border-white bg-black font-mono text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-white">LAST NAME</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-none border-white bg-black font-mono text-white"
            />
          </div>
          <Button
            type="submit"
            disabled={updateUser.isPending}
            className="w-full rounded-none bg-white font-mono text-black hover:bg-white/90"
          >
            {updateUser.isPending ? "SAVING..." : "SAVE CHANGES"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
