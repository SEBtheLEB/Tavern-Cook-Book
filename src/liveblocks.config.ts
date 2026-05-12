import type { JsonObject, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      profile: JsonObject | null;
      location: JsonObject | null;
      hovering: JsonObject | null;
    };
    Storage: {
      database: LiveObject<{ value: JsonObject }>;
    };
    UserMeta: {
      id: string;
      info: {
        name?: string;
        email?: string;
        picture?: string;
        role?: string;
      };
    };
  }
}

export {};
