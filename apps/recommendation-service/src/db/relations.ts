import { relations } from "drizzle-orm";
import { content } from "./tables/content";
import { events } from "./tables/events";
import { userProfiles } from "./tables/user-profiles";
import { viewHistory } from "./tables/view-history";

export const contentRelations = relations(content, ({ many }) => ({
  events: many(events),
  viewHistory: many(viewHistory),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  content: one(content, { fields: [events.contentId], references: [content.id] }),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  viewHistory: many(viewHistory),
}));

export const viewHistoryRelations = relations(viewHistory, ({ one }) => ({
  user: one(userProfiles, { fields: [viewHistory.userId], references: [userProfiles.id] }),
  content: one(content, { fields: [viewHistory.contentId], references: [content.id] }),
}));
