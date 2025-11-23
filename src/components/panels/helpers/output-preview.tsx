import Model from "~/components/3d/model";
import { Float } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import { Center } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Box, Film, ImageIcon, Loader, Music } from "lucide-react";
import React, { Suspense } from "react";
import type { OutputType } from "~/hooks/workflow-runs";

// Compatible interface for both old GenerationItem and new workflow run format
export interface GenerationItem {
  id: string;
  workflowName: string;
  inputPrompt?: string;
  outputData: string;
  outputType: OutputType;
  createdAt: Date | string;
  metadata?: {
    workflowSettings?: Record<string, any>;
    processingTime?: number;
    type?: OutputType;
  };
}

// Error boundary for 3D rendering
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const getOutputData = (item: GenerationItem): string => {
  const output = item.outputData || "";

  return output;
};

export const getOutputInfo = (
  item: GenerationItem,
): { icon: React.ReactNode; extension: string } => {
  const outputType = item.outputType || "image";

  switch (outputType) {
    case "video":
      return {
        icon: <Film className="text-text-muted" size={32} />,
        extension: "mp4",
      };
    case "3d":
      return {
        icon: <Box className="text-text-muted" size={32} />,
        extension: "glb",
      };
    case "text":
      return {
        icon: <ImageIcon className="text-text-muted" size={32} />,
        extension: "txt",
      };
    case "audio":
      return {
        icon: <Music className="text-text-muted" size={32} />,
        extension: "wav",
      };
    default:
      return {
        icon: <ImageIcon className="text-text-muted" size={32} />,
        extension: "png",
      };
  }
};

export default function OutputPreview({ item }: { item: GenerationItem }) {
  const outputData = getOutputData(item);

  if (!outputData) {
    return (
      <div className={"flex h-full items-center justify-center"}>
        {getOutputInfo(item).icon}
      </div>
    );
  }

  switch (item.outputType) {
    case "video":
      return (
        <video
          src={outputData}
          className={"h-full w-full object-contain"}
          controls
        />
      );
    case "3d":
      if (outputData.endsWith(".glb")) {
        return (
          <div className={"relative h-full w-full"}>
            <ErrorBoundary
              fallback={
                <div className={"flex h-full items-center justify-center"}>
                  <Box className="text-text-muted" size={32} />
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="text-text-secondary flex h-full items-center justify-center">
                    <Loader className="animate-spin" size={24} />
                  </div>
                }
              >
                <Canvas
                  key={outputData}
                  camera={{ position: [0, 0, 10], fov: 50 }}
                  dpr={[1, 2]}
                  style={{ background: "black" }}
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
                      <Model src={outputData} />
                    </Float>
                    {/* @ts-ignore */}
                    <ambientLight intensity={2} />
                    {/* @ts-ignore */}
                    <spotLight
                      position={[10, 10, 10]}
                      angle={0.15}
                      penumbra={1}
                    />
                    {/* @ts-ignore */}
                    <pointLight position={[-10, -10, -10]} />
                  </Center>
                </Canvas>
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      }
      return (
        <div className={"flex h-full items-center justify-center"}>
          <Box className="text-text-muted" size={32} />
        </div>
      );
    case "text":
      return (
        <div
          className={
            "bg-surface-primary text-text-default max-h-full overflow-y-auto p-2 font-mono text-xs select-auto"
          }
        >
          {outputData}
        </div>
      );
    case "audio":
      return (
        <div className="bg-surface-primary flex h-full items-center justify-center">
          <audio src={outputData} controls className="w-full" />
        </div>
      );
    default:
      return (
        <img
          src={outputData}
          alt={item.workflowName}
          className={"h-full w-full object-contain"}
        />
      );
  }
}
