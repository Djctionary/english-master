"use client";

import { useRef, useState } from "react";

interface AudioPlayerProps {
  audioFilename: string | null;
}

export default function AudioPlayer({ audioFilename }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!audioFilename) {
    return null;
  }

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => setIsPlaying(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <audio
        ref={audioRef}
        src={`/api/audio/${audioFilename}`}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
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
    </div>
  );
}
