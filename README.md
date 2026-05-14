# OFFGRID

**Your AI. Your machine. No cloud.**

OFFGRID is a local-first AI chat terminal built with Electron and React. It connects to Ollama for 100% private LLM inference, runs Whisper directly in your browser for speech-to-text, and features neural memory that automatically remembers facts about you.

---

## Why OFFGRID?

Most AI chat tools send your conversations to someone else's server. OFFGRID keeps everything on your hardware. The LLM runs in Ollama. Transcription happens in your browser via Whisper. Your data never leaves the room.

- No accounts
- No telemetry
- No subscriptions
- No internet required (except optional web search)

---

## What It Does

### Chat with Local AI
Connect to any Ollama model. Conversations stay on your machine. Multiple threads, Markdown rendering, syntax highlighting, export to Markdown or JSON.

### Neural Memory
The AI notices when you share personal facts, your name, your job, your preferences, and saves them automatically. These facts persist across sessions and shape how the AI responds to you.

### Web Tools
Enable browser access and the AI can search the web or read URLs before answering. It wraps these actions in `<SEARCH>` and `<FETCH>` tags that OFFGRID intercepts and executes.

### Custom Personalities
Create AI personas with custom names, behavioral rules, and user profiles. Switch between them per conversation. A coding assistant, a creative writer, a stoic philosopher, whatever you need.

### Process Monitor
A floating terminal window shows every API call, transcription event, memory update, and error in real time. Open it with Ctrl+Shift+T.

### Voice Interaction (STT & TTS)
**Speech-to-Text (STT):** Dictate your messages easily. The application uses a local transcription model (running directly in your browser) to guarantee your privacy.

**Text-to-Speech (TTS):** The AI can read its answers out loud using Puter.js. 

### Mullvad VPN Integration (SOCKS5)
To enhance privacy, you can route the AI's web searches and URL fetches through a Mullvad VPN SOCKS5 proxy. See [Mullvad Integration](docs/mullvad-integration.md) for details.

---

## 🚀 Installation (Recommended)

The easiest way to use OFFGRID is to download the standalone installer. No Git or coding knowledge required.

1.  **Download**: Go to the [GitHub Releases](https://github.com/ski1pp3r/local-assistant/releases) page.
2.  **Install**: Download `OFFGRID-Setup-x.x.x.exe` and run it.
3.  **Start**: Open OFFGRID from your Desktop or Start Menu.

### 🔄 Automatic Updates
OFFGRID features an integrated auto-updater. When a new version is released on GitHub, the app will automatically notify you and offer to install the update with a single click. You can also manually check for updates in the **Settings** panel.

---

## 🛠 For Developers

If you want to contribute or build from source, follow these steps. You'll need [Node.js](https://nodejs.org/) installed.

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/ski1pp3r/local-assistant.git
   cd local-assistant
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Fix potential vulnerabilities:
   ```bash
   npm audit fix --force
   ```

### Development Mode
Start the Vite dev server and Electron:
```bash
npm run dev
```

### Building & Packaging
- **Local Build**: `npm run build` (compiles to `dist/`)
- **Create Installer**: `npm run dist` (creates `.exe` in `release/`)
- **Release to GitHub**: `npm run release` (builds and uploads to GitHub)

---

## 💾 Where is my Data?
Your chats, settings, and personalities are stored in a folder named `data/` in your project root (or next to the `.exe` when installed). **Always backup this folder** before performing major system changes to ensure your local AI history is safe.

---

## 🏗 Ollama Setup Guide
Ollama is required for the AI to work.
1. **Install Ollama**: Download from [ollama.com](https://ollama.com/).
2. **Download Models**: Run `ollama pull llama3` or `ollama pull mistral` in your terminal.
3. **Verify**: The app connects automatically to `http://localhost:11434`.

---

## Feedback & Contributions
OFFGRID is a one-man project, built with passion for local and private AI. Feel free to open an issue or reach out!

## License
MIT License. See `LICENSE` for more information.
