declare module "@react-three/fiber" {
  import type { ReactNode } from "react";
  import * as THREE from "three";

  export interface CanvasProps {
    children?: ReactNode;
    style?: React.CSSProperties;
    className?: string;
    gl?: any;
    camera?: any;
    raycaster?: any;
    shadows?: boolean;
    vr?: boolean;
    gl2?: boolean;
    concurrent?: boolean;
    resize?: any;
    orthographic?: boolean;
    noEvents?: boolean;
    pixelRatio?: number;
    invalidateFrameloop?: boolean;
    updateDefaultCamera?: boolean;
    onCreated?: (state: any) => void;
    onPointerMissed?: () => void;
    [key: string]: any;
  }

  // Canvas component
  export const Canvas: React.FC<CanvasProps>;

  // JSX elements for Three.js objects
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      spotLight: any;
      hemisphereLight: any;
      group: any;
      primitive: any;
      [key: string]: any;
    }
  }
}

declare module "@react-three/drei" {
  import type { ReactNode } from "react";

  export interface FloatProps {
    children?: ReactNode;
    speed?: number;
    rotationIntensity?: number;
    floatIntensity?: number;
    position?: [number, number, number];
    [key: string]: any;
  }

  export const Float: React.FC<FloatProps>;
  export const OrbitControls: React.FC<any>;
  export const Center: React.FC<any>;
  export function useGLTF(path: string): any;
}
