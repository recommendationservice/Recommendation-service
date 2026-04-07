import type { content } from "./tables/content";
import type { events } from "./tables/events";
import type { userProfiles } from "./tables/user-profiles";
import type { viewHistory } from "./tables/view-history";

export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type ViewHistory = typeof viewHistory.$inferSelect;
export type NewViewHistory = typeof viewHistory.$inferInsert;
