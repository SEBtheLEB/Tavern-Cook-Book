import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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

interface PanState {
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
}

const BOARD_PADDING = 80;
const TEXT_BACKGROUND_SWATCHES = ["#fff7d6", "#dff7ff", "#eadcff", "#e4f8dd", "#ffe1d6", "#111827"];
const TEXT_COLOR_SWATCHES = ["#2c1d12", "#fff0d6", "#d8a85d", "#7dd3fc", "#86efac", "#fda4af"];
const TEXT_FONT_OPTIONS = [
  { value: "body", label: "Clean Sans" },
  { value: "display", label: "Tavern Serif" },
  { value: "handwritten", label: "Sketch Note" },
  { value: "mono", label: "Production Mono" }
];
const TEXT_STYLE_OPTIONS: Array<{ value: NonNullable<ArtDirectionBoardItem["textStyle"]>; label: string }> = [
  { value: "body", label: "Body" },
  { value: "heading", label: "Heading" },
  { value: "caption", label: "Caption" }
];

export function ArtDirectionPage({ database, readOnly, currentUser, onDatabaseChange }: ArtDirectionPageProps) {
  const board = useMemo(() => normalizeArtDirectionBoard(database.artDirection), [database.artDirection]);
  const [localBoard, setLocalBoard] = useState<ArtDirectionBoard>(board);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [textPlacementActive, setTextPlacementActive] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestBoardRef = useRef(localBoard);
  const panStateRef = useRef<PanState | null>(null);

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
      const activeItem = latestBoardRef.current.items.find((item) => item.id === dragState.id);
      const rect = element.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left - dragState.offsetX, 0, Math.max(0, localBoard.width - (activeItem?.width || 120)));
      const y = clamp(event.clientY - rect.top - dragState.offsetY, 0, Math.max(0, localBoard.height - (activeItem?.height || 120)));
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

  useEffect(() => {
    if (!isPanning) return;

    const handlePointerMove = (event: PointerEvent) => {
      const scroller = scrollerRef.current;
      const panState = panStateRef.current;
      if (!scroller || !panState) return;
      const deltaX = event.clientX - panState.startX;
      const deltaY = event.clientY - panState.startY;
      scroller.scrollLeft = panState.startScrollLeft - deltaX;
      scroller.scrollTop = panState.startScrollTop - deltaY;
      event.preventDefault();
    };

    const stopPanning = () => {
      panStateRef.current = null;
      setIsPanning(false);
    };

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopPanning, { once: true });
    window.addEventListener("pointercancel", stopPanning, { once: true });
    return () => {
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopPanning);
      window.removeEventListener("pointercancel", stopPanning);
    };
  }, [isPanning]);

  useEffect(() => {
    if (!isFullscreen && !textPlacementActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (textPlacementActive) {
        setTextPlacementActive(false);
        setMessage("");
        return;
      }
      if (isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, textPlacementActive]);

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

  const startTextPlacement = () => {
    if (readOnly) return;
    setTextPlacementActive((active) => {
      const next = !active;
      setMessage(next ? "Click the board where you want the text box." : "");
      return next;
    });
  };

  const addTextNoteAt = (point: { x: number; y: number }) => {
    if (readOnly) return;
    const stamp = new Date().toISOString();
    const current = latestBoardRef.current;
    const width = 340;
    const height = 210;
    const item: ArtDirectionBoardItem = {
      id: `art-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "text",
      title: "Direction Note",
      text: "New art direction note",
      color: "#fff7d6",
      textColor: "#2c1d12",
      textStyle: "body",
      fontSize: 18,
      fontFamily: "body",
      x: clamp(point.x, BOARD_PADDING, current.width - width),
      y: clamp(point.y, BOARD_PADDING, current.height - height),
      width,
      height,
      zIndex: nextZIndex(current),
      createdAt: stamp,
      updatedAt: stamp
    };
    setSelectedItemId(item.id);
    setTextPlacementActive(false);
    setMessage("");
    commitBoard({ ...current, items: [...current.items, item], updatedAt: stamp });
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
    event.stopPropagation();
    setDraggingFiles(false);
    if (readOnly || busy) return;
    const files = event.dataTransfer.files;
    if (!files.length) return;
    const point = boardPointFromClient(event.clientX, event.clientY);
    void uploadFiles(files, point);
  };

  const handleBoardClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!textPlacementActive || readOnly || busy) return;
    event.preventDefault();
    const point = boardPointFromClient(event.clientX, event.clientY);
    addTextNoteAt(point);
  };

  const startBoardPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea")) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    event.preventDefault();
    setControlsOpen(true);
    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: scroller.scrollLeft,
      startScrollTop: scroller.scrollTop
    };
    setIsPanning(true);
  };

  const startDrag = (event: ReactPointerEvent, item: ArtDirectionBoardItem) => {
    if (readOnly) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("textarea, input, button, a")) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
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
    <section className={`art-direction-page ${isFullscreen ? "board-fullscreen" : ""}`}>
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
        <button type="button" className={textPlacementActive ? "button-frame active" : "button-frame"} onClick={startTextPlacement} disabled={readOnly}>
          <Icon name="StickyNote" className="h-4 w-4" />
          {textPlacementActive ? "Click Board" : "Add Text"}
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
        <button type="button" onClick={() => setControlsOpen((open) => !open)} className={controlsOpen ? "active" : ""}>
          <Icon name="PanelsTopLeft" className="h-4 w-4" />
          Controls
        </button>
        <button type="button" className="button-frame" onClick={() => setIsFullscreen((fullscreen) => !fullscreen)}>
          <Icon name={isFullscreen ? "Minimize2" : "Maximize2"} className="h-4 w-4" />
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen Board"}
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

      {controlsOpen && (
        <section className="art-direction-controls-panel">
          <button type="button" className="art-direction-controls-close" onClick={() => setControlsOpen(false)} title="Close controls">
            <Icon name="X" className="h-4 w-4" />
          </button>
          <div>
            <strong>Board Controls</strong>
            <span>Middle mouse hold + drag the board like paper. Drag left to move your view right, drag up to move your view down.</span>
          </div>
          <div>
            <strong>Arrange</strong>
            <span>Left-drag images or notes to move the actual board item. Drop image files onto the board to upload them into the Art Direction Drive folder.</span>
          </div>
          <div>
            <strong>Text</strong>
            <span>Click Add Text, then click the board where the text box should land. Select it to change color, style, size, and font.</span>
          </div>
          <div>
            <strong>Fullscreen</strong>
            <span>Use Fullscreen Board for a larger workspace. Press Escape to leave fullscreen.</span>
          </div>
        </section>
      )}

      <div className="art-direction-layout">
        <div
          ref={scrollerRef}
          className={`art-direction-scroller ${draggingFiles ? "dragging-files" : ""} ${isPanning ? "panning" : ""} ${textPlacementActive ? "placing-text" : ""}`}
          onPointerDown={startBoardPan}
          onAuxClick={(event) => {
            if (event.button === 1) event.preventDefault();
          }}
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
            onClick={handleBoardClick}
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
                draggable={false}
                onPointerDown={(event) => startDrag(event, item)}
                onDragStart={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedItemId(item.id);
                }}
              >
                {item.type === "image" && item.image ? (
                  <>
                    <div className="art-direction-image-frame">
                      <DriveAwareImage
                        src={item.image.thumbnailUrl || item.image.webViewLink}
                        alt={item.title}
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                      />
                    </div>
                    {!readOnly && (
                      <button type="button" className="art-direction-item-remove" onClick={() => removeItem(item.id)} title="Remove image from board">
                        <Icon name="Trash2" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <header>
                      <span>Text</span>
                      {!readOnly && (
                        <button type="button" onClick={() => removeItem(item.id)} title="Remove text from board">
                          <Icon name="Trash2" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </header>
                    <textarea
                      value={item.text || ""}
                      disabled={readOnly}
                      onChange={(event) => patchItem(item.id, { text: event.target.value }, false)}
                      onBlur={() => commitBoard(latestBoardRef.current)}
                      aria-label={`${item.title} text`}
                      style={{
                        color: item.textColor || "#2c1d12",
                        fontSize: `${item.fontSize || 18}px`,
                        fontFamily: artDirectionFontFamily(item.fontFamily),
                        fontWeight: item.textStyle === "heading" ? 900 : item.textStyle === "caption" ? 700 : 600,
                        lineHeight: item.textStyle === "heading" ? 1.16 : 1.42
                      }}
                    />
                  </>
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
                <div className="art-direction-text-style-fields">
                  <label>
                    Text Style
                    <div className="art-direction-segment-row">
                      {TEXT_STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          disabled={readOnly}
                          className={(selectedItem.textStyle || "body") === option.value ? "active" : ""}
                          onClick={() => patchItem(selectedItem.id, textStylePatch(option.value))}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label>
                    Font
                    <select
                      value={selectedItem.fontFamily || "body"}
                      disabled={readOnly}
                      onChange={(event) => patchItem(selectedItem.id, { fontFamily: event.target.value })}
                    >
                      {TEXT_FONT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Text Size
                    <div className="art-direction-text-size-field">
                      <input
                        type="range"
                        min={12}
                        max={72}
                        value={selectedItem.fontSize || 18}
                        disabled={readOnly}
                        onChange={(event) => patchItem(selectedItem.id, { fontSize: Number(event.target.value) }, false)}
                        onBlur={() => commitBoard(latestBoardRef.current)}
                      />
                      <input
                        type="number"
                        min={12}
                        max={96}
                        value={selectedItem.fontSize || 18}
                        disabled={readOnly}
                        onChange={(event) => patchItem(selectedItem.id, { fontSize: Number(event.target.value) || 18 }, false)}
                        onBlur={() => commitBoard(latestBoardRef.current)}
                      />
                    </div>
                  </label>
                  <label>
                    Text Color
                    <div className="art-direction-color-row">
                      {TEXT_COLOR_SWATCHES.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          disabled={readOnly}
                          style={{ background: color }}
                          className={(selectedItem.textColor || "#2c1d12").toLowerCase() === color.toLowerCase() ? "active" : ""}
                          onClick={() => patchItem(selectedItem.id, { textColor: color })}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedItem.textColor || "#2c1d12"}
                        disabled={readOnly}
                        onChange={(event) => patchItem(selectedItem.id, { textColor: event.target.value })}
                        aria-label="Custom text color"
                      />
                    </div>
                  </label>
                  <label>
                    Box Color
                    <div className="art-direction-color-row">
                      {TEXT_BACKGROUND_SWATCHES.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          disabled={readOnly}
                          style={{ background: color }}
                          className={(selectedItem.color || "#fff7d6").toLowerCase() === color.toLowerCase() ? "active" : ""}
                          onClick={() => patchItem(selectedItem.id, { color })}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedItem.color || "#fff7d6"}
                        disabled={readOnly}
                        onChange={(event) => patchItem(selectedItem.id, { color: event.target.value })}
                        aria-label="Custom text box color"
                      />
                    </div>
                  </label>
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

function artDirectionFontFamily(value: string | undefined) {
  if (value === "display") return "Georgia, Cambria, 'Times New Roman', serif";
  if (value === "handwritten") return "'Segoe Print', 'Bradley Hand ITC', 'Comic Sans MS', cursive";
  if (value === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
  return "Inter, ui-sans-serif, system-ui, sans-serif";
}

function textStylePatch(style: NonNullable<ArtDirectionBoardItem["textStyle"]>): Partial<ArtDirectionBoardItem> {
  if (style === "heading") return { textStyle: style, fontSize: 34, fontFamily: "display" };
  if (style === "caption") return { textStyle: style, fontSize: 14, fontFamily: "body" };
  return { textStyle: style, fontSize: 18, fontFamily: "body" };
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
