"use client";

import { useState } from "react";
import { useToast } from "~/hooks/use-toast";
import { useModalStore } from "~/store/use-modal-store";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { Gift, Upload } from "lucide-react";
import { useUser } from "~/hooks/auth";

export default function GiftModal() {
  const giftOpen = useModalStore((s) => s.giftOpen);
  const setGiftOpen = useModalStore((s) => s.setGiftOpen);
  const { toast } = useToast();
  const { data: user } = useUser();
  const [credits, setCredits] = useState(1);
  const [message, setMessage] = useState("");
  const [giftLink, setGiftLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const trpc = useTRPC();

  const createGift = useMutation(
    trpc.gift.createGift.mutationOptions({
      onSuccess: (data) => {
        const link = `${window.location.origin}/claim/${data.uuid}`;
        setGiftLink(link);
        toast({
          title: "Gift created",
          description: "Your gift link has been generated!",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error.message || "Failed to create gift. Please try again.",
          variant: "destructive",
        });
      },
    }),
  );

  const handleSubmit = async () => {
    if (!user) return;

    createGift.mutate({
      credits,
      message: message || undefined,
      imageUrl: imageUrl || undefined,
    });
  };

  const handleClose = () => {
    setGiftOpen(false);
    setCredits(1);
    setMessage("");
    setGiftLink("");
    setImageUrl("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const put = await uploadToBlob(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      setImageUrl(put.url);
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl("");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(giftLink);
    toast({
      title: "Copied!",
      description: "Gift link copied to clipboard",
      variant: "success",
    });
  };

  return (
    <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
      <DialogContent className="bg-surface-primary !w-[90vw] text-white sm:max-w-[90vw] md:!max-w-xl lg:!max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pb-2 font-mono text-base">
            <Gift className="h-4 w-4" />
            SEND GIFT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {giftLink ? (
            <div className="space-y-2">
              <label className="text-text-emphasis font-mono text-sm">
                Gift Link (Share this with the recipient)
              </label>
              <div className="flex gap-2">
                <Input
                  value={giftLink}
                  readOnly
                  className="bg-surface-tertiary border-border-subtle font-mono text-sm text-white"
                />
                <Button
                  onClick={copyLink}
                  className="h-9 border border-green-500/30 bg-green-500/20 px-3 font-mono text-xs text-green-400 hover:bg-green-500/30"
                >
                  Copy
                </Button>
              </div>
              <p className="text-text-secondary font-mono text-xs">
                Anyone with this link can claim the gift
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-text-emphasis font-mono text-sm">
                  Credits to Gift
                </label>
                <Input
                  type="number"
                  min={1}
                  max={user?.creditBalance || 1}
                  value={credits}
                  onChange={(e) =>
                    setCredits(
                      Math.min(
                        Number(e.target.value),
                        user?.creditBalance || 1,
                      ),
                    )
                  }
                  className="bg-surface-tertiary border-border-subtle font-mono text-sm text-white [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="text-text-secondary font-mono text-xs">
                  Your balance: {user?.creditBalance || 0} credits
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-text-emphasis font-mono text-sm">
                  Message (Optional)
                </label>
                <Textarea
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMessage(e.target.value)
                  }
                  placeholder="Add a personal message..."
                  className="bg-surface-tertiary border-border-subtle min-h-[100px] font-mono text-sm text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-text-emphasis font-mono text-sm">
                  Image (Optional)
                </label>
                {imageUrl ? (
                  <div className="group relative">
                    <img
                      src={imageUrl}
                      alt="Gift image"
                      className="border-border-subtle h-32 w-full border object-cover"
                    />
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-col items-center">
                        <Upload className="text-text-emphasis mb-1 h-5 w-5" />
                        <span className="text-text-emphasis font-mono text-xs">
                          Replace
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="border-border-subtle bg-surface-tertiary hover:bg-surface-interactive border border-dashed p-6 text-center transition-colors">
                    <label className="flex cursor-pointer flex-col items-center">
                      <Upload className="text-text-muted mb-2 h-6 w-6" />
                      <span className="text-text-secondary font-mono text-xs">
                        {isUploading ? "Uploading..." : "Upload Image"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
                <p className="text-text-secondary font-mono text-xs">
                  Add a visual to your gift (max 5MB)
                </p>
              </div>
            </>
          )}

          {giftLink ? (
            <Button
              onClick={handleClose}
              className="h-8 w-full border border-gray-500/30 bg-gray-500/20 font-mono text-xs text-gray-400 hover:bg-gray-500/30"
            >
              CLOSE
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!credits || createGift.isPending || isUploading}
              className="h-8 w-full border border-blue-500/30 bg-blue-500/20 font-mono text-xs text-blue-400 hover:bg-blue-500/30"
            >
              {createGift.isPending ? "CREATING..." : "CREATE GIFT"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
