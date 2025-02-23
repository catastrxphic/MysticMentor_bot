import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { completeTask, getUserTasks, createTask, deleteTask, updateTask, getLeaderboard, getOrCreateUser, updateUserProfile, getUserAchievements, unlockAchievement, updateAchievement, deleteAchievement, addShopItem, buyItem, getBalance } from "../db/dbUtils"; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return; 

    console.log(`${message.author.tag} said: ${message.content}`);

    const args = message.content.split(" ");
    const command = args[0];

    if (command === "!xp") {
        try {
            const user = await getOrCreateUser(message.author.id, message.author.username);
            message.reply(`You have ${user.xp} XP and are at level ${user.level}!`);
        } catch (error) {
            console.error("Error fetching user XP:", error);
            message.reply("Oops! Something went wrong retrieving your XP.");
        }
    } 

    else if (command === "!updateprofile") {
        const newName = args.slice(1).join(" ").trim();
        if (!newName) {
            message.reply("Usage: `!updateprofile <new name>`");
            return;
        }
    
        try {
            const result = await updateUserProfile(message.author.id, newName);
    
            // Check if result is an object with 'error' or 'success' and handle undefined cases
            if (typeof result === 'object' && 'error' in result) {
                message.reply(`Error: ${result.error}`);
            } else if (typeof result === 'object' && 'success' in result) {
                message.reply(result.success || "Profile updated successfully.");
            } else {
                message.reply("Unexpected response format.");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            message.reply("Oops! Something went wrong updating your profile.");
        }
    }    

    else if (command === "!achievements") {
        try {
            const achievements = await getUserAchievements(message.author.id);
            
            // Check if achievements is an error object
            if (typeof achievements === 'object' && 'error' in achievements) {
                message.reply(`Error: ${achievements.error}`);
            } else {
                // If achievements is a string (the list of achievements), send it
                message.reply(achievements || "No achievements unlocked yet.");
            }
        } catch (error) {
            console.error("Error fetching achievements:", error);
            message.reply("Oops! Something went wrong fetching your achievements.");
        }
    }    

    else if (command === "!unlockachievement") {
        const name = args[1];
        const description = args.slice(2, -1).join(" ");
        const badge = args[args.length - 1] || undefined;
    
        if (!name || !description) {
            message.reply("Usage: `!unlockachievement <name> <description> [badge]`");
            return;
        }
    
        try {
            const result = await unlockAchievement(message.author.id, name, description, badge);
    
            // Check if result is an error object
            if (typeof result === 'object' && 'error' in result) {
                message.reply(`Error: ${result.error}`);
            } else {
                // If result has a success message
                message.reply(result.success);
            }
        } catch (error) {
            console.error("Error unlocking achievement:", error);
            message.reply("Oops! Something went wrong unlocking the achievement.");
        }
    }    

    else if (command === "!updateachievement") {
        const achievementName = args[1];
        const newDescription = args.slice(2, -1).join(" ");
        const newBadge = args[args.length - 1] || undefined;
    
        if (!achievementName || !newDescription) {
            message.reply("Usage: `!updateachievement <name> <new description> [new badge]`");
            return;
        }
    
        try {
            const result = await updateAchievement(message.author.id, achievementName, newDescription, newBadge);
            
            // Check if result contains an error
            if (typeof result === 'object' && 'error' in result) {
                message.reply(`Error: ${result.error}`);
            } else {
                // Otherwise, assume it's a success response
                message.reply(result.success || "Achievement update failed.");
            }
        } catch (error) {
            console.error("Error updating achievement:", error);
            message.reply("Oops! Something went wrong updating the achievement.");
        }
    }    

    else if (command === "!deleteachievement") {
        const achievementName = args.slice(1).join(" ").trim(); // Get the achievement name from the args
        
        if (!achievementName) {
            message.reply("Usage: `!deleteachievement <name>`");
            return;
        }
    
        try {
            const result = await deleteAchievement(message.author.id, achievementName);
    
            // Check if the result contains an error property
            if (typeof result === 'object' && 'error' in result) {
                message.reply(`Error: ${result.error}`);
            } else {
                message.reply(result.success || "No response.");
            }
        } catch (error) {
            console.error("Error deleting achievement:", error);
            message.reply("Oops! Something went wrong deleting the achievement.");
        }
    }    

    else if (command === "!tasks") {
        try {
            const tasksList = await getUserTasks(message.author.id);
    
            // Handle the case where tasksList is an error object
            if ('error' in tasksList) {
                message.reply(`⚠️ ${tasksList.error}`);
            }
            // Handle the case where tasksList has a message property
            else if ('message' in tasksList) {
                message.reply(tasksList.message);
            }
            // Handle the case where tasksList is an array of tasks
            else if (Array.isArray(tasksList)) {
                message.reply(`📝 Your Tasks:\n${tasksList.map(task => `- ${task.name} (${task.xpReward} XP)`).join("\n")}`);
            } else {
                message.reply("Oops! Unexpected response format.");
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            message.reply("Oops! Something went wrong retrieving your tasks.");
        }
    }       

    else if (message.content.startsWith("!createtask")) {
        const args = message.content.match(/"([^"]+)"|(\S+)/g);
        console.log("Parsed arguments:", args); 
    
        if (!args || args.length < 4) {
            message.reply("Usage: `!createtask \"<name>\" \"<description>\" <xpReward>`");
            return;
        }
    
        args.shift(); 
    
        const name = args[0].replace(/"/g, ""); 
        const description = args.slice(1, -1).join(" ").replace(/"/g, ""); 
        const xpRewardStr = args[args.length - 1].replace(/"/g, "").trim(); 
    
        console.log("Extracted values -> Name:", name, "| Description:", description, "| XP String:", xpRewardStr); 
    
        const xpReward = parseInt(xpRewardStr, 10);
    
        if (isNaN(xpReward)) {
            message.reply("Error: XP reward must be a number.");
            return;
        }
    
        try {
            const newTask = await createTask(message.author.id, name, description, xpReward);
            message.reply(`✅ Task created: "${newTask.name}" (${newTask.xpReward} XP)`);
        } catch (error) {
            console.error("Error creating task:", error);
            message.reply("Oops! Something went wrong creating the task.");
        }
    }
    
    else if (command === "!updatetask") {
        const args = message.content.split(" ");
        if (args.length < 4) {
            message.reply("Usage: `!updatetask <taskID> \"<new name>\" <new XP>`");
            return;
        }
    
        const taskId = parseInt(args[1], 10);
        const name = args[2].replace(/"/g, "");
        const xpReward = parseInt(args[3], 10);
    
        if (isNaN(taskId) || isNaN(xpReward)) {
            message.reply("Error: Task ID and XP must be numbers.");
            return;
        }
    
        try {
            const result = await updateTask(message.author.id, taskId, { name, xpReward });
            message.reply(result.success || `⚠️ ${result.error}`);
        } catch (error) {
            console.error("Error updating task:", error);
            message.reply("Oops! Something went wrong updating the task.");
        }
    }
    

    else if (message.content.startsWith("!complete")) {
        const taskName = message.content.split(" ").slice(1).join(" ").trim(); 
    
        if (!taskName) {
            message.reply("Usage: `!complete <task name>`");
            return;
        }
    
        try {
            const result = await completeTask(message.author.id, taskName);
    
            if (result.error) {
                message.reply(`⚠️ ${result.error}`);
            } else if ( result.success) {
                message.reply(result.success);
            }
            else{
               message.reply("⚠️ An unexpected error occurred while completing the task.");
            }
        } catch (error) {
            console.error("Error completing task:", error);
            message.reply("Oops! Something went wrong while completing the task.");
        }
    }

    else if (command === "!deletetask") {
        const taskId = parseInt(args[1], 10);
        if (isNaN(taskId)) {
            message.reply("Usage: `!deletetask <taskID>`");
            return;
        }
    
        try {
            const result = await deleteTask(message.author.id, taskId);
            message.reply(result.success || `⚠️ ${result.error}`);
        } catch (error) {
            console.error("Error deleting task:", error);
            message.reply("Oops! Something went wrong deleting the task.");
        }
    }
    
    // Add item to the shop
    else if (command === "!additem") {
        const [name, description, xpRequired, coinsRequired] = args.slice(1).join(" ").split("|").map(s => s.trim());
    
        if (!name || !xpRequired || !coinsRequired) {
            message.reply("Usage: `!additem <name> | <description> | <xp> | <coins>`");
            return;
        }
    
        try {
            const result = await addShopItem(name, description, parseInt(xpRequired), parseInt(coinsRequired));
            message.reply(result.success || `⚠️ ${result.error}`);
        } catch (error) {
            console.error("Error adding shop item:", error);
            message.reply("Oops! Something went wrong adding the item.");
        }
    }
    
    // Buy item from the shop
    else if (command === "!buy") {
        const itemName = args.slice(1).join(" ");
    
        if (!itemName) {
            message.reply("Usage: `!buy <item name>`");
            return;
        }
    
        try {
            const result = await buyItem(message.author.id, itemName);
            message.reply(result.success || `⚠️ ${result.error}`);
        } catch (error) {
            console.error("Error buying item:", error);
            message.reply("Oops! Something went wrong with your purchase.");
        }
    }
    
    // Get user's balance
    else if (command === "!balance") {
        try {
            const result = await getBalance(message.author.id);
            message.reply(result.success || `⚠️ ${result.error}`);
        } catch (error) {
            console.error("Error checking balance:", error);
            message.reply("Oops! Something went wrong checking your balance.");
        }
    }
    
    // see the leaderboard
    else if (command === "!leaderboard") {
        try {
            const topUsers = await getLeaderboard();
            if (!topUsers.length) {
                message.reply("🏆 No leaderboard data available.");
                return;
            }
            const leaderboardMessage = topUsers.map((user, index) =>
                `#${index + 1} - ${user.username}: ${user.xp} XP`
            ).join("\n");

            message.reply(`🏆 **Leaderboard** 🏆\n${leaderboardMessage}`);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            message.reply("Oops! Something went wrong retrieving the leaderboard.");
        }
    }
});

async function startBot() {
    try {
        await client.login(process.env.BOT_TOKEN);
        console.log("Bot successfully logged in!");
    } catch (error) {
        console.error("Failed to login:", error);
    }
}

startBot();
