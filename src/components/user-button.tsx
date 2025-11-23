"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useUser } from "~/hooks/auth";

function UserButtonSkeleton() {
  return (
    <div className="border-border-default flex h-6 animate-pulse items-center gap-2 rounded-none border bg-white/5 px-2 py-0.5">
      <div className="border-border-default h-5 w-5 border bg-white/10" />
      <div className="h-2 w-12 bg-white/10" />
    </div>
  );
}

export function UserButton() {
  const { data: user, isLoading: userLoading } = useUser();
  const router = useRouter();

  if (userLoading) {
    return <UserButtonSkeleton />;
  }

  if (!user) {
    return (
      <button
        onClick={() => {
          router.push("/join");
        }}
        className="no-drag flex h-6 flex-row items-center gap-1 border border-yellow-500/40 bg-yellow-500/20 px-3 py-1 font-mono text-xs text-yellow-300 transition hover:bg-yellow-500/40"
        title="Sign in to DeepFish"
      >
        <svg
          className="mr-1"
          width={16}
          height={16}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Sign In
      </button>
    );
  }

  const profileHandler = () => {
    router.push(`/user/${user.id}`);
  };

  return (
    <Button
      onClick={profileHandler}
      className="border-border-default text-text-secondary flex h-6 flex-1 items-center justify-center gap-1 border bg-white/5 pl-0.5 text-[10px] transition-colors hover:bg-white/10 hover:text-white"
      title="View Profile"
    >
      <Image
        src={user.imageUrl ?? `/yumemonos/1.png`}
        alt="User avatar"
        width={20}
        height={20}
        className="border-border-default h-5 w-5 rounded-none border"
      />
      <span className="font-mono text-[10px] font-bold text-white">
        PROFILE
      </span>
    </Button>
  );
}
