# Ai-chatbot

A lightweight, customizable AI Discord Chatbot built with **Node.js** and **discord.js v14**. It connects to any OpenAI-compatible AI API (OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio, etc.) and automatically assists users whenever it is **pinged (mentioned)** in a server or receives a **Direct Message (DM)**.

---

## ✨ Features

- **Pings & Direct Messages**: Responds immediately when pinged (`@Bot`) in any server channel or when sent a direct message (DM).
- **Universal API Support**: Works with any provider following the OpenAI Chat Completions standard (`/v1/chat/completions`), including:
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, etc.)
  - **OpenRouter** (`anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b`, etc.)
  - **Groq** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, etc.)
  - **DeepSeek** (`deepseek-chat`, `deepseek-coder`)
  - **Local Models** (Ollama, LM Studio, LocalAI, vLLM)
- **Conversation Memory**: Remembers context per user in DMs and per channel in servers so conversations flow naturally.
- **Typing Indicator**: Shows Discord's native "Bot is typing..." while waiting for the LLM to generate answers.
- **Smart Message Splitting**: Long responses (>2,000 characters) are automatically partitioned cleanly along paragraphs and word boundaries.
- **Session Reset**: Users can type `!reset` to instantly wipe conversation history and start fresh.

---

## ⚙️ Configuration (`config.json`)

All bot parameters are configured directly in `config.json`:

```json
{
  "discord_token": "YOUR_DISCORD_BOT_TOKEN_HERE",
  "api_url": "https://api.openai.com/v1/chat/completions",
  "api_key": "YOUR_AI_API_KEY_HERE",
  "model": "gpt-4o",
  "system_prompt": "You are a helpful, friendly, and knowledgeable AI assistant. You answer questions clearly, accurately, and assist users according to their needs.",
  "max_tokens": 1500,
  "temperature": 0.7,
  "memory_limit": 10,
  "reset_command": "!reset"
}
```

### Config Options Breakdown:

| Key | Description | Example |
| :--- | :--- | :--- |
| `discord_token` | Your Discord Bot Token from the Discord Developer Portal | `"MTAyM..."` |
| `api_url` | Full URL of the OpenAI-compatible chat completions endpoint | `"https://api.openai.com/v1/chat/completions"` |
| `api_key` | API Key for your AI provider (leave blank for local Ollama) | `"sk-proj-..."` |
| `model` | Exact model ID to query | `"gpt-4o"`, `"llama-3.3-70b-versatile"` |
| `system_prompt` | Persona and instructions guiding how the bot behaves and responds | `"You are an expert coder..."` |
| `max_tokens` | Maximum token ceiling for generated answers | `1500` |
| `temperature` | Creativity control (`0.0` = deterministic, `1.0` = highly creative) | `0.7` |
| `memory_limit` | Maximum past messages retained in conversation history per context | `10` |
| `reset_command` | Trigger phrase to reset context memory | `"!reset"` |

---

## 🌐 Common API Provider Endpoints

### 1. OpenAI
- **`api_url`**: `https://api.openai.com/v1/chat/completions`
- **`model`**: `gpt-4o` or `gpt-4o-mini`
- **`api_key`**: Your OpenAI API key (`sk-...`)

### 2. OpenRouter
- **`api_url`**: `https://openrouter.ai/api/v1/chat/completions`
- **`model`**: `meta-llama/llama-3.3-70b-instruct` or `anthropic/claude-3.5-sonnet`
- **`api_key`**: Your OpenRouter API key (`sk-or-...`)

### 3. Groq (Ultra-Fast)
- **`api_url`**: `https://api.groq.com/openai/v1/chat/completions`
- **`model`**: `llama-3.3-70b-versatile`
- **`api_key`**: Your Groq API key (`gsk_...`)

### 4. Local Ollama
- **`api_url`**: `http://localhost:11434/v1/chat/completions`
- **`model`**: `llama3.2` or `mistral`
- **`api_key`**: `""` (leave empty or set to any dummy string)

---

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher.
- A Discord Bot application created on the [Discord Developer Portal](https://discord.com/developers/applications).

### 1. Clone the Repository
```bash
git clone https://github.com/RomeoXLover/Ai-chatbot.git
cd Ai-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Discord Developer Portal Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Navigate to the **Bot** tab:
   - Click **Reset Token** and copy the token into `"discord_token"` in `config.json`.
   - Scroll down to **Privileged Gateway Intents** and enable:
     - ✅ **Message Content Intent**
3. Navigate to **OAuth2** -> **URL Generator**:
   - Scopes: check `bot`.
   - Bot Permissions: check `Send Messages`, `Read Message History`, `View Channels`, `Send Messages in Threads`.
   - Copy the generated URL and paste it into your browser to invite the bot to your server.

### 4. Configure `config.json`
Edit `config.json` with your Discord token and chosen AI credentials:
```bash
nano config.json
```

### 5. Run the Bot
```bash
npm start
```
Or with Node directly:
```bash
node index.js
```

---

## 🔄 Running 24/7 with PM2 (Optional)

To keep the bot running continuously in the background on your server:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot under PM2
pm2 start index.js --name "ai-chatbot"

# Enable automatic startup on system reboot
pm2 startup
pm2 save
```

---

## 💬 Usage

- **In Server Channels**: Mention the bot with your prompt:
  ```text
  @Ai-chatbot explain how WebSockets work in simple terms.
  ```
- **In Direct Messages (DMs)**: Open a DM with the bot and send any message:
  ```text
  Write a Python script that scrapes headlines from a website.
  ```
- **Reset Context**: Type `!reset` at any time to clear history:
  ```text
  !reset
  ```

---

## 📜 License

MIT License. Open-source for personal and educational use.
