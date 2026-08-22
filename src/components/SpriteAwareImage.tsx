import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { ImageFitSettings, SpriteAnimationSlotReference } from "../types";
import { imageFitToStyle } from "../utils/imageFit";
import { resolveSpriteAnimationSlot } from "../utils/spriteAnimationSlots";
import { DriveAwareImage } from "./DriveAwareImage";
import { SpriteAnimation } from "./SpriteAnimation";

interface SpriteAwareImageProps {
  src?: string;
  spriteAnimation?: SpriteAnimationSlotReference;
  imageFit?: ImageFitSettings;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  forceAutoplay?: boolean;
  fallback?: ReactNode;
}

export function SpriteAwareImage({
  src = "",
  spriteAnimation,
  imageFit,
  alt = "",
  className = "",
  style,
  forceAutoplay = true,
  fallback = null
}: SpriteAwareImageProps) {
  const resolved = useMemo(
    () => spriteAnimation ? resolveSpriteAnimationSlot(spriteAnimation) : null,
    [spriteAnimation]
  );
  if (resolved?.asset && resolved.preset && resolved.reference) {
    const fitStyle = imageFitToStyle(imageFit);
    return (
      <div className={`sprite-aware-image ${className}`.trim()} style={style} aria-label={alt || `${resolved.preset.animationName} animation`}>
        <div
          className="sprite-aware-image-inner"
          style={{ transform: fitStyle.transform, transformOrigin: fitStyle.transformOrigin }}
        >
          <SpriteAnimation
            spriteSheet={resolved.asset}
            preset={resolved.preset}
            autoplay={forceAutoplay || resolved.reference.playback === "autoplay"}
            playOnHover={!forceAutoplay && resolved.reference.playback === "hover"}
            loopWhileHovering={resolved.reference.loop}
            loopOverride={forceAutoplay ? true : undefined}
            playOnce={forceAutoplay ? false : undefined}
            frameImages={resolved.reference.frameImages}
            fluid
          />
        </div>
      </div>
    );
  }

  if (src) return <DriveAwareImage src={src} alt={alt} className={className} style={{ ...imageFitToStyle(imageFit), ...style }} />;
  return <>{fallback}</>;
}
