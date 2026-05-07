import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, MouseEvent, ReactNode } from "react";
import { escapeHtml, isRichText, prepareRichEditorHtml, richTextToPlainText, sanitizeRichHtml } from "../utils/richText";
import { Icon } from "./Icon";
import { LoreKeywordText } from "./LoreKeywordText";

const colorSwatches = [
  { label: "Ink", value: "#2c2119" },
  { label: "Gold", value: "#d99b32" },
  { label: "Amber", value: "#b65d38" },
  { label: "Teal", value: "#216f67" },
  { label: "Plum", value: "#6a476d" },
  { label: "Red", value: "#a83232" }
];

interface RichTextEditorProps {
  value: string;
  placeholder: string;
  tall?: boolean;
  onChange: (value: string) => void;
}

export function RichTextEditor({ value, placeholder, tall = false, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(!richTextToPlainText(value).trim());
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const nextHtml = prepareRichEditorHtml(value);
    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
    setIsEmpty(!richTextToPlainText(nextHtml).trim());
  }, [value]);

  const syncChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = sanitizeRichHtml(editor.innerHTML);
    setIsEmpty(!richTextToPlainText(nextHtml).trim());
    onChange(nextHtml);
  };

  const getSelectedEditorRange = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.isCollapsed || !selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  };

  const rememberSelection = (clearWhenEmpty = false) => {
    const range = getSelectedEditorRange();
    if (!range) {
      if (clearWhenEmpty) savedRangeRef.current = null;
      return false;
    }
    savedRangeRef.current = range.cloneRange();
    return true;
  };

  useEffect(() => {
    const updateSelection = () => {
      rememberSelection();
    };

    document.addEventListener("selectionchange", updateSelection);
    return () => document.removeEventListener("selectionchange", updateSelection);
  });

  useEffect(() => {
    if (!toolbarPosition) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolbarRef.current?.contains(target) || editorRef.current?.contains(target)) return;
      setToolbarPosition(null);
      savedRangeRef.current = null;
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setToolbarPosition(null);
      savedRangeRef.current = null;
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [toolbarPosition]);

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    syncChange();
    setToolbarPosition(null);
  };

  const formatBlock = (tag: "p" | "h3") => {
    runCommand("formatBlock", tag);
  };

  const applyColor = (color: string) => {
    runCommand("foreColor", color);
  };

  const applyOutline = () => {
    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !selection.rangeCount || !editor) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    if (selection.isCollapsed) {
      document.execCommand("insertHTML", false, '<span class="rich-text-outline">outlined text</span>');
      syncChange();
      return;
    }

    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());
    const selectedHtml = sanitizeRichHtml(holder.innerHTML) || escapeHtml(selection.toString());
    document.execCommand("insertHTML", false, `<span class="rich-text-outline">${selectedHtml}</span>`);
    syncChange();
    setToolbarPosition(null);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, prepareRichEditorHtml(text));
    syncChange();
  };

  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    rememberSelection(event.button === 0);
  };

  const handleKeyUp = () => {
    rememberSelection(true);
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    event.preventDefault();
    event.stopPropagation();

    const liveRange = getSelectedEditorRange();
    if (liveRange) savedRangeRef.current = liveRange.cloneRange();

    const savedRange = savedRangeRef.current;
    if (!editor || !savedRange || savedRange.collapsed || !editor.contains(savedRange.commonAncestorContainer)) {
      setToolbarPosition(null);
      return;
    }

    restoreSelection();
    setToolbarPosition({
      x: clamp(event.clientX, 170, window.innerWidth - 170),
      y: clamp(event.clientY, 74, window.innerHeight - 24)
    });
  };

  return (
    <div className={`rich-text-editor ${tall ? "tall" : ""}`}>
      <div
        ref={editorRef}
        className={`rich-text-editable entry-scroll ${tall ? "tall" : ""}`}
        contentEditable
        data-empty={isEmpty ? "true" : "false"}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={syncChange}
        onBlur={syncChange}
        onPaste={handlePaste}
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        onContextMenu={handleContextMenu}
      />

      {toolbarPosition && (
        <div
          ref={toolbarRef}
          className="rich-text-context-toolbar"
          style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
          aria-label="Selected text formatting tools"
        >
          <button type="button" className="rich-text-tool-button" title="Normal text" onMouseDown={keepSelection} onClick={() => formatBlock("p")}>
            <Icon name="Pilcrow" className="h-4 w-4" />
          </button>
          <button type="button" className="rich-text-tool-button" title="Make header" onMouseDown={keepSelection} onClick={() => formatBlock("h3")}>
            <Icon name="Heading3" className="h-4 w-4" />
          </button>
          <button type="button" className="rich-text-tool-button" title="Bold" onMouseDown={keepSelection} onClick={() => runCommand("bold")}>
            <Icon name="Bold" className="h-4 w-4" />
          </button>
          <button type="button" className="rich-text-tool-button" title="Outline text" onMouseDown={keepSelection} onClick={applyOutline}>
            <Icon name="TypeOutline" className="h-4 w-4" />
          </button>
          <div className="rich-text-color-group" aria-label="Text colors">
            <Icon name="Palette" className="h-4 w-4" />
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                className="rich-text-color-swatch"
                title={swatch.label}
                style={{ backgroundColor: swatch.value }}
                onMouseDown={keepSelection}
                onClick={() => applyColor(swatch.value)}
              />
            ))}
          </div>
          <button type="button" className="rich-text-tool-button" title="Clear formatting" onMouseDown={keepSelection} onClick={() => runCommand("removeFormat")}>
            <Icon name="Eraser" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function RichLoreText({ text }: { text: string }) {
  const nodes = useMemo(() => renderRichText(text), [text]);
  if (!text) return null;
  return <div className="rich-lore-text">{nodes}</div>;
}

function keepSelection(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function renderRichText(text: string) {
  if (!isRichText(text)) return <LoreKeywordText text={text} />;
  if (typeof DOMParser === "undefined") return <LoreKeywordText text={richTextToPlainText(text)} />;

  const sanitized = sanitizeRichHtml(text);
  const document = new DOMParser().parseFromString(`<div>${sanitized}</div>`, "text/html");
  const root = document.body.firstElementChild;
  const children = Array.from(root?.childNodes || []).map((node, index) => renderNode(node, `rich-${index}`));
  return children.length ? children : <LoreKeywordText text={richTextToPlainText(text)} />;
}

function renderNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return <LoreKeywordText key={key} text={node.textContent || ""} />;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) => renderNode(child, `${key}-${index}`));
  const style = element.style.color ? { color: element.style.color } : undefined;

  if (tag === "strong") return <strong key={key}>{children}</strong>;
  if (tag === "em") return <em key={key}>{children}</em>;
  if (tag === "u") return <u key={key}>{children}</u>;
  if (tag === "h2") return <h2 key={key}>{children}</h2>;
  if (tag === "h3") return <h3 key={key}>{children}</h3>;
  if (tag === "h4") return <h4 key={key}>{children}</h4>;
  if (tag === "p") return <p key={key}>{children}</p>;
  if (tag === "div") return <div key={key}>{children}</div>;
  if (tag === "br") return <br key={key} />;
  if (tag === "ul") return <ul key={key}>{children}</ul>;
  if (tag === "ol") return <ol key={key}>{children}</ol>;
  if (tag === "li") return <li key={key}>{children}</li>;
  if (tag === "span") {
    const className = element.classList.contains("rich-text-outline") ? "rich-text-outline" : undefined;
    return (
      <span key={key} className={className} style={style}>
        {children}
      </span>
    );
  }
  return <span key={key}>{children}</span>;
}
