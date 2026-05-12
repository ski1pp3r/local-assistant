# System Architecture & Core Concepts

OFFGRID is designed as a **local-first, privacy-centric AI interface**. This document explains how the application is structured and how its various components interact to provide a private AI experience.

## 1. High-Level Overview

OFFGRID is built using **Electron**, which allows it to combine a modern web-based frontend with deep system-level access. The application follows a "Tunnel-to-Local" philosophy: while it provides advanced AI capabilities, the actual "brain" (the LLM) and the "ears" (STT) run entirely on your own hardware.

## 2. Core Components

### A. Frontend (React + Vite)
- **Role**: Handles the user interface, message rendering, and local media processing.
- **Key Features**:
    - **Markdown Rendering**: Rich text and syntax highlighting for code.
    - **Local STT**: Uses `Transformers.js` to run OpenAI's **Whisper** model directly in the browser/renderer process. No audio data is ever sent to a server.
    - **State Management**: Manages conversation threads, personalities, and settings.

### B. Backend (Electron Main Process)
- **Role**: Acts as the secure bridge between the UI and the operating system.
- **Key Features**:
    - **IPC Handlers**: Manages requests from the UI for file operations, web searches, and network requests.
    - **Web Scraping Tool**: Executes DuckDuckGo searches and URL fetching when requested by the AI.
    - **Proxy Management**: Routes specific web traffic through Mullvad SOCKS5 for anonymity.
    - **Process Management**: Automatically manages the lifecycle of the Ollama service.

### C. Inference Engine (Ollama)
- **Role**: The "Large Language Model" server.
- **Communication**: OFFGRID talks to Ollama via a local HTTP API (`localhost:11434`).
- **Privacy**: Because Ollama runs locally, your prompts and AI responses never leave your machine.

## 3. Communication Workflow

1.  **Input**: User types a message or uses voice dictation (transcribed locally).
2.  **IPC Request**: The UI sends the message and conversation history to the Main Process.
3.  **Tool Detection**: The Main Process checks if the AI's previous response contained `<SEARCH>` or `<FETCH>` tags.
4.  **Action**: If tags are found, the Main Process performs the web action (optionally via Mullvad) and feeds the results back into the context.
5.  **Inference**: The Main Process forwards the final prompt to **Ollama**.
6.  **Streaming**: Ollama streams the response back through the Main Process to the UI for real-time display.

## 4. Data Persistence

All application data is stored in the `data/` directory in the project root:
- `threads.json`: Your conversation history.
- `settings.json`: App configuration and API URLs.
- `personalities.json`: Custom AI personas and behavioral rules.

## 5. Security & Privacy Model

- **No Telemetry**: The app does not track your usage or send analytics.
- **Local Media**: Audio for STT is processed in volatile memory and never saved.
- **Encrypted Networking**: Optional Mullvad SOCKS5 integration ensures that even required web lookups (search/fetch) are anonymized at the network layer.
