import { useMemo } from "react";
import type { ImgHTMLAttributes } from "react";
import { resolveImageSourceUrl } from "../utils/imageFit";

type DriveAwareImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

export function DriveAwareImage({ src, ...props }: DriveAwareImageProps) {
  const imageSrc = useMemo(() => resolveImageSourceUrl(src || ""), [src]);

  return <img {...props} src={imageSrc} />;
}

export function useDriveAwareImageSrc(src: string) {
  const resolvedSrc = useMemo(() => resolveImageSourceUrl(src || ""), [src]);

  return {
    imageSrc: resolvedSrc,
    resolvedSrc,
    authPreviewUrl: "",
    authPreviewStatus: "idle" as const,
    driveFileId: ""
  };
}
