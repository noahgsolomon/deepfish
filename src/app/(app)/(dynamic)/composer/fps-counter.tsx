"use client";

import { Gauge } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { useRef } from "react";

export default function FpsCounter() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationRef = useRef<number | null>(null);

  const calculateFps = () => {
    frameCount.current += 1;
    const currentTime = performance.now();
    const elapsedTime = currentTime - lastTime.current;

    if (elapsedTime >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / elapsedTime));
      frameCount.current = 0;
      lastTime.current = currentTime;
    }

    animationRef.current = requestAnimationFrame(calculateFps);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(calculateFps);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="z-10 flex h-8 items-center gap-1.5 rounded-none border border-orange-500/30 bg-orange-500/20 px-3 py-1 font-mono text-xs text-orange-400 hover:bg-orange-500/30">
      <Gauge size={14} className="mr-1" />
      <span className="font-bold">{fps}</span>
      <span className="ml-0.5 text-[10px] text-orange-300/80">FPS</span>
    </div>
  );
}
