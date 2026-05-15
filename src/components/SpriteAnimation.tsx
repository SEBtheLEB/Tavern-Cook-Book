import { useEffect, useMemo, useRef, useState } from "react";
import type { SpriteAnimationFrameImage } from "../types";
import type { SpriteAnimationPreset, SpriteSheetAsset } from "../utils/spriteSheets";
import { buildFrameSequence, frameBounds } from "../utils/spriteSheets";
import { useDriveAwareImageSrc } from "./DriveAwareImage";

interface SpriteAnimationProps {
  spriteSheet: SpriteSheetAsset;
  preset: SpriteAnimationPreset;
  autoplay?: boolean;
  playOnHover?: boolean;
  resetOnMouseLeave?: boolean;
  loopWhileHovering?: boolean;
  playOnce?: boolean;
  fpsOverride?: number;
  frameOverride?: number | null;
  frameImages?: SpriteAnimationFrameImage[];
  className?: string;
  onFrameChange?: (frameIndex: number) => void;
}

export function SpriteAnimation({
  spriteSheet,
  preset,
  autoplay = false,
  playOnHover = false,
  resetOnMouseLeave = true,
  loopWhileHovering = true,
  playOnce,
  fpsOverride,
  frameOverride = null,
  frameImages = [],
  className = "",
  onFrameChange
}: SpriteAnimationProps) {
  const holdSignature = JSON.stringify(preset.frameHoldCounts || {});
  const sequence = useMemo(() => buildFrameSequence(preset), [preset.startFrame, preset.endFrame, preset.pingPong, holdSignature]);
  const [hovered, setHovered] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const sequenceIndexRef = useRef(0);
  const frame = frameOverride ?? sequence[Math.min(sequenceIndex, Math.max(0, sequence.length - 1))] ?? preset.startFrame;
  const active = autoplay || (playOnHover && hovered);
  const shouldPlayOnce = playOnce ?? preset.playOnce;
  const shouldLoop = playOnHover && hovered ? loopWhileHovering : preset.loop;

  useEffect(() => {
    if (frameOverride == null) return;
    const nextIndex = Math.max(0, sequence.findIndex((item) => item === frameOverride));
    sequenceIndexRef.current = nextIndex;
    setSequenceIndex(nextIndex);
  }, [frameOverride, sequence]);

  useEffect(() => {
    onFrameChange?.(frame);
  }, [frame, onFrameChange]);

  useEffect(() => {
    if (!active || !sequence.length) return undefined;
    let animationFrame = 0;
    let lastTime = performance.now();
    const fps = clampFps(fpsOverride ?? preset.fps);
    const frameDuration = 1000 / fps;

    const tick = (now: number) => {
      if (now - lastTime >= frameDuration) {
        lastTime = now;
        sequenceIndexRef.current += 1;
        if (sequenceIndexRef.current >= sequence.length) {
          if (shouldPlayOnce || !shouldLoop) {
            sequenceIndexRef.current = sequence.length - 1;
          } else {
            sequenceIndexRef.current = 0;
          }
        }
        setSequenceIndex(sequenceIndexRef.current);
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [active, fpsOverride, preset.fps, sequence, shouldLoop, shouldPlayOnce]);

  const frameImageByIndex = useMemo(() => {
    const map = new Map<number, SpriteAnimationFrameImage>();
    frameImages.forEach((image) => {
      if (Number.isFinite(image.frameIndex)) map.set(image.frameIndex, image);
    });
    return map;
  }, [frameImages]);
  const frameImage = frameImageByIndex.get(frame);
  const frameImageUrl = frameImage ? frameImage.thumbnailUrl || frameImage.webViewLink : "";
  const frameImageSrc = useDriveAwareImageSrc(frameImageUrl).imageSrc;
  const imageUrl = useDriveAwareImageSrc(spriteSheet.thumbnailUrl || spriteSheet.driveUrl).imageSrc;
  const { sourceX, sourceY } = frameBounds(frame, preset.columns, preset.frameWidth, preset.frameHeight);
  const scale = Math.max(0.25, preset.scale || 1);
  const width = preset.frameWidth * scale;
  const height = preset.frameHeight * scale;

  return (
    <div
      className={`sprite-animation ${className}`.trim()}
      style={{ width, height }}
      onMouseEnter={() => {
        if (playOnHover) setHovered(true);
      }}
      onMouseLeave={() => {
        if (playOnHover) setHovered(false);
        if (resetOnMouseLeave) {
          sequenceIndexRef.current = 0;
          setSequenceIndex(0);
        }
      }}
      aria-label={`${spriteSheet.name} ${preset.animationName} animation`}
    >
      {frameImageSrc ? (
        <img className="sprite-animation-frame-image" src={frameImageSrc} alt="" draggable={false} style={{ width, height }} />
      ) : (
        <div
          className="sprite-animation-frame"
          style={{
            width,
            height,
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: `${preset.columns * preset.frameWidth * scale}px ${preset.rows * preset.frameHeight * scale}px`,
            backgroundPosition: `-${sourceX * scale}px -${sourceY * scale}px`
          }}
        />
      )}
    </div>
  );
}

function clampFps(value: number) {
  if (!Number.isFinite(value)) return 8;
  return Math.min(60, Math.max(1, value));
}

