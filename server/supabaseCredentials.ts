export function supabaseBackendKey() {
  return (
    process.env.TAVERN_SUPABASE_PUBLISHABLE_KEY
    || process.env.TAVERN_SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SECRET_KEY
    || process.env.TAVERN_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ""
  ).trim();
}

export function supabaseBackendHeaders(dataApi = false): Record<string, string> {
  const key = supabaseBackendKey();
  const token = process.env.TAVERN_SUPABASE_ACCESS_TOKEN?.trim();
  const schema = process.env.TAVERN_SUPABASE_SCHEMA?.trim() || "public";
  if (schema !== "public" && schema !== "tavern") throw new Error("TAVERN_SUPABASE_SCHEMA must be public or tavern.");
  if (schema === "tavern" && (!token || !process.env.TAVERN_SUPABASE_PUBLISHABLE_KEY?.trim())) {
    throw new Error("Shared Tavern storage requires its scoped access token and publishable key.");
  }
  const headers: Record<string, string> = { apikey: key, Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  if (dataApi) {
    headers["Accept-Profile"] = schema;
    headers["Content-Profile"] = schema;
  }
  return headers;
}
