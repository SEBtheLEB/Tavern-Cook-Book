import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { LoreEntry } from "../types";

interface KeywordContextValue {
  keywords: string[];
  onKeywordClick?: (keyword: string) => void;
}

const KeywordContext = createContext<KeywordContextValue>({ keywords: [] });

export function LoreKeywordProvider({
  keywords,
  onKeywordClick,
  children
}: KeywordContextValue & { children: ReactNode }) {
  return (
    <KeywordContext.Provider value={{ keywords, onKeywordClick }}>
      {children}
    </KeywordContext.Provider>
  );
}

export function LoreKeywordText({ text }: { text: string }) {
  const { keywords, onKeywordClick } = useContext(KeywordContext);
  const parts = useMemo(() => splitKeywordText(text, keywords), [text, keywords]);

  if (!parts.some((part) => part.keyword)) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.keyword ? (
          <button
            key={`${part.text}-${index}`}
            className="lore-keyword-link"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onKeywordClick?.(part.keyword || part.text);
            }}
            title={`Show references for ${part.keyword || part.text}`}
          >
            {part.text}
          </button>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        )
      )}
    </>
  );
}

export function buildLoreKeywords(entries: LoreEntry[]) {
  const seen = new Set<string>();
  const keywords: string[] = [];

  const add = (value: string) => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (clean.length < 3) return;
    const normalized = clean.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    keywords.push(clean);
  };

  entries.forEach((entry) => {
    add(entry.title);
    add(entry.title.replace(/^Secret:\s*/i, ""));
    add(entry.title.replace(/^Public\s+/i, ""));
    entry.title.split(/\s*\/\s*/).forEach(add);
  });

  return keywords.sort((a, b) => b.length - a.length);
}

function splitKeywordText(text: string, keywords: string[]) {
  if (!text || !keywords.length) return [{ text }];

  const canonical = new Map(keywords.map((keyword) => [keyword.toLowerCase(), keyword]));
  const escaped = keywords.map(escapeRegExp).filter(Boolean);
  if (!escaped.length) return [{ text }];

  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped.join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu");
  const parts: Array<{ text: string; keyword?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const prefix = match[1] || "";
    const value = match[2] || "";
    const start = match.index + prefix.length;
    const end = start + value.length;
    if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start) });
    parts.push({ text: value, keyword: canonical.get(value.toLowerCase()) || value });
    lastIndex = end;
  }

  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts.length ? parts : [{ text }];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
