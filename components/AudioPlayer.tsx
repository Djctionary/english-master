"use client";

import { useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  audioFilename: string | null;
}

export default function AudioPlayer({ audioFilename }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
    setIsPlaying(false);
    setPlayError(null);
  }, [audioFilename]);

  if (!audioFilename) {
    return null;
  }

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          setPlayError("Audio unavailable. Please try again.");
          setIsPlaying(false);
        });
      }
    }
  };

  const handlePlay = () => {
    setPlayError(null);
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => setIsPlaying(false);
  const handleError = () => {
    setIsPlaying(false);
    setPlayError("Audio unavailable. Please try again.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <audio
        ref={audioRef}
        src={`/api/audio/${audioFilename}`}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        data-testid="audio-element"
      />
      <button
        onClick={togglePlayPause}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          backgroundColor: isPlaying ? "#EF4444" : "#3B82F6",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {isPlaying ? "⏸ Pause" : "▶ Play"}
      </button>
      {playError && (
        <span style={{ fontSize: "11px", color: "#DC2626", maxWidth: "180px", textAlign: "right" }}>
          {playError}
        </span>
      )}
    </div>
  );
}
