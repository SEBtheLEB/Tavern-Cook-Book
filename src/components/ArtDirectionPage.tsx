import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { ArtDirectionBoard, ArtDirectionBoardItem, GoogleAccountUser, LoreDatabase } from "../types";
import {
  artDirectionDriveFolderPathLabel,
  artDirectionFolderTarget,
  normalizeArtDirectionBoard,
  resolveArtDirectionDriveFolder
} from "../utils/artDirection";
import {
  openGoogleDriveImagePicker,
  uploadImageToDrive,
  type GoogleDriveFolder,
  type GooglePickerFile,
  type UploadedDriveFile
} from "../utils/googlePicker";
import { googleDriveThumbnailUrl, googleDriveWebViewLink } from "../utils/imageFit";
import { isSupportedImage } from "../utils/media";
import { DriveAwareImage } from "./DriveAwareImage";
import { Icon } from "./Icon";

interface ArtDirectionPageProps {
  database: LoreDatabase;
  readOnly: boolean;
  currentUser: GoogleAccountUser;
  onDatabaseChange: (database: LoreDatabase) => void;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

const BOARD_PADDING = 80;

export function ArtDirectionPage({ database, readOnly, currentUser, onDatabaseChange }: ArtDirectionPageProps) {
  const board = useMemo(() => normalizeArtDirectionBoard(database.artDirection), [database.artDirection]);
  const [localBoard, setLocalBoard] = useState<ArtDirectionBoard>(board);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestBoardRef = useRef(localBoard);

  const commitBoard = useCallback((nextBoard: ArtDirectionBoard) => {
    if (readOnly) return;
    const normalized = normalizeArtDirectionBoard({ ...nextBoard, updatedAt: new Date().toISOString() });
    latestBoardRef.current = normalized;
    setLocalBoard(normalized);
    onDatabaseChange({ ...database, artDirection: normalized });
  }, [database, onDatabaseChange, readOnly]);

  useEffect(() => {
    setLocalBoard(board);
    latestBoardRef.current = board;
  }, [board]);

  useEffect(() => {
    latestBoardRef.current = localBoard;
  }, [localBoard]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const element = boardRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left - dragState.offsetX, 0, localBoard.width - 120);
      const y = clamp(event.clientY - rect.top - dragState.offsetY, 0, localBoard.height - 120);
      setLocalBoard((current) => {
        const next = {
          ...current,
          items: current.items.map((item) =>
            item.id === dragState.id ? { ...item, x, y, updatedAt: new Date().toISOString() } : item
          ),
          updatedAt: new Date().toISOString()
        };
        latestBoardRef.current = next;
        return next;
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
      commitBoard(latestBoardRef.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [commitBoard, dragState, localBoard.height, localBoard.width]);

  const selectedItem = localBoard.items.find((item) => item.id === selectedItemId) || null;
  const imageCount = localBoard.items.filter((item) => item.type === "image").length;
  const noteCount = localBoard.items.filter((item) => item.type === "text").length;

  const patchBoard = (patcher: (current: ArtDirectionBoard) => ArtDirectionBoard, commit = true) => {
    const next = normalizeArtDirectionBoard(patcher(latestBoardRef.current));
    latestBoardRef.current = next;
    setLocalBoard(next);
    if (commit) commitBoard(next);
  };

  const patchItem = (itemId: string, patch: Partial<ArtDirectionBoardItem>, commit = true) => {
    patchBoard((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      ),
      updatedAt: new Date().toISOString()
    }), commit);
  };

  const addTextNote = () => {
    if (readOnly) return;
    const position = insertionPoint();
    const stamp = new Date().toISOString();
    const item: ArtDirectionBoardItem = {
      id: `art-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "text",
      title: "Direction Note",
      text: "Write the art direction note here.",
      color: "#fff7d6",
      x: position.x,
      y: position.y,
      width: 320,
      height: 220,
      zIndex: nextZIndex(localBoard),
      createdAt: stamp,
      updatedAt: stamp
    };
    setSelectedItemId(item.id);
    commitBoard({ ...localBoard, items: [...localBoard.items, item], updatedAt: stamp });
  };

  const importFromDrive = async () => {
    if (readOnly) return;
    setBusy(true);
    setMessage("Opening Google Drive image picker...");
    try {
      const picked = await openGoogleDriveImagePicker("Choose Art Direction reference");
      if (!picked) {
        setMessage("");
        return;
      }
      const folder = localBoard.driveFolderId
        ? folderFromBoard(localBoard)
        : await resolveAndStoreFolder(localBoard, false);
      const item = createImageItemFromPickedFile(picked, insertionPoint(), currentUser, folder || undefined, nextZIndex(localBoard));
      setSelectedItemId(item.id);
      commitBoard({
        ...latestBoardRef.current,
        items: [...latestBoardRef.current.items, item],
        updatedAt: item.updatedAt
      });
      setMessage(`Added "${item.title}" from Google Drive.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import from Google Drive.");
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (files: FileList | File[], dropPoint?: { x: number; y: number }) => {
    if (readOnly) return;
    const imageFiles = Array.from(files).filter(isSupportedImage);
    if (!imageFiles.length) {
      setMessage("Drop or choose PNG, JPG, WEBP, or GIF images.");
      return;
    }

    setBusy(true);
    setMessage(`Preparing ${artDirectionDriveFolderPathLabel()} folder in Google Drive...`);
    try {
      const folder = await resolveAndStoreFolder(latestBoardRef.current, true);
      if (!folder) return;
      let nextBoard = latestBoardRef.current;
      const basePoint = dropPoint || insertionPoint();

      for (const [index, file] of imageFiles.entries()) {
        setMessage(`Uploading "${file.name}" to Google Drive...`);
        const uploaded = await uploadImageToDrive(file, folder.id, {
          naming: {
            sourceType: "Art Direction",
            subjectName: localBoard.title,
            categoryName: "Whiteboard",
            slotName: stripFileExtension(file.name),
            purpose: "Reference",
            state: "WIP"
          }
        });
        const size = await getImageSize(file);
        const item = createImageItemFromUpload(
          uploaded,
          file,
          size,
          {
            x: basePoint.x + index * 34,
            y: basePoint.y + index * 34
          },
          currentUser,
          folder,
          nextZIndex(nextBoard) + index
        );
        nextBoard = {
          ...nextBoard,
          driveFolderId: folder.id,
          driveFolderLink: folder.url,
          driveFolderName: folder.name,
          items: [...nextBoard.items, item],
          updatedAt: item.updatedAt
        };
        latestBoardRef.current = nextBoard;
        setLocalBoard(nextBoard);
        setSelectedItemId(item.id);
      }

      commitBoard(nextBoard);
      setMessage(`${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"} uploaded to Art Direction.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Drive upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const resolveAndStoreFolder = async (current: ArtDirectionBoard, commit: boolean): Promise<GoogleDriveFolder | null> => {
    if (current.driveFolderId) return folderFromBoard(current);
    const folder = await resolveArtDirectionDriveFolder();
    const target = artDirectionFolderTarget(folder);
    const next = {
      ...current,
      driveFolderId: target.id,
      driveFolderLink: target.link,
      driveFolderName: target.name,
      updatedAt: new Date().toISOString()
    };
    latestBoardRef.current = next;
    setLocalBoard(next);
    if (commit) commitBoard(next);
    return folder;
  };

  const handleBoardDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingFiles(false);
    if (readOnly || busy) return;
    const files = event.dataTransfer.files;
    const point = boardPointFromClient(event.clientX, event.clientY);
    void uploadFiles(files, point);
  };

  const startDrag = (event: ReactPointerEvent, item: ArtDirectionBoardItem) => {
    if (readOnly) return;
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input, button, a")) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedItemId(item.id);
    setDragState({
      id: item.id,
      offsetX: event.clientX - rect.left - item.x,
      offsetY: event.clientY - rect.top - item.y
    });
    bringToFront(item.id);
  };

  const bringToFront = (itemId: string) => {
    patchItem(itemId, { zIndex: nextZIndex(latestBoardRef.current) }, false);
  };

  const removeItem = (itemId: string) => {
    if (readOnly) return;
    const next = {
      ...localBoard,
      items: localBoard.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString()
    };
    setSelectedItemId("");
    commitBoard(next);
  };

  const insertionPoint = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return { x: BOARD_PADDING + 140, y: BOARD_PADDING + 120 };
    return {
      x: clamp(scroller.scrollLeft + 260, BOARD_PADDING, localBoard.width - 520),
      y: clamp(scroller.scrollTop + 180, BOARD_PADDING, localBoard.height - 420)
    };
  };

  const boardPointFromClient = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return insertionPoint();
    return {
      x: clamp(clientX - rect.left, BOARD_PADDING, localBoard.width - 520),
      y: clamp(clientY - rect.top, BOARD_PADDING, localBoard.height - 420)
    };
  };

  return (
    <section className="art-direction-page">
      <header className="art-direction-hero">
        <div>
          <p>Production Whiteboard</p>
          <h1 className="font-display">{localBoard.title}</h1>
          <span>{localBoard.description}</span>
        </div>
        <div className="art-direction-stats">
          <strong>{localBoard.items.length}</strong>
          <span>{imageCount} images / {noteCount} notes</span>
          <small>{localBoard.driveFolderName ? `Drive: ${localBoard.driveFolderName}` : "Drive folder will be created on first upload."}</small>
        </div>
      </header>

      <div className="art-direction-toolbar">
        <button type="button" className="button-frame" onClick={addTextNote} disabled={readOnly}>
          <Icon name="StickyNote" className="h-4 w-4" />
          Add Text
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={readOnly || busy}>
          <Icon name="UploadCloud" className="h-4 w-4" />
          Upload Image
        </button>
        <button type="button" onClick={importFromDrive} disabled={readOnly || busy}>
          <Icon name="FolderOpen" className="h-4 w-4" />
          Import From Drive
        </button>
        <button
          type="button"
          onClick={() => localBoard.driveFolderLink && window.open(localBoard.driveFolderLink, "_blank", "noopener,noreferrer")}
          disabled={!localBoard.driveFolderLink}
        >
          <Icon name="ExternalLink" className="h-4 w-4" />
          Open Folder
        </button>
        <button
          type="button"
          onClick={() => {
            if (!scrollerRef.current) return;
            scrollerRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
          }}
        >
          <Icon name="RefreshCw" className="h-4 w-4" />
          Top Left
        </button>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(event) => {
            if (event.currentTarget.files) void uploadFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        {message && <span className={`art-direction-message ${busy ? "busy" : ""}`}>{message}</span>}
      </div>

      <div className="art-direction-layout">
        <div
          ref={scrollerRef}
          className={`art-direction-scroller ${draggingFiles ? "dragging-files" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDraggingFiles(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
            setDraggingFiles(false);
          }}
          onDrop={handleBoardDrop}
        >
          <div
            ref={boardRef}
            className={`art-direction-board ${localBoard.background === "plain" ? "plain" : ""}`}
            style={{ width: localBoard.width, height: localBoard.height }}
          >
            <div className="art-direction-origin">
              <Icon name="Compass" className="h-4 w-4" />
              Art Direction Board
            </div>
            {localBoard.items.map((item) => (
              <article
                key={item.id}
                className={`art-direction-item ${item.type} ${selectedItemId === item.id ? "selected" : ""} ${dragState?.id === item.id ? "dragging" : ""}`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  zIndex: item.zIndex,
                  background: item.type === "text" ? item.color || "#fff7d6" : undefined
                }}
                onPointerDown={(event) => startDrag(event, item)}
                onClick={() => setSelectedItemId(item.id)}
              >
                <header>
                  <span>{item.type === "image" ? "Reference" : "Note"}</span>
                  {!readOnly && (
                    <button type="button" onClick={() => removeItem(item.id)} title="Remove from board">
                      <Icon name="Trash2" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </header>
                {item.type === "image" && item.image ? (
                  <>
                    <div className="art-direction-image-frame">
                      <DriveAwareImage src={item.image.thumbnailUrl || item.image.webViewLink} alt={item.title} />
                    </div>
                    <footer>
                      <strong>{item.title}</strong>
                      <span>{item.image.fileName}</span>
                    </footer>
                  </>
                ) : (
                  <textarea
                    value={item.text || ""}
                    disabled={readOnly}
                    onChange={(event) => patchItem(item.id, { text: event.target.value }, false)}
                    onBlur={() => commitBoard(latestBoardRef.current)}
                    aria-label={`${item.title} text`}
                  />
                )}
              </article>
            ))}
            {draggingFiles && (
              <div className="art-direction-drop-overlay">
                <Icon name="UploadCloud" className="h-10 w-10" />
                <strong>Drop images onto the board</strong>
                <span>They will upload to Google Drive and land right here.</span>
              </div>
            )}
          </div>
        </div>

        <aside className="art-direction-inspector">
          <div>
            <p>Selection</p>
            <h2 className="font-display">{selectedItem ? selectedItem.title : "Nothing selected"}</h2>
          </div>
          {selectedItem ? (
            <div className="art-direction-inspector-fields">
              <label>
                Title
                <input
                  value={selectedItem.title}
                  disabled={readOnly}
                  onChange={(event) => patchItem(selectedItem.id, { title: event.target.value }, false)}
                  onBlur={() => commitBoard(latestBoardRef.current)}
                />
              </label>
              <label>
                Notes
                <textarea
                  value={selectedItem.notes || ""}
                  disabled={readOnly}
                  onChange={(event) => patchItem(selectedItem.id, { notes: event.target.value }, false)}
                  onBlur={() => commitBoard(latestBoardRef.current)}
                />
              </label>
              <div className="art-direction-size-row">
                <button type="button" disabled={readOnly} onClick={() => patchItem(selectedItem.id, { width: Math.max(160, selectedItem.width - 80), height: Math.max(120, selectedItem.height - 60) })}>
                  Smaller
                </button>
                <button type="button" disabled={readOnly} onClick={() => patchItem(selectedItem.id, { width: selectedItem.width + 80, height: selectedItem.height + 60 })}>
                  Larger
                </button>
              </div>
              {selectedItem.type === "text" && (
                <div className="art-direction-color-row">
                  {["#fff7d6", "#dff7ff", "#eadcff", "#e4f8dd", "#ffe1d6"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      disabled={readOnly}
                      style={{ background: color }}
                      className={selectedItem.color === color ? "active" : ""}
                      onClick={() => patchItem(selectedItem.id, { color })}
                    />
                  ))}
                </div>
              )}
              {selectedItem.type === "image" && selectedItem.image?.webViewLink && (
                <a href={selectedItem.image.webViewLink} target="_blank" rel="noreferrer">
                  <Icon name="ExternalLink" className="h-4 w-4" />
                  Open Drive File
                </a>
              )}
            </div>
          ) : (
            <div className="art-direction-inspector-empty">
              <Icon name="GripVertical" className="h-8 w-8" />
              <span>Click a note or reference to edit its title, notes, and size.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function createImageItemFromUpload(
  uploaded: UploadedDriveFile,
  sourceFile: File,
  size: { width: number; height: number },
  point: { x: number; y: number },
  user: GoogleAccountUser,
  folder: GoogleDriveFolder,
  zIndex: number
): ArtDirectionBoardItem {
  const stamp = new Date().toISOString();
  const driveFileId = uploaded.id;
  const width = Math.min(620, Math.max(280, size.width || 420));
  const height = Math.min(520, Math.max(220, size.height || 300));
  return {
    id: `art-image-${driveFileId || Date.now()}`,
    type: "image",
    title: stripFileExtension(sourceFile.name) || uploaded.name || "Art Direction Reference",
    x: point.x,
    y: point.y,
    width,
    height,
    zIndex,
    image: {
      driveFileId,
      thumbnailUrl: googleDriveThumbnailUrl(driveFileId),
      webViewLink: uploaded.webViewLink || googleDriveWebViewLink(driveFileId),
      fileName: uploaded.name || sourceFile.name,
      mimeType: uploaded.mimeType || sourceFile.type,
      width: size.width,
      height: size.height,
      uploadedAt: stamp,
      uploadedByName: user.name,
      uploadedByEmail: user.email,
      driveFolderId: folder.id,
      driveFolderLink: folder.url,
      driveFolderName: folder.name
    },
    createdAt: stamp,
    updatedAt: stamp
  };
}

function createImageItemFromPickedFile(
  picked: GooglePickerFile,
  point: { x: number; y: number },
  user: GoogleAccountUser,
  folder: GoogleDriveFolder | undefined,
  zIndex: number
): ArtDirectionBoardItem {
  const stamp = new Date().toISOString();
  return {
    id: `art-image-${picked.id || Date.now()}`,
    type: "image",
    title: stripFileExtension(picked.name) || "Art Direction Reference",
    x: point.x,
    y: point.y,
    width: 460,
    height: 340,
    zIndex,
    image: {
      driveFileId: picked.id,
      thumbnailUrl: googleDriveThumbnailUrl(picked.id),
      webViewLink: picked.url || googleDriveWebViewLink(picked.id),
      fileName: picked.name,
      mimeType: picked.mimeType,
      width: 0,
      height: 0,
      uploadedAt: stamp,
      uploadedByName: user.name,
      uploadedByEmail: user.email,
      driveFolderId: folder?.id || "",
      driveFolderLink: folder?.url || "",
      driveFolderName: folder?.name || ""
    },
    createdAt: stamp,
    updatedAt: stamp
  };
}

function folderFromBoard(board: ArtDirectionBoard): GoogleDriveFolder {
  return {
    id: board.driveFolderId,
    name: board.driveFolderName || "Art Direction",
    url: board.driveFolderLink,
    mimeType: "application/vnd.google-apps.folder"
  };
}

function nextZIndex(board: ArtDirectionBoard) {
  return Math.max(0, ...board.items.map((item) => item.zIndex || 0)) + 1;
}

function stripFileExtension(name: string) {
  return String(name || "").replace(/\.[a-z0-9]+$/i, "").trim();
}

function getImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
