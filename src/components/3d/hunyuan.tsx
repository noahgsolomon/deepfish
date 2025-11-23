"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export function Hunyuan(props: any) {
  const { nodes } = useGLTF("/hunyuan-3d.glb");

  useEffect(() => {
    if (nodes.geometry_0.material) {
      const material = nodes.geometry_0.material.clone();

      material.metalness = 0;
      material.roughness = 0.4;

      nodes.geometry_0.material = material;
    }
  }, [nodes]);

  return (
    // @ts-ignore - Ignore the JSX type errors
    <group
      {...props}
      scale={props.scale || 4.5}
      position={[0, -0.5, 4]}
      dispose={null}
    >
      {/* @ts-ignore - Ignore the JSX type errors */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.geometry_0.geometry}
        material={nodes.geometry_0.material}
      />
      {/* @ts-ignore - Ignore the JSX type errors */}
    </group>
  );
}
