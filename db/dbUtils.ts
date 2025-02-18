import { db } from "./db";
import { tasks, users } from "./schema";
import { eq } from "drizzle-orm";

const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
  }
}

// find or create a user
export async function getOrCreateUser(discordId: string, username: string) {
  const existingUser = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (existingUser.length > 0) {
    return existingUser[0]; // Return existing user
  }

  const newUser = await db.insert(users).values({ discordId, username, xp:0, level:1}).returning();
  return newUser[0];
}

// update a user's XP and level.
export async function addXP(discordId: string, xpAmount: number) {
    const user = await db.select().from(users).where(eq(users.discordId, discordId)).then(res => res[0]);
  
    if (!user) return null;
  
    const newXP = user.xp + xpAmount;
    const newLevel = Math.floor(newXP / 100) + 1; // Example leveling formula
  
    await db.update(users).set({ xp: newXP, level: newLevel }).where(eq(users.discordId, discordId));
  
    return { newXP, newLevel };
  }

// complete tasks, gain xp, etc
export async function completeTask(taskId: number) {
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).then(res => res[0]);
  
    if (!task || task.completed) return null; // Task already completed
  
    await db.update(tasks).set({ completed: true }).where(eq(tasks.id, taskId));
  
    return addXP(task.userId.toString(), task.xpReward); // Add XP after task completion
  }