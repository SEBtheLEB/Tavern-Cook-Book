import { useEffect, useMemo, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { extractGoogleDriveFileId, resolveImageSourceUrl } from "../utils/imageFit";
import { fetchDriveImageBlobUrl, getActiveDriveAccessToken, GOOGLE_DRIVE_AUTH_EVENT } from "../utils/googlePicker";

type DriveAwareImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};

export function DriveAwareImage({ src, onError, ...props }: DriveAwareImageProps) {
  const { imageSrc, authPreviewUrl, driveFileId, authPreviewStatus } = useDriveAwareImageSrc(src);

  return (
    <img
      {...props}
      key={`${driveFileId || imageSrc}-${authPreviewUrl ? "auth" : authPreviewStatus}`}
      src={imageSrc}
      onError={(event) => {
        if (driveFileId && !authPreviewUrl && authPreviewStatus === "loading") return;
        onError?.(event);
      }}
    />
  );
}

export function useDriveAwareImageSrc(src: string) {
  const resolvedSrc = useMemo(() => resolveImageSourceUrl(src || ""), [src]);
  const driveFileId = useMemo(() => extractGoogleDriveFileId(src || resolvedSrc), [src, resolvedSrc]);
  const [authPreviewUrl, setAuthPreviewUrl] = useState("");
  const [authPreviewStatus, setAuthPreviewStatus] = useState<"idle" | "loading" | "failed" | "ready">("idle");
  const [authRetryToken, setAuthRetryToken] = useState(0);

  useEffect(() => {
    const handleDriveAuth = () => setAuthRetryToken((current) => current + 1);
    window.addEventListener(GOOGLE_DRIVE_AUTH_EVENT, handleDriveAuth);
    return () => window.removeEventListener(GOOGLE_DRIVE_AUTH_EVENT, handleDriveAuth);
  }, []);

  useEffect(() => {
    setAuthPreviewUrl("");
    setAuthPreviewStatus("idle");
    if (!driveFileId) return;
    if (!getActiveDriveAccessToken()) {
      setAuthPreviewStatus("failed");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setAuthPreviewStatus("loading");
    fetchDriveImageBlobUrl(driveFileId, { signal: controller.signal })
      .then((nextUrl) => {
        if (active) {
          setAuthPreviewUrl(nextUrl);
          setAuthPreviewStatus("ready");
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) setAuthPreviewStatus("failed");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [driveFileId, authRetryToken]);

  return {
    imageSrc: authPreviewUrl || resolvedSrc,
    resolvedSrc,
    authPreviewUrl,
    authPreviewStatus,
    driveFileId
  };
}
