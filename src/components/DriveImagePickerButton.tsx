import { useRef } from "react";
import type { GooglePickerFile } from "../utils/googlePicker";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { Icon } from "./Icon";

interface DriveImagePickerButtonProps {
  label?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  onPick: (imageUrl: string, file: GooglePickerFile) => void;
}

export function DriveImagePickerButton({
  label = "Choose image",
  title = "Select local image",
  className = "drive-image-picker-button",
  disabled = false,
  onPick
}: DriveImagePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      window.alert("Choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }
    try {
      const imageUrl = await readImageFileForStorage(file);
      onPick(imageUrl, {
        id: `local-${Date.now()}`,
        name: file.name,
        mimeType: file.type,
        url: imageUrl,
        thumbnailUrl: imageUrl
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not prepare this image.");
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={() => inputRef.current?.click()} disabled={disabled} title={title}>
        <Icon name="ImagePlus" className="h-4 w-4" />
        {label}
      </button>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          void pickImage(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}
