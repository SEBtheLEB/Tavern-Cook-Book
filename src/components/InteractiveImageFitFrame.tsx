import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type WheelEvent } from "react";
import type { ImageFitSettings } from "../types";
import { normalizeImageFit } from "../utils/imageFit";

interface InteractiveImageFitFrameProps {
  imageFit?: ImageFitSettings;
  onChange: (fit: ImageFitSettings) => void;
  onCommit?: (fit: ImageFitSettings) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  children: ReactNode;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  frameWidth: number;
  frameHeight: number;
  startFit: ImageFitSettings;
  latestFit: ImageFitSettings;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

export function InteractiveImageFitFrame({
  imageFit,
  onChange,
  onCommit,
  className = "",
  style,
  disabled = false,
  children
}: InteractiveImageFitFrameProps) {
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fit = normalizeImageFit(imageFit);

  const emitFit = (nextFit: ImageFitSettings, commit = false) => {
    const normalized = normalizeImageFit(nextFit);
    onChange(normalized);
    if (commit) onCommit?.(normalized);
    return normalized;
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    event.preventDefault();
    const currentFit = normalizeImageFit(imageFit);
    const currentScale = currentFit.scale || 1;
    const nextScale = roundScale(clamp(currentScale * Math.exp(-event.deltaY * 0.0012), MIN_SCALE, MAX_SCALE));
    if (nextScale === currentScale) return;

    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const originX = rect.width / 2;
    const originY = rect.height / 2;
    const translateX = (currentFit.x / 100) * rect.width;
    const translateY = (currentFit.y / 100) * rect.height;
    const scaleRatio = nextScale / currentScale;
    const nextTranslateX = pointerX - originX - scaleRatio * (pointerX - translateX - originX);
    const nextTranslateY = pointerY - originY - scaleRatio * (pointerY - translateY - originY);

    emitFit({
      ...currentFit,
      scale: nextScale,
      x: (nextTranslateX / rect.width) * 100,
      y: (nextTranslateY / rect.height) * 100
    }, true);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    event.preventDefault();
    const startFit = normalizeImageFit(imageFit);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      frameWidth: rect.width,
      frameHeight: rect.height,
      startFit,
      latestFit: startFit
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextFit = emitFit({
      ...drag.startFit,
      x: drag.startFit.x + ((event.clientX - drag.startX) / drag.frameWidth) * 100,
      y: drag.startFit.y + ((event.clientY - drag.startY) / drag.frameHeight) * 100
    });
    drag.latestFit = nextFit;
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    onCommit?.(normalizeImageFit(drag.latestFit));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const currentFit = normalizeImageFit(imageFit);
    const panStep = event.shiftKey ? 10 : 3;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      emitFit({ ...currentFit, x: currentFit.x - panStep }, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      emitFit({ ...currentFit, x: currentFit.x + panStep }, true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      emitFit({ ...currentFit, y: currentFit.y - panStep }, true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      emitFit({ ...currentFit, y: currentFit.y + panStep }, true);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      emitFit({ ...currentFit, scale: roundScale(clamp(currentFit.scale * 1.08, MIN_SCALE, MAX_SCALE)) }, true);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      emitFit({ ...currentFit, scale: roundScale(clamp(currentFit.scale / 1.08, MIN_SCALE, MAX_SCALE)) }, true);
    }
  };

  return (
    <div
      className={`interactive-image-fit-frame ${disabled ? "disabled" : ""} ${isDragging ? "is-dragging" : ""} ${className}`.trim()}
      style={style}
      role={disabled ? undefined : "group"}
      tabIndex={disabled ? undefined : 0}
      aria-label={disabled ? undefined : "Image fit editor"}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      data-fit-scale={fit.scale}
    >
      {children}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100;
}
