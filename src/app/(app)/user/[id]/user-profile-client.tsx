"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Pencil, X, Save, Calendar, Gift } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import UploadSquare from "~/components/icons/upload-square";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { nanoid } from "nanoid";
import { useModalStore } from "~/store/use-modal-store";
import { useTRPC } from "~/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useUpdateUser } from "~/hooks/auth";
import { upload as uploadToBlob } from "@vercel/blob/client";

interface UserProfileClientProps {
  user: {
    id: number;
    imageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  };
  totalRuns: number;
  isCurrentUser: boolean;
}

export default function UserProfileClient({
  user,
  totalRuns,
  isCurrentUser,
}: UserProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [imageUrl, setImageUrl] = useState(user.imageUrl || "/yumemonos/1.png");
  const [isUploading, setIsUploading] = useState(false);
  const setGiftsHistoryOpen = useModalStore((s) => s.setGiftsHistoryOpen);
  const trpc = useTRPC();

  const { toast } = useToast();

  const updateUser = useUpdateUser({
    meta: {
      successToast: {
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      },
      errorToast: {
        title: "Error",
        description: "Failed to update profile. Please try again.",
      },
    },
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
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

  const handleSave = async () => {
    if (updateUser.isPending) return;

    updateUser.mutate({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      imageUrl: imageUrl !== user.imageUrl ? imageUrl : undefined,
    });
  };

  const handleCancel = () => {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setImageUrl(user.imageUrl || "/yumemonos/1.png");
    setIsEditing(false);
  };

  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : "Anonymous";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {isEditing ? (
          <>
            <div className="group relative">
              <Image
                src={imageUrl}
                alt="User avatar"
                width={48}
                height={48}
                className="border-border-default h-12 w-12 rounded-none border"
              />
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <UploadSquare size={20} className="text-text-emphasis" />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="font-mono text-sm"
                />
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
              <Button
                size="icon"
                onClick={handleSave}
                disabled={updateUser.isPending || isUploading}
                className="h-8 w-8 border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              >
                <Save size={16} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <Image
              src={imageUrl}
              alt="User avatar"
              width={48}
              height={48}
              className="border-border-default h-12 w-12 rounded-none border"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-2xl font-bold">
                  {displayName}
                  {isCurrentUser && (
                    <span className="text-text-muted text-lg"> (Me)</span>
                  )}
                </h2>
                {isCurrentUser && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="ml-1 h-6 w-6 border border-yellow-500/50 bg-yellow-500/20 text-yellow-300"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => setGiftsHistoryOpen(true)}
                      className="h-6 w-6 border border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-400"
                    >
                      <Gift size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 border border-blue-500/50 bg-blue-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-blue-400">
          <Play className="h-3 w-3" />
          {totalRuns} run{totalRuns === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 border border-green-500/50 bg-green-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-green-400">
          <Calendar className="size-3" />
          Joined {user.createdAt.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
