"use client";
import { useRef, useState } from "react";

export default function AudioPlayer({ audioSrc }: { audioSrc: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const updateProgress = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickPositionInPercent = (x / progressBar.offsetWidth) * 100;

      audioRef.current.currentTime =
        (clickPositionInPercent / 100) * audioRef.current.duration;
    }
  };

  return (
    <div>
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <button
          onClick={togglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <span className="text-lg">{isPlaying ? "⏸" : "▶"}</span>
        </button>

        <div className="mx-3 flex-1">
          <div
            className="bg-terminal-track border-border-default h-1.5 w-full cursor-pointer rounded-none border"
            onClick={handleSeek}
          >
            <div
              className="h-1 rounded-none bg-blue-500/50 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="text-text-default font-mono text-xs">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
