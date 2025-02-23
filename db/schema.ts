import { pgTable, serial, text, integer, boolean, bigint, timestamp } from "drizzle-orm/pg-core";

// Users table, tracking XP, username, and other relevant user data
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(), // Discord User ID
  username: text("username").notNull(),
  xp: integer("xp").default(0).notNull(), // Total XP earned
  coins: integer("coins").default(0).notNull(), // Coins earned
  badges: text("badges"), // Badges earned, stored as a comma-separated string
  level: integer("level").default(1), // User level based on XP
  achievements: text("achievements"), // Achievements unlocked, stored as a comma-separated string
});

// Tasks table, tracking tasks and their XP rewards
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"), // Optional task description
  xpReward: integer("xp_reward").notNull(), // XP rewarded for completing the task
  coinsReward: integer("coins_reward").default(0), // Coins rewarded for completing the task
  completed: boolean("completed").default(false), // Track completion status
  badgeReward: text("badge_reward"), // Optional badge awarded for task completion
  createdAt: text("created_at").default(new Date().toISOString()), // Timestamp for when the task was created
  updatedAt: text("updated_at").default(new Date().toISOString()), // Timestamp for when the task was last updated
});

// Achievements table, tracking specific achievements for users
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(), // Name of the achievement
  description: text("description"), // Achievement description
  unlockedAt: text("unlocked_at").default(new Date().toISOString()), // Timestamp when the achievement was unlocked
  badge: text("badge"), // Badge associated with the achievement
});

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  xpRequired: integer("xp_required").notNull(),
  coinsRequired: integer("coins_required").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});