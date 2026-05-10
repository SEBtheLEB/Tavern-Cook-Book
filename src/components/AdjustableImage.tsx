import { useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { ImageFitSettings } from "../types";
import { imageFitToStyle } from "../utils/imageFit";
import { ImageAdjustModal } from "./ImageAdjustModal";

interface AdjustableImageProps {
  src: string;
  alt?: string;
  label: string;
  imageFit?: ImageFitSettings;
  aspectRatio?: string;
  canAdjust?: boolean;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
  overlayLabel?: string;
  fallback?: ReactNode;
  onSave?: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
  onUploadToDrive?: (file: File, folderId?: string) => Promise<string>;
  onImportFromDrive?: () => Promise<string>;
  onError?: () => void;
}

export function AdjustableImage({
  src,
  alt = "",
  label,
  imageFit,
  aspectRatio = "4 / 3",
  canAdjust = false,
  className = "",
  imageClassName = "",
  style,
  imageStyle,
  overlayLabel = "Adjust",
  fallback = null,
  onSave,
  onUploadToDrive,
  onImportFromDrive,
  onError
}: AdjustableImageProps) {
  const [open, setOpen] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<{ width: number; height: number } | undefined>();

  if (!src) return <>{fallback}</>;

  const image = (
    <img
      src={src}
      alt={alt}
      className={imageClassName}
      style={{ ...imageStyle, ...imageFitToStyle(imageFit) }}
      onError={onError}
    />
  );

  if (!canAdjust || !onSave) return image;

  const stopAndOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewFrame({
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    });
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={`adjustable-image-trigger ${className}`}
        style={style}
        title={`Adjust ${label}`}
        aria-label={`Adjust ${label}`}
        onClick={stopAndOpen}
      >
        {image}
        <span className="adjustable-image-trigger-label">{overlayLabel}</span>
      </button>
      {open && (
        <ImageAdjustModal
          slotLabel={label}
          imageUrl={src}
          imageFit={imageFit}
          aspectRatio={aspectRatio}
          previewFrame={previewFrame}
          onSave={(next) => {
            onSave(next);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
          onUploadToDrive={onUploadToDrive}
          onImportFromDrive={onImportFromDrive}
        />
      )}
    </>
  );
}
