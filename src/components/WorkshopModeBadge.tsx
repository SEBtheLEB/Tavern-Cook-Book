import { workshopMode } from "../utils/workshopRuntime";

// Shown only inside STL Workshop. Standalone, Vercel and Tauri builds render nothing.
export function WorkshopModeBadge() {
  if (workshopMode === "standalone") return null;
  const live = workshopMode === "live";
  return (
    <div
      className={`stl-workshop-badge ${live ? "is-live" : "is-offline"}`}
      role="status"
      title={
        live
          ? "Local Cook Book source connected to the real team database, Drive metadata and permissions. This is not a deployment."
          : "Local Cook Book source with team sync, Google Drive, Tavern Scribe and narration disconnected. Nothing is saved to the team."
      }
    >
      <span className="stl-workshop-badge-dot" aria-hidden="true" />
      {live ? "Connected Live Preview" : "Workshop Offline Preview"}
    </div>
  );
}
