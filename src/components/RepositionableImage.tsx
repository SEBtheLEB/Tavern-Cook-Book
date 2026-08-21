import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { ImageFitSettings } from "../types";
import type { AssignableModuleInfo } from "../utils/assignments";
import { imageFitToStyle } from "../utils/imageFit";
import { useOptionalAssignments } from "./AssignmentSystem";
import { DriveAwareImage } from "./DriveAwareImage";
import { ImageAdjustModal } from "./ImageAdjustModal";

interface RepositionableImageProps {
  src: string;
  alt?: string;
  label: string;
  imageFit?: ImageFitSettings;
  aspectRatio?: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  canReposition?: boolean;
  assignmentModule?: AssignableModuleInfo;
  onSave?: (next: { imageUrl: string; imageFit: ImageFitSettings }) => void;
  onError?: () => void;
}

export function RepositionableImage({
  src,
  alt = "",
  label,
  imageFit,
  aspectRatio = "4 / 3",
  className,
  style,
  loading,
  canReposition = false,
  assignmentModule,
  onSave,
  onError
}: RepositionableImageProps) {
  const assignments = useOptionalAssignments();
  const [open, setOpen] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<{ width: number; height: number }>();

  const openAdjuster = (element: HTMLElement) => {
    const frame = element.parentElement || element;
    const rect = frame.getBoundingClientRect();
    setPreviewFrame({
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    });
    setOpen(true);
  };

  const handleContextMenu = (event: MouseEvent<HTMLImageElement>) => {
    if (!canReposition || !onSave) return;
    const image = event.currentTarget;
    const action = {
      id: `reposition-image-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: "Reposition Image",
      icon: "Move",
      onSelect: () => openAdjuster(image)
    };
    if (assignments) {
      assignments.openContextMenu(event, assignmentModule, [action]);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    action.onSelect();
  };

  return (
    <>
      <DriveAwareImage
        src={src}
        alt={alt}
        className={className}
        style={{ ...style, ...imageFitToStyle(imageFit) }}
        loading={loading}
        draggable={false}
        onContextMenu={handleContextMenu}
        onError={onError}
      />
      {open && onSave && (
        <ImageAdjustModal
          title="Reposition Image"
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
        />
      )}
    </>
  );
}
