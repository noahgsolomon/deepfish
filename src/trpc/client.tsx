"use client";

import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "~/server/api/routers/_app";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export function getUrl() {
  const base = process.env.NEXT_PUBLIC_BASE_URL;

  // In development or when BASE_URL is not set, use relative URL
  if (!base) {
    return "/api/trpc";
  }

  // Ensure the base URL doesn't have a trailing slash
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${cleanBase}/api/trpc`;
}
