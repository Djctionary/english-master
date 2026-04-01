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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-xs)" }}>
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
        className={isPlaying ? "btn-secondary" : "btn-primary"}
        style={{
          padding: "var(--space-sm) var(--space-lg)",
          fontSize: "var(--text-small)",
          ...(isPlaying && {
            borderColor: "var(--color-error)",
            color: "var(--color-error)",
          }),
        }}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      {playError && (
        <span style={{
          fontSize: "var(--text-tiny)",
          color: "var(--color-error)",
          maxWidth: "180px",
          textAlign: "right",
        }}>
          {playError}
        </span>
      )}
    </div>
  );
}
