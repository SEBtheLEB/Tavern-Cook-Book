const richTagPattern = /<\/?(strong|b|em|i|u|span|font|h2|h3|h4|p|div|br|ul|ol|li)(\s|>|\/)/i;
const blockClosePattern = /<\/(p|div|h2|h3|h4|li)>/gi;

const allowedTags = new Set(["strong", "b", "em", "i", "u", "span", "font", "h2", "h3", "h4", "p", "div", "br", "ul", "ol", "li"]);

export function isRichText(value: string) {
  return richTagPattern.test(value);
}

export function richTextToPlainText(value: string) {
  if (!value) return "";
  if (!isRichText(value)) return value;

  const withBreaks = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li(\s[^>]*)?>/gi, "- ")
    .replace(blockClosePattern, "\n");

  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainTextToRichHtml(value: string) {
  const paragraphs = value.split(/\n{2,}/).map((paragraph) => paragraph.trim());
  return paragraphs
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function prepareRichEditorHtml(value: string) {
  if (!value.trim()) return "";
  return isRichText(value) ? sanitizeRichHtml(value) : plainTextToRichHtml(value);
}

export function sanitizeRichHtml(value: string) {
  if (!value.trim()) return "";
  if (typeof DOMParser === "undefined") return isRichText(value) ? richTextToPlainText(value) : escapeHtml(value);

  const document = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  const root = document.body.firstElementChild;
  const html = Array.from(root?.childNodes || []).map(sanitizeNode).join("");
  return richTextToPlainText(html).trim() ? html : "";
}

function sanitizeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(sanitizeNode).join("");

  if (!allowedTags.has(tag)) return children;
  if (tag === "br") return "<br>";

  const normalizedTag = tag === "b" ? "strong" : tag === "i" ? "em" : tag === "font" ? "span" : tag;
  const attributes = normalizedTag === "span" ? spanAttributes(element) : "";
  return `<${normalizedTag}${attributes}>${children}</${normalizedTag}>`;
}

function spanAttributes(element: HTMLElement) {
  const classes = (element.getAttribute("class") || "").split(/\s+/);
  const hasOutline = classes.includes("rich-text-outline");
  const color = safeColor(element.style.color || element.getAttribute("color") || "");
  const attrs = [];

  if (hasOutline) attrs.push('class="rich-text-outline"');
  if (color) attrs.push(`style="color: ${escapeAttribute(color)}"`);
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function safeColor(value: string) {
  const color = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
  if (/^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
  return "";
}

function decodeHtmlEntities(value: string) {
  if (typeof document === "undefined") {
    return value
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, "&quot;");
}
