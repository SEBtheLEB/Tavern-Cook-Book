import { useEffect, useMemo, useState } from "react";
import type { PublishChange } from "../utils/publishDiff";
import { Icon } from "./Icon";

interface SyncPublishModalProps {
  changes: PublishChange[];
  publishing: boolean;
  message: string;
  onClose: () => void;
  onPublish: (selectedChangeIds: string[]) => void;
}

const actionLabels: Record<PublishChange["action"], string> = {
  added: "Added",
  updated: "Changed",
  removed: "Removed"
};

export function SyncPublishModal({
  changes,
  publishing,
  message,
  onClose,
  onPublish
}: SyncPublishModalProps) {
  const defaultSelected = useMemo(
    () => changes.filter((change) => change.defaultSelected).map((change) => change.id),
    [changes]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);
  const selected = new Set(selectedIds);

  useEffect(() => {
    setSelectedIds(defaultSelected);
  }, [defaultSelected]);

  const toggleChange = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id]
    );
  };

  const selectAll = () => setSelectedIds(changes.map((change) => change.id));
  const selectRecommended = () => setSelectedIds(defaultSelected);

  return (
    <div className="sync-publish-backdrop">
      <section className="sync-publish-modal" role="dialog" aria-modal="true" aria-labelledby="sync-publish-title">
        <header>
          <div>
            <p>Push to team</p>
            <h2 id="sync-publish-title" className="font-display">Review Global Changes</h2>
          </div>
          <button className="sync-publish-icon-button" onClick={onClose} title="Close push review">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="sync-publish-toolbar">
          <span>{changes.length} module changes found</span>
          <div>
            <button onClick={selectRecommended} disabled={publishing}>Recommended</button>
            <button onClick={selectAll} disabled={publishing}>Select All</button>
          </div>
        </div>

        <div className="sync-publish-list entry-scroll">
          {changes.length ? (
            changes.map((change) => (
              <label key={change.id} className={`sync-publish-row ${selected.has(change.id) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.has(change.id)}
                  disabled={publishing}
                  onChange={() => toggleChange(change.id)}
                />
                <span className={`sync-publish-action ${change.action}`}>{actionLabels[change.action]}</span>
                <span className="sync-publish-copy">
                  <strong>{change.title}</strong>
                  <em>{change.moduleLabel}</em>
                  <small>{change.summary}</small>
                </span>
              </label>
            ))
          ) : (
            <div className="sync-publish-empty">
              <Icon name="RefreshCw" className="h-5 w-5" />
              No unpublished module changes are waiting.
            </div>
          )}
        </div>

        {message && <div className="sync-publish-message">{message}</div>}

        <footer>
          <button className="tab-frame rounded px-4 py-2" onClick={onClose} disabled={publishing}>
            Cancel
          </button>
          <button
            className="button-frame inline-flex items-center gap-2 rounded px-4 py-2"
            disabled={publishing || !selectedIds.length}
            onClick={() => onPublish(selectedIds)}
          >
            <Icon name="UploadCloud" className="h-4 w-4" />
            {publishing ? "Pushing..." : `Push ${selectedIds.length} Selected`}
          </button>
        </footer>
      </section>
    </div>
  );
}
