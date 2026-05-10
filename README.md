# OFFGRID

**Your AI. Your machine. Privacy by design.**

OFFGRID is a local-first AI chat terminal built with Electron and React. It prioritizes privacy by running the Heavy Lifting (LLM and Transcription) entirely on your hardware.

---

## 🛡️ Privacy & Data Flow

| Feature | Technology | Data Location | Internet Required? |
| :--- | :--- | :--- | :--- |
| **Chat / LLM** | Ollama | **Local** (Your GPU/CPU) | No |
| **Speech-to-Text** | Whisper (In-Browser) | **Local** (Your RAM) | No |
| **Neural Memory** | Local JSON | **Local** (Your SSD) | No |
| **Text-to-Speech** | Puter.js (Cloud) | External API | **Yes** |
| **Web Search** | DuckDuckGo / Puter | External API | **Yes** |

---

## What It Does

### 🧠 Chat with Local AI
Connect to any Ollama model. Conversations stay on your machine. Multiple threads, Markdown rendering, syntax highlighting, and export capabilities.

### 💾 Neural Memory
The AI notices when you share personal facts (name, job, interests) and saves them automatically. These facts persist across sessions and shape how the AI responds to you, creating a persistent, local context.

### 🌐 Web Tools (Optional)
Enable browser access and the AI can search the web or read URLs. It uses `<SEARCH>` and `<FETCH>` tags to process real-time information.

### 🎭 Custom Personalities
Create AI personas with custom names, behavioral rules, and user profiles. Switch between a coding assistant, a creative writer, or a stoic philosopher instantly.

### 📟 Process Monitor
A floating terminal window (Ctrl+Shift+T) shows every API call, transcription event, and memory update in real time. **Transparency is key.**

---

## Voice Interaction

- **Speech-to-Text (STT):** Dictate your messages. Transcription happens locally in your browser using Whisper. Your voice data never leaves your RAM.
- **Text-to-Speech (TTS):** The AI reads answers via Puter.js.
  > [!CAUTION]
  > TTS currently requires an internet connection and only supports English reliably. Local TTS options are in the roadmap.

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS)
- [Ollama](https://ollama.com/) (Running locally)

### 1. Clone & Install
```bash
git clone https://github.com/ski1pp3r/local-assistant.git
cd local-assistant
npm install
npm audit fix --force
```

### 2. Run in Dev Mode
```bash
npm run dev
```

### 3. Build Windows Installer (.exe)
```bash
npm run dist
```
The installer will be generated in the `release/` directory.

---

## 🔄 Updates

If you built from source, update easily:

```bash
npm run update
```

> [!IMPORTANT]
> Run this command in your **source code folder**, not the installation directory in `AppData`.

---

## 🗺️ Roadmap

- [ ] **Fully Local TTS**: Integration of Piper or Coqui TTS to remove the cloud dependency for voice.
- [ ] **Local File Access**: AI-controlled system to read/search your local documents with explicit permissions.
- [ ] **Raspberry Pi Bridge**: A secure hardware relay for Telegram interaction without exposing your PC to the WAN.
- [ ] **Advanced Vision**: Support for multimodal models (Llava, etc.) via local camera or file upload.

---

## Feedback & Contributions

OFFGRID is a passion project for private AI. Feedback, tips, or ideas are highly welcome! Feel free to open an issue or reach out.

## License
MIT License. See `LICENSE` for more information.
