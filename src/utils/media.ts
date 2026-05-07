export const imageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface ImageStorageOptions {
  maxDimension?: number;
  maxDataUrlLength?: number;
  quality?: number;
}

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

export const isSupportedImage = (file: File) => imageTypes.includes(file.type);

export const readImageFileForStorage = async (
  file: File,
  {
    maxDimension = 1200,
    maxDataUrlLength = 720_000,
    quality = 0.84
  }: ImageStorageOptions = {}
) => {
  if (file.type === "image/gif") {
    if (file.size > 850_000) {
      throw new Error("That GIF is too large for browser storage. Use a smaller GIF or a video/link instead.");
    }
    return readFileAsDataUrl(file);
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  let nextQuality = quality;
  let bestDataUrl = "";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image for storage.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    bestDataUrl = canvas.toDataURL("image/webp", nextQuality);
    if (bestDataUrl.length <= maxDataUrlLength) {
      return bestDataUrl;
    }

    nextQuality = Math.max(0.52, nextQuality - 0.08);
    if (attempt > 3 || nextQuality <= 0.54) {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }

  if (bestDataUrl) return bestDataUrl;
  if (originalDataUrl.length <= maxDataUrlLength) return originalDataUrl;
  throw new Error("That image is too large for browser storage. Try a smaller PNG/JPG/WEBP.");
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load this image."));
    image.src = src;
  });

export const fileSizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
