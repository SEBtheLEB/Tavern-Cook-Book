import type { IncomingHttpHeaders } from "node:http";

const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface DriveListRequest {
  method: string;
  url?: string;
  headers: IncomingHttpHeaders;
}

interface DriveListItem {
  id: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

interface DriveListResponse {
  files?: DriveListItem[];
  nextPageToken?: string;
  error?: {
    message?: string;
  } | string;
}

export async function handleDriveListRequest(request: DriveListRequest) {
  if (request.method !== "GET") {
    return { status: 405, body: { error: "Method not allowed." } };
  }

  const token = bearerToken(request.headers);
  if (!token) {
    return { status: 401, body: { error: "Google Drive sign-in token is missing." } };
  }

  const requestUrl = new URL(request.url || "/api/drive-list", "http://localhost");
  const mode = requestUrl.searchParams.get("mode") === "folder" ? "folder" : "image";
  const search = requestUrl.searchParams.get("search") || "";
  const pageToken = requestUrl.searchParams.get("pageToken") || "";
  const params = new URLSearchParams({
    corpora: "user",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    spaces: "drive",
    pageSize: "60",
    fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,modifiedTime)",
    orderBy: mode === "folder" ? "name_natural" : "modifiedTime desc,name_natural",
    q: buildDriveListQuery(mode, search)
  });
  if (pageToken) params.set("pageToken", pageToken);

  try {
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const payload = await readDrivePayload(driveResponse);
    if (!driveResponse.ok) {
      return {
        status: driveResponse.status,
        body: {
          error: driveErrorMessage(payload, "Could not load Google Drive items.")
        }
      };
    }

    return {
      status: 200,
      body: {
        files: Array.isArray(payload.files) ? payload.files.filter((item) => item?.id) : [],
        nextPageToken: payload.nextPageToken || ""
      }
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: error instanceof Error ? error.message : "Could not reach Google Drive."
      }
    };
  }
}

function buildDriveListQuery(mode: "image" | "folder", search: string) {
  const clauses = ["trashed=false"];
  if (mode === "folder") {
    clauses.push(`mimeType='${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`);
  } else {
    clauses.push(`(${IMAGE_MIME_TYPES.map((mimeType) => `mimeType='${mimeType}'`).join(" or ")})`);
  }

  const cleanSearch = driveQueryValue(search);
  if (cleanSearch) clauses.push(`name contains '${cleanSearch}'`);
  return clauses.join(" and ");
}

function driveQueryValue(value: string) {
  return value.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function readDrivePayload(response: Response): Promise<DriveListResponse> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as DriveListResponse;
  } catch {
    return { error: response.statusText || text };
  }
}

function driveErrorMessage(payload: DriveListResponse, fallback: string) {
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (payload.error && typeof payload.error === "object" && payload.error.message) return payload.error.message;
  return fallback;
}

function bearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization || headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}
