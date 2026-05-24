<p align="center"> MADE WITH ❤️ BY DXN1 

# CodeSpire (v1e-PRO) ⚙️ 🛰️

<p align="center">
  <img src="https://img.shields.io/badge/CodeSpire-v1e--PRO-emerald?style=for-the-badge&logo=terminal&logoColor=emerald" alt="CodeSpire Version" />
  <img src="https://img.shields.io/badge/Created_By-DXN1--termux-cyan?style=for-the-badge&logo=github&logoColor=white" alt="Author" />
  <img src="https://img.shields.io/badge/Platform-Termux_|_Linux_|_macOS_|_Windows-blueviolet?style=for-the-badge&logo=linux&logoColor=white" alt="Platform Support" />
  <img src="https://img.shields.io/badge/Secured_With-AES--GCM-brightgreen?style=for-the-badge&logo=snort&logoColor=white" alt="Security Vault" />
  <img src="https://img.shields.io/badge/Engine-Gemini_2.5_Flash_|_Pro_|_OpenAI_|_Claude-deepskyblue?style=for-the-badge&logoColor=white" alt="AI Engine" />
  <img src="https://img.shields.io/badge/Status-Stable-9cc728?style=for-the-badge" alt="Build Status" />
</p>

---

## 🌌 Introduction

**CodeSpire** is a state-of-the-art, high-performance, cross-platform terminal client, LLM orchestration tool, and autonomous developer agent designed specifically to support workflow automation on modern sandboxes, local machines, cloud VMs, and terminal-only environments like Linux, macOS, Windows, and Termux. 

Engineered with a visual-heavy retroactive Terminal TUI (Text User Interface) dashboard, CodeSpire provides developers with direct, real-time command control, autonomous file-system modifications, and secure, encrypted storage for individual API keys – bypasses the need for high-latency cloud servers or risky, non-vetted client proxies.

CodeSpire enables a complete BYOK (Bring Your Own Key) workflow, where your keys are protected with locally managed AES-GCM symmetric decryption, giving you unparalleled autonomy to build, test, query, and synchronize codebases directly from any terminal or remote device.

---

## 🛠️ Key Architectural Highlights

*   **Multi-Platform Autonomy**: Developed to run with identical layout efficiency and responsiveness across Termux (Android), macOS, Linux core architectures, and Windows terminal simulators.
*   **Encrypted Credential Safe**: Integrates high-grade Web Cryptography API algorithms (AES-GCM 256-bit keys with secure salt vectors) and native XOR cascading fallback streams for non-secure contexts. Your API keys (Gemini, OpenAI, and Anthropic) never leave your workspace.
*   **Unified Multi-Engine Core**: Orchestrate your automated flows across **Gemini**, **OpenAI**, **Anthropic**, and **Ollama (local)** from a single visual dashboard, with automated fallback states.
*   **Live Sandbox Write-Backs**: Direct read/write bindings allowing the client and background agents to programmatically fetch structure files, write templates, create components, or execute commands straight to files.
*   **Flexible Model Registry**: Instantly cycle between premium generative intelligence engines (e.g., `gemini-3.5-flash`, `gpt-4o`, `claude-3-5-sonnet-20241022`, and local `llama 3`) based on your specific developer parameters.
*   **Web Grounding & Dynamic Search**: Infused with live Google Search retrieval tools, enabling AI agents to scan the internet, query live packages, and fetch official updated documentation on the fly to resolve dependency crashes.
*   **Agent TUI & Visual Monitoring**: Watch active loop execution step-by-step through a state-driven planning dashboard featuring real-time process indicators, stage logs, progress tickers, and environment parameters.

---

## 📂 Codebase Manifest & Workspace Layout

CodeSpire uses a lightweight, highly compatible structure:

```
├── .env.example              # Template environments variables definition
├── index.html                # High-fidelity single-view base template index
├── metadata.json             # Applet descriptor (CodeSpire permissions)
├── package.json              # System package manifest configuring server environments
├── server.ts                 # Express full-stack middleware handling files, multi-engine grounding chat, & simulation logs
├── tsconfig.json             # TypeScript static typing compiler policies
├── vite.config.ts            # High-speed static bundle layout policies
├── src/
│   ├── App.tsx               # Master App HUD. Coordinates ciphers, multi-engine routing, and layout
│   ├── main.tsx              # React mounting root
│   ├── index.css             # Tailwind style sheets config
│   ├── types.ts              # System types (Message, WorkspaceFile, Config, Plugins, Logs)
│   ├── components/
│   │   ├── WorkspacePane.tsx # Tree structure explorer, directory reader, & code-saving engine
│   │   └── TuiTerminal.tsx   # Command parser, multi-engine prompt routing, and TUI logs screen
│   └── utils/
│       └── crypto.ts         # Encrypted AES-GCM and fallback XOR memory storage ciphers
```

---

## 🚀 Speed-Run Setup Guides

Choose your current operating context to initialize CodeSpire inside your sandbox or local workspace:

### 1. 📲 Termux Core Setup (Android Systems)
Run the following scripts inside your Termux shell to prepare packages, system nodes, and compiler tools:

```bash
# Update Termux repository links & core packages
pkg update -y && pkg upgrade -y

# Install git, nodejs, and essential system compression libraries
pkg install git nodejs-lts python build-essential -y

# Verify git and node installation
node -v
git --version

# Clone into DXN1-termux repository layout
git clone https://github.com/DXN1-termux/CodeSpire.git
cd CodeSpire

# Install dependencies and launch CodeSpire engine
npm install
npm run dev
```

### 2. 🐧 Linux / 🍏 macOS Terminal Setup
For desktop shells or remote headless SSH containers:

```bash
# Confirm node v18+ is active
node -v

# Clone and initialize
git clone https://github.com/DXN1-termux/CodeSpire.git
cd CodeSpire

# Run package install
npm install

# Run application dev script
npm run dev
```

### 3. 🪟 Windows PowerShell Setup
Open PowerShell with Elevated Privileges and execute:

```powershell
# Verify node packages
node -v

# Clone repository
git clone https://github.com/DXN1-termux/CodeSpire.git
cd CodeSpire

# Populate local node_modules
npm install

# Build & launch TUI client
npm run dev
```

---

## ⌨️ CodeSpire Advanced CLI Command Cheatsheet

Below is the dictionary of cryptographic command bindings supported inside the **CodeSpire Terminal TUI Input**:

| Command Syntax | Operational Purpose | Output Result |
| :--- | :--- | :--- |
| `/help` | Launch CLI assistance directory. | Prints available CodeSpire commands, parameters, and aliases. |
| `/sysinfo` | Query container system metrics. | Lists system memory loads, disk storage, thread uptime, and platforms. |
| `/compile` | Run live TS compile & lint validation audit. | Runs an authentic `tsc --noEmit` and returns compiler and type checking logs. |
| `/read <file_path>` | Print safe sandbox file content line-by-line. | Outputs exact file content prefixed with sequential line index indicators. |
| `/setkey <api_key>` | Lock active engine credentials. | Encrypts key inside secure local dashboard (or sets Ollama Host URL). |
| `/engine <provider>` | Switch active synthesis provider. | Instantly swaps between `gemini`, `openai`, `anthropic`, and local `ollama`. |
| `/model <name>` | Swaps active reasoning brain model. | Targets specific LLM model ID based on the active engine. |
| `/search <query>` | Trigger Google web search grounding. | Scrapes modern live resources to return grounded developer facts. |
| `/agent <goal_description>` | Initiate autonomous workflow agent. | Sequentially designs, reviews, writes, and tests files for a requested goal. |
| `/write <path> <text>` | Directly create or overwrite a sandbox file. | Injects content immediately into the specified directory coordinates. |
| `/clear` | Empty console log cache. | Flushes existing on-screen logs to free memory buffers. |

---

## 🪐 Cryptographic Vault Architecture Overview

To support safe developer key preservation, CodeSpire employs a binary-to-hex **AES-GCM (Galois/Counter Mode)** cryptographic loop.

```
+------------------+         +-------------------------------+
| Raw API Key Input| ------> | Master Password + SHA-256 Hash |
+------------------+         +-------------------------------+
                                             |
                                             v
+------------------+         +-------------------------------+
|  Ciphertext base | <------ | AES-GCM Decrypt / XOR Session  |
+------------------+         +-------------------------------+
```

1.  **Direct Encryption**: Upon submitting `/setkey`, the plain text key is converted into a UTF-8 chunk, digested using SHA-256 to produce a symmetric AES block, and combined with a cryptographic random 12-byte initialization vector (IV) to produce browser-independent ciphertext prefixed with `aes-gcm:`.
2.  **Fallback Logic**: For environments where `window.crypto.subtle` is unavailable (e.g., non-HTTPS sandboxes or nested framing interfaces), CodeSpire falls back to a custom cyclical **XOR cipher stream** with character-byte key shifts, prefixed with `codespire-xor:`.
3.  **Local Storage Integrity**: Plain-text keys are strictly forbidden from hitting localStorage. Only the formatted blocks are serialized, requiring you to enter your Master Password on reload to reconstruct memory credentials.

---

## 🤖 Deconstructing the Autonomous Agent Loop

When you issue an autonomous goal through the **Spire Agent Console**, the background server triggers an automated 4-phase milestone machine:

*   **PHASE 01: Environment Diagnosis**: The agent inspects your files tree dynamically. By mapping directories, it understands syntax formats, avoiding import structure clashes.
*   **PHASE 02: Neural Code Synthesis**: Utilizing the selected brain, CodeSpire builds detailed code strategies. If resolving dependency bugs, the agent invokes `googleSearch` grounding to retrieve official solutions.
*   **PHASE 03: Sandbox File Export**: CodeSpire programmatically saves these assets to disk using direct background endpoints.
*   **PHASE 04: Diagnostics & Testing**: The client schedules test commands (such as lint checks and mock test runs), logging all performance indexes on the dashboard.

---

## 💻 Integrated Plugins System

CodeSpire contains an interactive plugin suite allowing power users to configure behavior parameters on the fly:

1.  **Git Workflow Syncer**: Configures targeted repository URLs and branch tracking. Enables quick git status simulations and pull request preparations.
2.  **Structured Code Exporter**: Controls targeted file coordinates and controls paths.
3.  **Scraper / Web Search**: Coordinates query scraping behaviors with Google Search providers.
4.  **Sandbox Diagnostic Probe**: Toggles live container diagnostics and tracks RAM load metrics.

---

## 🤝 Contribution Guidelines (DXN1-termux Developer Policies)

1.  **Fork** the repository: `https://github.com/DXN1-termux/CodeSpire`
2.  Create your development branch: `git checkout -b feature/cyber-tui`
3.  Ensure typing compliance: `npm run lint`
4.  Commit with precise visual context: `git commit -m "feat: implement glow borders on terminal logs"`
5.  Request review: Open a Pull Request targeting `/DXN1-termux/CodeSpire`

*Designed and engineered with complete local-device developer autonomy by DXN1.*
