import type { GooglePickerFile } from "../utils/googlePicker";
import { openGoogleDriveImagePicker } from "../utils/googlePicker";
import { googleDriveThumbnailUrl } from "../utils/imageFit";
import { Icon } from "./Icon";

interface DriveImagePickerButtonProps {
  label?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  onPick: (imageUrl: string, file: GooglePickerFile) => void;
}

export function DriveImagePickerButton({
  label = "Choose from Drive",
  title = "Select Image From Google Drive",
  className = "drive-image-picker-button",
  disabled = false,
  onPick
}: DriveImagePickerButtonProps) {
  const pickImage = async () => {
    try {
      const file = await openGoogleDriveImagePicker(title);
      if (!file) return;
      onPick(googleDriveThumbnailUrl(file.id), file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not open Google Drive picker.");
    }
  };

  return (
    <button type="button" className={className} onClick={pickImage} disabled={disabled}>
      <Icon name="FolderOpen" className="h-4 w-4" />
      {label}
    </button>
  );
}
