import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const source =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    ".codex",
    "sessions",
    "2026",
    "05",
    "07",
    "rollout-2026-05-07T00-11-07-019e00a1-d76a-7db1-bdc1-69130df53a65.jsonl",
  );

const outDir = path.join(process.cwd(), "docs", "imported-chat-history");
const outPath = path.join(outDir, "build-tavern-cook-book-app.transcript.md");

function extractMessageText(content = []) {
  return content
    .map((part) => part.text || part.input_text || part.output_text || "")
    .join("\n")
    .trim();
}

function redact(text) {
  return text
    .replace(/OPENAI_API_KEY=sk-[^\s]+/g, "OPENAI_API_KEY=your_key_here")
    .replace(/OPENAI_API_KEY=paste_your_real_key_here/g, "OPENAI_API_KEY=your_key_here")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_OPENAI_KEY]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GOOGLE_API_KEY]")
    .replace(
      /data:image\/[^;\s]+;base64,[A-Za-z0-9+/=_-]{200,}/g,
      "[OMITTED_DATA_IMAGE]",
    );
}

fs.mkdirSync(outDir, { recursive: true });

const reader = readline.createInterface({
  input: fs.createReadStream(source, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

const writer = fs.createWriteStream(outPath, { encoding: "utf8" });

writer.write("# Imported Chat History: Build Tavern Cook Book app\n\n");
writer.write("Source thread ID: 019e00a1-d76a-7db1-bdc1-69130df53a65  \n");
writer.write(`Source file: ${source}  \n`);
writer.write("Imported on: 2026-05-10  \n\n");
writer.write(
  "Scope: user and assistant text messages from the prior Codex thread. Tool calls, tool results, app/system/developer instructions, local environment boilerplate, and binary/base64 payloads were omitted or redacted to keep this project archive readable and safer to keep in the repo.\n\n",
);

let index = 0;
let users = 0;
let assistants = 0;

for await (const line of reader) {
  if (!line.trim()) {
    continue;
  }

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  const payload = event.payload;
  const isMessage =
    event.type === "response_item" &&
    payload?.type === "message" &&
    (payload.role === "user" || payload.role === "assistant");

  if (!isMessage) {
    continue;
  }

  let text = extractMessageText(payload.content);
  if (!text || text.startsWith("<environment_context>")) {
    continue;
  }

  text = redact(text);
  index += 1;
  if (payload.role === "user") {
    users += 1;
  } else {
    assistants += 1;
  }

  const phase = payload.phase ? ` (${payload.phase})` : "";
  writer.write(`## ${index}. ${payload.role.toUpperCase()}${phase} - ${event.timestamp}\n\n`);
  writer.write(`${text.replace(/\r\n/g, "\n")}\n\n`);
}

writer.end();
await new Promise((resolve) => writer.on("finish", resolve));

console.log(
  JSON.stringify(
    {
      outPath,
      messages: index,
      users,
      assistants,
    },
    null,
    2,
  ),
);
