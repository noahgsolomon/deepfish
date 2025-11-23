import { createTRPCRouter, protectedProcedure } from "~/server/api/init";
import { z } from "zod";
import { put } from "@vercel/blob";

// Shared upload function that can be used by both TRPC and server-side code
export async function uploadToBlob({
  base64,
  flowId,
  folder,
  contentType: providedContentType,
  extension: providedExtension,
}: {
  base64: string;
  flowId: string;
  folder?: string;
  contentType?: string;
  extension?: string;
}): Promise<{ url: string }> {
  // Strip metadata if present
  const [metadata, data] = base64.split(",");
  if (!data) throw new Error("Invalid base64 string");

  // Try to extract content type from data URI if not provided
  let contentType = providedContentType;
  if (!contentType && metadata) {
    const match = metadata.match(/data:([^;]+)/);
    if (match) {
      contentType = match[1];
    }
  }

  // Default to octet-stream if still no content type
  contentType = contentType || "application/octet-stream";
  console.log("contentType", contentType);

  // Determine extension from content type if not provided
  let extension = providedExtension;
  console.log("extension", extension);

  if (!extension) {
    switch (contentType) {
      case "image/png":
        extension = "png";
        break;
      case "image/jpeg":
      case "image/jpg":
        extension = "jpg";
        break;
      case "image/gif":
        extension = "gif";
        break;
      case "image/webp":
        extension = "webp";
        break;
      case "video/mp4":
        extension = "mp4";
        break;
      case "video/webm":
        extension = "webm";
        break;
      case "audio/mpeg":
      case "audio/mp3":
        extension = "mp3";
        break;
      case "audio/wav":
        extension = "wav";
        break;
      case "audio/ogg":
        extension = "ogg";
        break;
      case "model/gltf-binary":
        extension = "glb";
        break;
      default:
        extension = "bin"; // binary file
    }
  }

  const buffer = Buffer.from(data, "base64");

  const fileName = `${folder ?? "thumbnails"}/${flowId}.${extension}`;

  const res = await put(fileName, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
    allowOverwrite: true,
  });

  const assetUrl = process.env.ASSET_URL;
  const blobUrl = process.env.BLOB_URL;
  if (assetUrl && blobUrl) {
    return {
      url: res.url.replace(blobUrl, assetUrl),
    };
  }

  return { url: res.url };
}
