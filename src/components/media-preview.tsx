"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Center, OrbitControls, Float } from "@react-three/drei";
import Model from "~/components/3d/model";
import AudioPlayer from "~/app/(app)/workflow/_components/audio-player";

export type MediaType = "audio" | "video" | "image" | "3d" | "text" | "unknown";

interface MediaPreviewProps {
  /** Source URL or data URI of the media */
  src: string;
  /** Optional explicit type hint. If omitted we try to infer from the src */
  typeHint?: MediaType;
  /** Optional extra Tailwind classes applied to the underlying element */
  className?: string;
}

/**
 * Lightweight preview of image, audio, or video assets. Chooses the appropriate
 * HTML element automatically based on the data-URI mime type or file
 * extension when `typeHint` is not provided.
 */
export default function MediaPreview({
  src,
  typeHint,
  className = "w-full bg-black object-contain",
}: MediaPreviewProps) {
  if (!src) return null;

  const detectType = (s: string): MediaType => {
    if (typeHint && typeHint !== "unknown") return typeHint as MediaType;

    // check data URI
    const dataRegex = /^data:([^;]+);/;
    const dataMatch = dataRegex.exec(s);
    if (dataMatch) {
      const mime = dataMatch[1];
      if (mime.startsWith("audio")) return "audio";
      if (mime.startsWith("video")) return "video";
      if (mime.startsWith("image")) return "image";
    }

    const lower = s.toLowerCase();
    if (/\.(wav|mp3|ogg|flac)(\?|$)/.test(lower)) return "audio";
    if (/\.(mp4|mov|webm)(\?|$)/.test(lower)) return "video";
    if (/\.(png|jpe?g|gif|webp)(\?|$)/.test(lower)) return "image";
    if (/\.glb(\?|$)/.test(lower)) return "3d";
    if (
      !s.startsWith("http://") &&
      !s.startsWith("https://") &&
      !s.startsWith("data:")
    ) {
      return "text";
    }

    return "unknown";
  };

  const mediaType = detectType(src);

  switch (mediaType) {
    case "audio":
      return (
        <div
          className={
            className.replace("object-contain", "") +
            " bg-surface-primary border-border-default border p-3"
          }
        >
          <h3 className="mb-2 font-mono text-xs">Generated Audio</h3>
          <AudioPlayer audioSrc={src} />
        </div>
      );
    case "video":
      return (
        <video controls src={src} className={className}>
          Your browser does not support the video tag.
        </video>
      );
    case "image":
      return <img src={src} className={className} alt="Media preview" />;
    case "3d":
      return (
        <div className={className} style={{ height: "300px" }}>
          <Suspense
            fallback={
              <div className="text-text-secondary flex h-full items-center justify-center text-xs">
                Loading 3D model...
              </div>
            }
          >
            <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 2]}>
              {/* @ts-ignore - threejs color attach */}
              <color attach="background" args={["#000000"]} />
              <Center>
                <OrbitControls
                  enableZoom={true}
                  minDistance={2}
                  maxDistance={20}
                  makeDefault
                />
                <Float speed={2} rotationIntensity={0.4} floatIntensity={1}>
                  <Model src={src} />
                </Float>
                {/* @ts-ignore */}
                <ambientLight intensity={2} />
                {/* @ts-ignore */}
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                {/* @ts-ignore */}
                <pointLight position={[-10, -10, -10]} />
              </Center>
            </Canvas>
          </Suspense>
        </div>
      );
    case "text":
      return (
        <div className="bg-surface-primary border-border-default rounded-none border p-4">
          <pre className="font-mono text-xs whitespace-pre-wrap">{src}</pre>
        </div>
      );
    default:
      // unknown type – just render a link
      return (
        <a
          href={src}
          className="text-xs break-all text-blue-400 underline"
          target="_blank"
          rel="noreferrer"
        >
          {src}
        </a>
      );
  }
}
