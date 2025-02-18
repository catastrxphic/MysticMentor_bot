import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { getOrCreateUser } from "../db/dbUtils"; // Adjust path as needed

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
    // Ignore messages from bots
    if (message.author.bot) return;

    console.log(`${message.author.tag} said: ${message.content}`);

    // Handle !xp command
    if (message.content.startsWith("!xp")) {
        try {
            const user = await getOrCreateUser(message.author.id, message.author.username);
            message.reply(`You have ${user.xp} XP and are at level ${user.level}!`);
        } catch (error) {
            console.error("Error fetching user XP:", error);
            message.reply("Oops! Something went wrong retrieving your XP.");
        }
    }
});

// Start the bot
await client.login(process.env.BOT_TOKEN);
