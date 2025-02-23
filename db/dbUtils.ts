import { db } from "./db";
import { users, tasks, achievements, shopItems } from "./schema";
import { and, eq, desc } from "drizzle-orm";

const DEBUG = true;

function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data || "");
  }
}

// Find or create a user
export async function getOrCreateUser(discordId: string, username: string) {
  const existingUser = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (existingUser.length > 0) return existingUser[0];

  const newUser = await db.insert(users)
    .values({ discordId, username, xp: 0, coins: 0, level: 1, badges: "", achievements: "" })
    .returning();

  return newUser[0];
}


export async function updateUserProfile(discordId: string, newUsername: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  await db.update(users).set({ username: newUsername }).where(eq(users.discordId, discordId));
  return { success: `Username updated to **${newUsername}**!` };
}


// Get all tasks for the user
export async function getUserTasks(discordId: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  const tasksList = await db.select().from(tasks).where(eq(tasks.userId, user[0].id));
  return tasksList.length ? tasksList : { message: "No tasks found!" };
}

// Get user profile
export async function getUserProfile(discordId: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  return user.length ? user[0] : { error: "User not found." };
}


// Create a new task
export async function createTask(
  discordId: string,
  name: string,
  description: string,
  xpReward: number,
  coinsReward: number = 0,
  badgeReward?: string
) {
  const user = await db.select({ id: users.id }).from(users).where(eq(users.discordId, discordId)).limit(1);

  if (user.length === 0) {
    throw new Error("User not found. Make sure they are registered!");
  }

  const newTask = await db.insert(tasks)
    .values({
      userId: user[0].id,
      name,
      description,
      xpReward,
      coinsReward,
      badgeReward,
      completed: false,
    })
    .returning();

  return newTask[0];
}

// Update task
export async function updateTask(discordId: string, taskId: number, updatedFields: Partial<typeof tasks.$inferInsert>) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!existingTask.length || existingTask[0].userId !== user[0].id) return { error: "Task not found or not yours!" };

  await db.update(tasks).set(updatedFields).where(eq(tasks.id, taskId));
  return { success: `Task "${existingTask[0].name}" updated successfully.` };
}

// Delete a task
export async function deleteTask(discordId: string, taskId: number) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!existingTask.length || existingTask[0].userId !== user[0].id) return { error: "Task not found or not yours!" };

  await db.delete(tasks).where(eq(tasks.id, taskId));
  return { success: `Task "${existingTask[0].name}" deleted.` };
}



// Complete a task, gain XP, coins, and possible badge rewards
export async function completeTask(discordId: string, taskName: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (!user.length) return { error: "User not found." };

  const userId = user[0].id;

  const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));

  const matchingTasks = userTasks.filter(task => task.name.toLowerCase() === taskName.toLowerCase());

  if (matchingTasks.length === 0) return { error: "Task not found. Check the name!" };

  if (matchingTasks.length > 1) {
    return { error: `Multiple tasks found. Please specify one of: ${matchingTasks.map(t => `"${t.name}"`).join(", ")}` };
  }

  const task = matchingTasks[0];

  if (task.completed) return { error: "This task has already been completed!" };

  // Mark task as completed
  await db.update(tasks).set({ completed: true }).where(eq(tasks.id, task.id));

  // Grant XP and coins
  const updatedStats = await addXPAndCoins(discordId, task.xpReward, task.coinsReward ?? 0);

  // Unlock badge if applicable
  let badgeMessage = "";
  if (task.badgeReward) {
    badgeMessage = await grantBadge(userId, task.badgeReward);
  }

  if (!updatedStats) {
    return { error: "Failed to update user stats." };
  }
  
  return {
    success: `✅ Task "${task.name}" marked as complete! 
    You now have ${updatedStats.newXP} XP, ${updatedStats.newCoins} Coins, and are at Level ${updatedStats.newLevel}.`
  };
}

// Grant XP, coins, and update the level
export async function addXPAndCoins(discordId: string, xpAmount: number, coinAmount: number) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (!user.length) return null;

  const newXP = user[0].xp + xpAmount;
  const newCoins = (user[0].coins || 0) + coinAmount;
  const newLevel = Math.floor(newXP / 100) + 1; // Example leveling formula

  await db.update(users).set({ xp: newXP, coins: newCoins, level: newLevel }).where(eq(users.discordId, discordId));

  return { newXP, newCoins, newLevel };
}

// Unlock an achievement for a user
export async function unlockAchievement(discordId: string, name: string, description: string, badge?: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (!user.length) return { error: "User not found." };

  const userId = user[0].id;

  // Check if achievement already unlocked
  const existingAchievement = await db
  .select()
  .from(achievements)
  .where(and(eq(achievements.userId, userId), eq(achievements.name, name))) // ✅ Correct usage
  .limit(1);

  if (existingAchievement.length > 0) {
    return { error: "Achievement already unlocked!" };
  }

  // Unlock achievement
  await db.insert(achievements)
    .values({ userId, name, description, badge })
    .returning();

  return { success: `🎉 Achievement unlocked: **${name}**! ${badge ? `You earned the badge: ${badge}.` : ""}` };
}

// Fetch all achievements for a user
export async function getUserAchievements(discordId: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (!user.length) return { error: "User not found." };

  const userId = user[0].id;

  const userAchievements = await db.select().from(achievements).where(eq(achievements.userId, userId));

  return userAchievements.length
    ? userAchievements.map(a => `🏆 ${a.name}: ${a.description}${a.badge ? ` (Badge: ${a.badge})` : ""}`).join("\n")
    : "No achievements unlocked yet.";
}

export async function updateAchievement(discordId: string, achievementName: string, newDescription?: string, newBadge?: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

  if (!user.length) return { error: "User not found." };

  const userId = user[0].id;

  // Find the achievement
  const existingAchievement = await db
      .select()
      .from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.name, achievementName)))
      .limit(1);

  if (!existingAchievement.length) {
      return { error: "Achievement not found or you do not own this achievement." };
  }

// Update the achievement
await db.update(achievements)
    .set({ 
        description: newDescription ?? existingAchievement[0].description, 
        badge: newBadge ?? existingAchievement[0].badge 
      })
    .where(and(eq(achievements.userId, userId), eq(achievements.name, achievementName)));

  return { success: `🏆 Achievement **${achievementName}** updated successfully!` };
}

// Delete an achievement
export async function deleteAchievement(discordId: string, achievementName: string) {
  // Fetch the user by Discord ID
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  // Fetch the achievement by name
  const existingAchievement = await db.select().from(achievements).where(eq(achievements.name, achievementName)).limit(1);
  if (!existingAchievement.length || existingAchievement[0].userId !== user[0].id) {
    return { error: "Achievement not found or not yours!" };
  }

  // Delete the achievement
  await db.delete(achievements).where(eq(achievements.id, existingAchievement[0].id));

  // Return a success message with the achievement name
  return { success: `Achievement "${existingAchievement[0].name}" deleted.` };
}

// add an item to teh shop
export async function addShopItem(name: string, description: string, xpRequired: number, coinsRequired: number) {
  try {
      await db.insert(shopItems).values({
          name,
          description,
          xpRequired,
          coinsRequired
      });
      return { success: `Item "${name}" added to the shop!` };
  } catch (error) {
      console.error("Error adding shop item:", error);
      return { error: "Failed to add item. It may already exist." };
  }
}

// buy an item from the shop
export async function buyItem(discordId: string, itemName: string) {
    const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
    if (!user.length) return { error: "User not found." };

    const item = await db.select().from(shopItems).where(eq(shopItems.name, itemName)).limit(1);
    if (!item.length) return { error: "Item not found in the shop." };

    if (user[0].coins < item[0].coinsRequired) {
        return { error: `Not enough coins! You need ${item[0].coinsRequired} coins to buy this item.` };
    }

    // Deduct coins and confirm purchase
    await db.update(users)
        .set({ coins: user[0].coins - item[0].coinsRequired })
        .where(eq(users.discordId, discordId));

    return { success: `You purchased "${item[0].name}" for ${item[0].coinsRequired} coins!` };
}

// check one's balance
export async function getBalance(discordId: string) {
  const user = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user.length) return { error: "User not found." };

  return { success: `Your balance: 💰 ${user[0].coins} coins` };
}


// Grant a badge to a user
async function grantBadge(userId: number, badge: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user.length) return "";

  let updatedBadges = user[0].badges ? `${user[0].badges},${badge}` : badge;

  await db.update(users).set({ badges: updatedBadges }).where(eq(users.id, userId));

  return `🎖️ You earned the badge: **${badge}**!`;
}

// Get leaderboard (sorted by XP descending)
export async function getLeaderboard(limit = 5) {
  return await db.select().from(users).orderBy(desc(users.xp)).limit(limit);
}
