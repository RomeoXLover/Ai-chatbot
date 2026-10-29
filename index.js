const { Client, GatewayIntentBits, Partials, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 1. Load configuration
const configPath = path.join(__dirname, 'config.json');

if (!fs.existsSync(configPath)) {
    console.error('[Error] config.json not found! Please copy config.example.json to config.json and configure it.');
    process.exit(1);
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    console.error('[Error] Failed to parse config.json:', err.message);
    process.exit(1);
}

// Basic config validation
if (!config.discord_token || config.discord_token === 'YOUR_DISCORD_BOT_TOKEN_HERE') {
    console.warn('[Warning] "discord_token" is not set in config.json. Set your Discord bot token to run.');
}
if (!config.api_url) {
    console.warn('[Warning] "api_url" is missing in config.json. Defaulting to https://api.openai.com/v1/chat/completions');
    config.api_url = 'https://api.openai.com/v1/chat/completions';
}

const MEMORY_LIMIT = typeof config.memory_limit === 'number' ? config.memory_limit : 10;
const RESET_COMMAND = (config.reset_command || '!reset').toLowerCase();

// In-memory conversation store: channelId -> [{ role, content }]
const conversationMemory = new Map();

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel // Crucial for receiving DM events in discord.js v14
    ]
});

// Helper: split long text into Discord-compliant chunks (<2000 chars)
function splitMessage(text, maxLength = 1950) {
    if (!text || text.length <= maxLength) return [text || ''];
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // Try breaking at a newline within the limit
        let splitIdx = remaining.lastIndexOf('\n', maxLength);
        if (splitIdx <= 0) {
            // Try breaking at a space
            splitIdx = remaining.lastIndexOf(' ', maxLength);
        }
        if (splitIdx <= 0) {
            // Hard cut if no clean separator found
            splitIdx = maxLength;
        }

        chunks.push(remaining.substring(0, splitIdx).trim());
        remaining = remaining.substring(splitIdx).trim();
    }

    return chunks;
}

// Helper: Call the OpenAI-compatible AI API
async function callAiApi(messages) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (config.api_key && config.api_key.trim().length > 0) {
        headers['Authorization'] = `Bearer ${config.api_key.trim()}`;
    }

    const payload = {
        model: config.model || 'gpt-4o',
        messages: messages,
        temperature: typeof config.temperature === 'number' ? config.temperature : 0.7,
        max_tokens: typeof config.max_tokens === 'number' ? config.max_tokens : 1500
    };

    const response = await fetch(config.api_url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`API returned HTTP ${response.status} (${response.statusText}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Unexpected API response structure. Expected "choices[0].message.content".');
    }

    return data.choices[0].message.content;
}

// 3. Event: Bot Ready
client.once('ready', () => {
    console.log('----------------------------------------------------');
    console.log(`[Bot Online] Logged in as: ${client.user.tag} (ID: ${client.user.id})`);
    console.log(`[AI Endpoint] ${config.api_url}`);
    console.log(`[AI Model]    ${config.model}`);
    console.log(`[Memory Limit] Keep last ${MEMORY_LIMIT} messages per conversation`);
    console.log(`[Reset Cmd]   ${RESET_COMMAND}`);
    console.log('----------------------------------------------------');
});

// 4. Event: Message Received
client.on('messageCreate', async (message) => {
    // Ignore messages from any bot to avoid feedback loops
    if (message.author.bot) return;

    const isDM = message.channel.type === ChannelType.DM;
    const isMentioned = message.mentions.has(client.user.id);

    // Only respond if directly DMed or pinged in a server
    if (!isDM && !isMentioned) return;

    const contextId = isDM ? `dm_${message.author.id}` : `channel_${message.channel.id}`;

    // Clean mention tags from the message text
    const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
    const cleanPrompt = message.content.replace(mentionRegex, '').trim();

    // Check for memory reset command
    if (cleanPrompt.toLowerCase() === RESET_COMMAND) {
        conversationMemory.delete(contextId);
        await message.reply('🧹 Conversation memory has been cleared. Starting a fresh session!');
        return;
    }

    // If user mentioned bot without any text
    if (!cleanPrompt) {
        await message.reply('Hello! Ping me with a question or DM me, and I will be happy to help you.');
        return;
    }

    // Keep typing indicator active while AI generates response
    const typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
    }, 4000);
    message.channel.sendTyping().catch(() => {});

    try {
        // Retrieve or initialize history for this context
        let history = conversationMemory.get(contextId) || [];

        // Build messages array starting with system prompt
        const systemMessage = {
            role: 'system',
            content: config.system_prompt || 'You are a helpful AI assistant.'
        };

        const apiMessages = [
            systemMessage,
            ...history,
            { role: 'user', content: cleanPrompt }
        ];

        console.log(`[Chat Request] User: ${message.author.tag} (${message.author.id}) | Context: ${isDM ? 'DM' : `#${message.channel.name || 'channel'}`}`);

        // Call the AI API
        const aiReply = await callAiApi(apiMessages);

        // Update conversation memory
        history.push({ role: 'user', content: cleanPrompt });
        history.push({ role: 'assistant', content: aiReply });

        // Trim memory if it exceeds limit
        if (history.length > MEMORY_LIMIT * 2) {
            history = history.slice(-MEMORY_LIMIT * 2);
        }
        conversationMemory.set(contextId, history);

        // Send reply (split into chunks if longer than Discord limit)
        const chunks = splitMessage(aiReply);
        for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
                await message.reply(chunks[i]);
            } else {
                await message.channel.send(chunks[i]);
            }
        }
    } catch (err) {
        console.error('[Chat Error]', err);
        await message.reply(`❌ **Error generating response:**\n\`\`\`\n${err.message.substring(0, 500)}\n\`\`\``).catch(() => {});
    } finally {
        clearInterval(typingInterval);
    }
});

// 5. Start Bot
client.login(config.discord_token).catch((err) => {
    console.error('[Login Failed] Could not authenticate with Discord:');
    console.error(err.message);
    console.error('\nPlease verify that "discord_token" in config.json is valid and "Message Content Intent" is enabled in Discord Developer Portal.');
});
