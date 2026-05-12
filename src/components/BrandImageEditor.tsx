import { useEffect, useState } from "react";
import { isSupportedImage, readImageFileForStorage } from "../utils/media";
import { Icon } from "./Icon";

interface BrandImageEditorProps {
  logoImage?: string;
  onLogoChange: (logoImage: string) => void;
  compact?: boolean;
}

export function BrandImageEditor({
  logoImage = "",
  onLogoChange,
  compact = false
}: BrandImageEditorProps) {
  const [draft, setDraft] = useState(logoImage);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(logoImage);
  }, [logoImage]);

  const saveImageLink = () => {
    const next = draft.trim();
    onLogoChange(next);
    setMessage(next ? "Brand image updated." : "Brand image cleared.");
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!isSupportedImage(file)) {
      setMessage("Use a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    try {
      const dataUrl = await readImageFileForStorage(file, {
        maxDimension: 620,
        maxDataUrlLength: 280_000,
        quality: 0.86
      });
      setDraft(dataUrl);
      onLogoChange(dataUrl);
      setMessage("Brand image uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload that image.");
    }
  };

  return (
    <details className={`brand-image-editor ${compact ? "compact" : ""}`}>
      <summary>
        <Icon name="Image" className="h-4 w-4" />
        <span>Brand Image</span>
      </summary>
      <div className="brand-image-editor-body">
        <label>
          <span>Image URL</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste an image link"
            autoComplete="off"
          />
        </label>
        <div className="brand-image-editor-actions">
          <button type="button" className="button-frame" onClick={saveImageLink}>
            Save Image Link
          </button>
          <label className="button-frame">
            <Icon name="Upload" className="h-4 w-4" />
            Upload
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                void uploadImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="button-frame"
            onClick={() => {
              setDraft("");
              onLogoChange("");
              setMessage("Brand image cleared.");
            }}
          >
            Clear
          </button>
        </div>
        {message && <span className="brand-image-editor-message">{message}</span>}
      </div>
    </details>
  );
}
