import { createContext, useContext } from "react";
import type { RealtimeTarget, RealtimeUserSummary } from "../utils/realtimeCollaboration";

interface RealtimeCollaborationContextValue {
  enabled: boolean;
  users: RealtimeUserSummary[];
  setHoverTarget: (target: RealtimeTarget | null) => void;
  usersHoveringTarget: (target: RealtimeTarget) => RealtimeUserSummary[];
}

const defaultValue: RealtimeCollaborationContextValue = {
  enabled: false,
  users: [],
  setHoverTarget: () => {},
  usersHoveringTarget: () => []
};

export const RealtimeCollaborationContext = createContext(defaultValue);

export function useRealtimeCollaboration() {
  return useContext(RealtimeCollaborationContext);
}

export function realtimeTargetKey(target: RealtimeTarget) {
  return `${target.type}:${target.id}`;
}
