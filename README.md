# AI Chat Desktop Assistant

A local-first, portable AI desktop assistant powered by Ollama. Built with Electron, Vite, and React.

## Project Overview

This project is a powerful local AI desktop application that brings the power of Large Language Models directly to your computer. It relies on [Ollama](https://ollama.com/) to execute models locally, ensuring complete privacy, zero API costs, and full offline functionality.

As an open-source project, it provides a clean, native desktop experience for interacting with advanced AI right from your local machine.

## Features

- **Local AI Chat:** Private, offline-capable conversations with cutting-edge LLMs.
- **Ollama Integration:** Seamless connection to the local Ollama backend. The app can automatically start the Ollama service if it's installed.
- **Windows Desktop App:** A fully standalone application that feels native to your operating system.
- **Automatic Updates:** Always stay on the latest version via built-in updates powered by GitHub Releases.
- **Modular Architecture:** Easy to maintain and expand.

## Project Status

> [!WARNING]
> This is an AI-assisted, actively developed project.
> While functional, it contains experimental features and is not fully production-stable yet. Expect rapid changes.

## Screenshots

*(Screenshots coming soon)*

## Installation

To work on the source code, you'll need [Node.js](https://nodejs.org/) installed on your machine.

1. Clone the repository:
   ```bash
   git clone <YOUR_REPOSITORY_URL>
   cd ai-chat
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
3. **Download Models**: Open a terminal and pull the models you wish to use:
   ```bash
   ollama pull llama3
   ollama pull mistral
   ```
4. **Verify**: List installed models:
   ```bash
   ollama list
   ```

The application connects to Ollama via its local HTTP API (`http://localhost:11434`), enabling secure, local model execution.

## How This App Was Built

This application was developed with heavy AI assistance.

- **Electron + Vite Setup**: The foundation uses Vite for lightning-fast frontend compilation and Electron for native OS integration.
- **Ollama Integration**: Built around HTTP polling to verify backend status, and child processes to spawn the daemon seamlessly.
- **IPC Communication**: Employs a strict `preload.js` script using `contextIsolation`. The React frontend communicates with the Node.js backend safely using `ipcRenderer.invoke()`.
- **Production Build Configuration**: Setup carefully delineates between loading a local server URL in dev mode versus loading static HTML files from the filesystem in production.
- **Windows Packaging**: `electron-builder` handles the complex task of bundling Node binaries and generating NSIS installers.

## Problems Encountered During Development

- **Localhost vs Dist**: Ensuring the app knew when to look for `localhost:5173` vs `dist/index.html` required careful environment variable checks (`app.isPackaged`).
- **Electron/Vite Path Issues**: Resolving assets and file paths in a packaged environment can be tricky; `__dirname` behaves differently when bundled.
- **IPC Communication Issues**: Establishing the rigid context-isolated boundaries meant rewriting older, insecure direct Node.js calls into safe IPC messages.
- **Ollama Startup Timing**: Handling cases where the Ollama daemon takes time to initialize or is already running required resilient HTTP polling logic.
- **Update System Integration Complexity**: Configuring `electron-updater` alongside GitHub Actions required ensuring tokens, repository names, and versioning were perfectly synced.

## Lessons Learned

- **Separating Dev/Prod Logic**: The application lifecycle is vastly different during development vs a packaged release. Handling paths and URLs conditionally is crucial.
- **Electron Security Practices**: Context isolation is non-negotiable. Never expose the Node.js `fs` or `child_process` modules directly to the web view.
- **Stable IPC Architecture**: Creating a clean API surface in `preload.js` makes maintaining the frontend much easier.
- **Desktop Packaging Complexity**: Packaging a desktop app involves navigating OS permissions, icons, installers, and code signing.

---

## Roadmap

This project is actively evolving. Here are the planned systems currently in development:

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

---

## Git & GitHub Guide

Version control helps track changes, collaborate, and distribute software safely.

### Initial Repository Setup

If you are setting this up from scratch:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

### Updating the Project After Changes

1. **Check changes**: See what files were modified.
   ```bash
   git status
   ```
2. **Add changes**: Stage the files for a commit.
   ```bash
   git add .
   ```
3. **Commit changes**: Save the changes with a descriptive message.
   ```bash
   git commit -m "Describe your changes"
   ```
4. **Push to GitHub**: Upload the commits to the remote repository.
   ```bash
   git push
   ```

## GitHub Releases Workflow

To deploy an update to users:
1. Increment the `"version"` number in `package.json`.
2. Commit and push your changes.
3. Push a new tag corresponding to the version (e.g., `v1.0.1`).
4. The configured GitHub Actions workflow will automatically trigger, build the Windows installer, and upload it to a new GitHub Release.
5. Users will automatically receive the update the next time they launch the application.

> [!IMPORTANT]
> Changes pushed to GitHub do **not** instantly reach users. Users only receive updates when a new Release is published, ensuring the app remains stable and local-first.

## Contribution Guide

1. Fork the repository.
2. Clone your fork locally.
3. Create a feature branch (`git checkout -b feature/amazing-feature`).
4. Commit your changes.
5. Push to your branch and submit a Pull Request.

## License

MIT License. See `LICENSE` for more information.
