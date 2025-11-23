"use client";

import Model from "~/components/3d/model";
import { Float } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import { Center } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Download, Loader } from "lucide-react";
import { Suspense } from "react";
import AudioPlayer from "./audio-player";
import { downloadFile } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { WorkflowInfo } from "~/server/db/schema";

export default function WorkflowOutput({
  result,
  workflow,
  outputAssetSrc,
}: {
  result: {
    type?: string;
    outputPath?: string | string[];
    processingTime?: number;
  } | null;
  workflow: WorkflowInfo;
  outputAssetSrc: string;
}) {
  return (
    <div className="w-full">
      {result?.type === "video" || workflow?.outputType === "video" ? (
        <div className="relative">
          <video
            key={outputAssetSrc}
            src={outputAssetSrc}
            controls
            className="border-border-default mx-auto max-h-[25vh] w-full rounded-none border object-contain"
            onError={(e) =>
              console.error(`Failed to load video asset: ${outputAssetSrc}`, e)
            }
          />
        </div>
      ) : (result?.type === "3d" || workflow?.outputType === "3d") &&
        outputAssetSrc &&
        outputAssetSrc.endsWith(".glb") ? (
        <div
          className="border-border-default rounded-none border"
          style={{ height: "400px" }}
        >
          <Suspense
            fallback={
              <div className="text-text-secondary flex h-full items-center justify-center">
                <Loader className="animate-spin" size={24} />
              </div>
            }
          >
            <Canvas
              key={outputAssetSrc}
              camera={{ position: [0, 0, 10], fov: 50 }}
              dpr={[1, 2]}
            >
              {/* @ts-ignore - Background color */}
              <color attach="background" args={["#000000"]} />
              <Center>
                <OrbitControls
                  enableZoom={true}
                  minDistance={2}
                  maxDistance={20}
                  makeDefault
                />
                <Float speed={2} rotationIntensity={0.4} floatIntensity={1}>
                  <Model src={outputAssetSrc} />
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
      ) : result?.type === "image" || workflow?.outputType === "image" ? (
        <div className="relative">
          <img
            key={outputAssetSrc}
            src={outputAssetSrc}
            alt="Result"
            className="border-border-default mx-auto max-h-[25vh] w-full rounded-none border object-contain"
            onError={(e) =>
              console.error(`Failed to load image asset: ${outputAssetSrc}`, e)
            }
          />
        </div>
      ) : result?.type === "audio" || workflow?.outputType === "audio" ? (
        <div className="relative">
          <div className="border-border-default bg-surface-primary w-full rounded-none border p-3">
            <h3 className="mb-2 font-mono text-xs">Generated Audio</h3>
            <AudioPlayer audioSrc={outputAssetSrc} />
          </div>
        </div>
      ) : (
        <div className="bg-surface-primary border-border-default max-h-[25vh] overflow-y-auto rounded-none border p-4">
          <pre className="font-mono text-xs whitespace-pre-wrap select-all">
            {result?.outputPath}
          </pre>
        </div>
      )}

      <div className="mt-4 flex w-full items-center justify-between">
        <div className="text-text-muted font-mono text-xs">
          Generated in {(result?.processingTime ?? 0) / 1000}s
        </div>
        <Button
          size="sm"
          className="flex h-8 items-center gap-1 rounded-none border border-green-500/30 bg-green-500/10 px-3 font-mono text-xs text-green-400 hover:bg-green-500/20"
          onClick={() => downloadFile(outputAssetSrc)}
        >
          <Download size={13} /> Download
        </Button>
      </div>
    </div>
  );
}
