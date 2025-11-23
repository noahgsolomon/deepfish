"use client";

import React from "react";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";

// Error boundary component for handling loading failures
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Model loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Return null to show nothing when error occurs
    }
    return this.props.children;
  }
}

function ModelInner({ src }: { src: string }) {
  const [loadError, setLoadError] = useState(false);

  // Early validation
  if (!src || typeof src !== "string" || !src.endsWith(".glb")) {
    return null;
  }

  try {
    const { scene } = useGLTF(src);

    const clonedScene = useMemo(() => {
      if (scene) {
        return scene.clone();
      }
      return null;
    }, [scene]);

    useEffect(() => {
      if (clonedScene) {
        clonedScene.traverse((node: any) => {
          if (node.isMesh && node.material) {
            if (!node.material._isAdjusted) {
              node.material.metalness = 0;
              node.material.roughness = 0.4;
              node.material._isAdjusted = true;
            }
          }
        });
      }
    }, [clonedScene]);

    if (!clonedScene || loadError) {
      return null;
    }

    return (
      // @ts-expect-error - Three.js primitive type definition issue
      <primitive object={clonedScene} scale={4.5} position={[0, 0, 0]} />
    );
  } catch (error) {
    console.error("Failed to load 3D model:", error);
    return null;
  }
}

export default function Model({ src }: { src: string }) {
  // Add an additional safety wrapper
  if (!src || typeof src !== "string") {
    return null;
  }

  return (
    <ModelErrorBoundary>
      <ModelInner src={src} />
    </ModelErrorBoundary>
  );
}
