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
**Speech-to-Text (STT):** Dictate your messages easily. The application uses a local transcription model (running directly in your browser) to guarantee your privacy. It dynamically switches transcription logic depending on your selected language (German or English).

**Text-to-Speech (TTS):** The AI can read its answers out loud using Puter.js. 
> [!WARNING]  
> Please note that the TTS feature currently only works reliably in **English**. We are working hard to ensure that German and other languages work flawlessly in upcoming updates!

---

## Installation

To work on the source code, you'll need [Node.js](https://nodejs.org/) installed on your machine.

1. Clone the repository:
   ```bash
   git clone https://github.com/ski1pp3r/local-assistant.git
   cd local-assistant
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Development Setup

To start the application in developer mode, run:

```bash
npm run dev
```

> [!NOTE]
> This command spins up a Vite dev server and opens the Electron window connecting to `localhost:5173`. Hot-reloading is active, so any changes made to the React frontend will appear immediately. This mode is strictly for developers.

## Production Build

To build the static files for production without packaging the app, run:

```bash
npm run build
```

This compiles the Vite React application into the `dist/` directory.

## Windows Installer (.exe)

To generate the final, distributable installer, run:

```bash
npm run dist
```

**How it works:**
- This command builds the frontend, and then uses `electron-builder` to package the entire application.
- A `Setup.exe` file will appear in the `release/` directory.
- End users should execute this `Setup.exe` to install the software on their computers. It will create a Start Menu entry and a Desktop shortcut, behaving like normal desktop software.

> [!IMPORTANT]
> End users should always use the installer. Development mode is only for contributing to the source code.

## Automatic Updates

The application is configured with `electron-updater`.
- Updates are delivered seamlessly through GitHub Releases.
- Whenever you launch the app, it silently checks if a newer version is available on GitHub.
- If an update is found, it downloads automatically in the background and prompts you to restart the app to install it.

## Ollama Setup Guide

Ollama is a tool that allows you to run open-source large language models locally on your machine. No cloud APIs, no subscriptions, no internet required after the initial download.

1. **Install Ollama**: Download and install Ollama from [ollama.com](https://ollama.com/).
2. **Start the Service**: The Electron app attempts to start Ollama automatically. Alternatively, run:
   ```bash
   ollama serve
   ```
3. **Download Models**: Open a terminal and pull the models you wish to use. You can browse all available models at the [Ollama Models Library](https://ollama.com/library):
   ```bash
   ollama pull llama3
   ollama pull mistral
   ```
4. **Verify**: List installed models:
   ```bash
   ollama list
   ```

The application connects to Ollama via its local HTTP API (`http://localhost:11434`), enabling secure, local model execution.

---

## Roadmap

This project is actively evolving. Here are the planned systems currently in development:

### Local AI processing (in development)
We are working on making the system fully run locally. Depending on complexity, this may take some time.

### Improvement of the Text-to-Speech model (“Puter AI”)
Currently, the TTS model only works reliably in English. We are actively working on adding support for German as well.

### Raspberry Pi Telegram Bridge (In Development)
To interact with the local AI while away from the computer without exposing the PC directly to the internet, we are building a secure bridge system.

- Uses a **Raspberry Pi Pico W** or **Raspberry Pi Zero 2W**.
- Integrates with the **Telegram Bot API** (via BotFather).
- The Pi acts as an intermediary relay: it receives Telegram messages and forwards them over the local LAN to the Electron app.
- The Electron app queries the local AI and sends the response back to the Pi, which forwards it to Telegram.
- *Status: Experimental. Active development. Architecture may change.*

### Local File Access System (In Development)
We are building an AI-controlled local file access system to allow the assistant to interact meaningfully with your local documents.

- **Planned features**: Reading text files, searching specific directories, and limited file management.
- **Security**: All file access will require explicit user visibility and permission. The AI will generate requests that the main application intercepts and asks the user to approve.
- *Status: Experimental. Security-focused implementation planned.*

### Mullvad VPN Integration (In Development)
To enhance privacy during remote communication and web search functionalities, we are exploring Mullvad VPN integration.

- **Purpose**: Route specific application traffic (like automated browser searches or the Telegram bridge traffic) through encrypted VPN tunnels via local SOCKS5 proxies.
- Ensures the AI's external footprint is anonymized.
- *Status: Experimental. Not production-ready. Architecture may change.*

## Feedback & Contributions

OFFGRID is a one-man project, built with passion for local and private AI. Any kind of tip, feedback, or idea is highly welcome! I would be very happy to hear from you if you try it out. Feel free to open an issue or reach out.

## License

MIT License. See `LICENSE` for more information.
