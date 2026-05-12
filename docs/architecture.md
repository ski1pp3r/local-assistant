# Technical Architecture & Core Concepts

OFFGRID is a **local-first, privacy-centric AI interface** designed to provide advanced AI capabilities (LLM, STT, Web Tools) without compromising user data or relying on third-party cloud services.

## 1. High-Level Overview

The application is built on the **Electron** framework, utilizing a decoupled architecture:
- **Renderer Process**: A React-based Single Page Application (SPA).
- **Main Process**: A Node.js environment handling OS-level operations and secure networking.
- **Sidecar Service**: Ollama, running as a separate local process for LLM inference.

## 2. Detailed Component Breakdown

### A. Frontend (React + Vite)
The frontend is responsible for the user interface and high-performance client-side processing.
- **Local STT Pipeline**: Uses `Transformers.js` to execute the **OpenAI Whisper (base/small)** model. 
    - **Isolation**: Audio transcription happens entirely within the browser's memory using Web Workers.
    - **Language Switching**: Dynamically switches between English and German models based on user settings to optimize accuracy.
- **State Management**: Uses React hooks and custom persistence utilities to synchronize UI state with local JSON storage via IPC.

### B. Backend (Electron Main Process)
The Main Process serves as the security gateway and system coordinator.
- **IPC Security Bridge**: Exposes a limited, safe API to the renderer via `preload.js`, preventing the UI from executing arbitrary shell commands or accessing unauthorized files.
- **Web Tooling & Scraper**:
    - **Search**: Scrapes the DuckDuckGo HTML interface to avoid using API keys or trackers.
    - **Fetching**: Downloads raw HTML, strips unnecessary tags (scripts, styles, ads), and normalizes text to provide a clean, token-efficient context for the AI.
- **Mullvad SOCKS5 Integration**:
    - Uses `socks-proxy-agent` to create an encrypted "tunnel within a tunnel."
    - **Dynamic Loading**: Loads networking dependencies on-demand using ES Module dynamic imports to maintain CommonJS compatibility while supporting modern ESM libraries.
    - **Status Verification**: Queries `am.i.mullvad.net/json` to verify that the app's traffic is correctly exiting through a Mullvad node.

### C. Inference Engine (Ollama)
The application assumes an active Ollama service.
- **Connection**: Communicates over a local loopback interface (`localhost:11434`).
- **Automation**: The Main Process attempts to start the Ollama service automatically if it is not detected upon app launch.

## 3. The "Neural Memory" System

OFFGRID implements a persistent context layer called **Neural Memory**.
- **Extraction**: The system continuously monitors AI responses for specific patterns where the AI "learns" a fact about the user.
- **Storage**: These facts are indexed and stored within the `threads.json` file.
- **Injection**: On every prompt, relevant "user facts" are injected into the system prompt, ensuring the AI maintains a consistent understanding of the user across different conversations without needing a centralized vector database.

## 4. Communication & Data Flow

### Request Life Cycle:
1.  **User Input**: Message is received via text or STT.
2.  **Context Assembly**: UI gathers relevant history, neural memory, and personality rules.
3.  **IPC Dispatch**: Data is sent to the Main Process.
4.  **Optional Web Phase**: 
    - AI detects a need for data.
    - Main Process executes Search/Fetch (optionally via SOCKS5).
    - Results are appended to the hidden context.
5.  **Ollama Inference**: Final payload is sent to Ollama via HTTP POST.
6.  **Streaming Output**: Tokens are streamed back to the UI via IPC events for real-time rendering.

## 5. Security & Privacy Model

- **Local Data Storage**: All data (chats, facts, settings) is stored in the `data/` subdirectory. This makes the application fully portable; moving the folder moves the entire "brain."
- **Zero Telemetry**: No tracking, no analytics, no "phone home" features.
- **Hardware-Level Isolation**: By running models locally, the application is immune to cloud outages, API price hikes, and data breaches on third-party servers.
