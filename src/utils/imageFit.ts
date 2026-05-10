import type { CSSProperties } from "react";
import type { ImageFitMode, ImageFitSettings } from "../types";

export const defaultImageFit: ImageFitSettings = {
  mode: "contain",
  scale: 1,
  x: 0,
  y: 0
};

export const normalizeImageFit = (value: unknown, fallback: ImageFitSettings = defaultImageFit): ImageFitSettings => {
  const source = value && typeof value === "object" ? value as Partial<ImageFitSettings> : {};
  return {
    mode: normalizeFitMode(source.mode, fallback.mode),
    scale: clampNumber(source.scale, 0.25, 3, fallback.scale),
    x: clampNumber(source.x, -100, 100, fallback.x),
    y: clampNumber(source.y, -100, 100, fallback.y)
  };
};

export const imageFitToStyle = (fit: unknown): CSSProperties => {
  const normalized = normalizeImageFit(fit);
  return {
    objectFit: normalized.mode === "custom" ? "contain" : normalized.mode,
    transform: `translate(${normalized.x}%, ${normalized.y}%) scale(${normalized.scale})`,
    transformOrigin: "center center"
  };
};

export const legacyCreatureFit = (xValue: unknown, yValue: unknown, zoomValue: unknown): ImageFitSettings => {
  const x = clampNumber(xValue, 0, 100, 50);
  const y = clampNumber(yValue, 0, 100, 50);
  return {
    mode: "cover",
    scale: clampNumber(zoomValue, 1, 3, 1),
    x: x - 50,
    y: y - 50
  };
};

export const extractGoogleDriveFileId = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const filePathMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if (filePathMatch?.[1]) return filePathMatch[1];

  const queryMatch = trimmed.match(/[?&]id=([^&#]+)/i);
  if (queryMatch?.[1]) return queryMatch[1];

  const thumbnailMatch = trimmed.match(/drive\.google\.com\/thumbnail\?id=([^&#]+)/i);
  if (thumbnailMatch?.[1]) return thumbnailMatch[1];

  return "";
};

export const googleDriveWebViewLink = (fileId: string) =>
  `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;

export const googleDriveThumbnailUrl = (fileId: string) =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;

export const resolveImageSourceUrl = (value: string) => {
  const trimmed = value.trim();
  const driveFileId = extractGoogleDriveFileId(trimmed);
  return driveFileId ? googleDriveThumbnailUrl(driveFileId) : trimmed;
};

const normalizeFitMode = (value: unknown, fallback: ImageFitMode): ImageFitMode => {
  if (value === "contain" || value === "cover" || value === "fill" || value === "custom") return value;
  return fallback;
};

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
};
