import { useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { ImageFitSettings } from "../types";
import { imageFitToStyle } from "../utils/imageFit";
import { useOptionalAssignments } from "./AssignmentSystem";
import { DriveAwareImage } from "./DriveAwareImage";
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
  const assignments = useOptionalAssignments();

  if (!src) return <>{fallback}</>;

  const image = (
    <DriveAwareImage
      src={src}
      alt={alt}
      className={imageClassName}
      style={{ ...imageStyle, ...imageFitToStyle(imageFit) }}
      onError={onError}
    />
  );

  if (!canAdjust || !onSave) return image;

  const openFromElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setPreviewFrame({
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    });
    setOpen(true);
  };

  const stopAndOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openFromElement(event.currentTarget);
  };

  const openContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const trigger = event.currentTarget;
    const action = {
      id: `reposition-image-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: "Reposition Image",
      icon: "Move",
      onSelect: () => openFromElement(trigger)
    };
    if (assignments) {
      assignments.openContextMenu(event, undefined, [action]);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    action.onSelect();
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
        onContextMenu={openContextMenu}
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
