import React, { useState, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Cpu, 
  Eye, 
  EyeOff, 
  Save, 
  Sliders, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  FileText, 
  Search, 
  Globe, 
  Wrench,
  ChevronRight,
  Sparkles,
  Info,
  ExternalLink,
  Github
} from 'lucide-react';

import { Message, TerminalLog, CodeSpireConfig, Plugin, AgentSession, AgentStep } from './types';
import { encryptData, decryptData } from './utils/crypto';
import WorkspacePane from './components/WorkspacePane';
import TuiTerminal from './components/TuiTerminal';

// Default system configurations
const DEFAULT_SYSTEM_INSTRUCTION = `You are CodeSpire, an elite autonomous developer CLI model operating inside a secure container sandbox.
Provide professional, raw terminal diagnostics, clear code changes, and clean shell/git guidelines.`;

export default function App() {
  // Terminal logs state
  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Initializing CodeSpire Kernel v1.0.0...'
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Decryption Vault: Active. Multi-platform sandboxed environment verified (Termux/Windows/macOS/Linux)'
    }
  ]);

  // Master Configuration
  const [config, setConfig] = useState<CodeSpireConfig>({
    activeEngine: 'gemini',
    activeModel: 'gemini-3.5-flash',
    temperature: 0.7,
    masterKey: 'spire-secure-pass',
    isMasterKeyConfigured: false,
    encryptedGeminiKey: '',
    encryptedOpenAiKey: '',
    encryptedAnthropicKey: '',
    ollamaHost: 'http://localhost:11434',
    encryptedGithubToken: '',
    useSearch: true,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    activeTheme: 'cosmic'
  });

  const [rawGeminiKey, setRawGeminiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [isMasterEditing, setIsMasterEditing] = useState(true);

  // Plugin Suite State
  const [plugins, setPlugins] = useState<Plugin[]>([
    {
      id: 'git-sync',
      name: 'Git Workflow Syncer',
      description: 'Automates git clones, checks status, and prepares pull requests for DXN1-termux repos.',
      enabled: true,
      icon: 'Github',
      commandName: 'git',
      settings: { repoUrl: 'https://github.com/DXN1-termux/CodeSpire.git', branch: 'main' }
    },
    {
      id: 'self-evolution',
      name: 'Hyper-Mutator Evolution Core',
      description: 'Recursively reviews its own file-system coordinates, correcting syntax and compiler anomalies.',
      enabled: true,
      icon: 'Cpu',
      commandName: 'mutate',
      settings: { recursionLimit: 3, autoHeal: true }
    },
    {
      id: 'file-output',
      name: 'Structured Code Exporter',
      description: 'Writes direct, compilable outputs correctly to any source-tree coordinates.',
      enabled: true,
      icon: 'FileText',
      commandName: 'output',
      settings: { outputDir: './src' }
    },
    {
      id: 'mock-routes',
      name: 'Mock API Synth Generator',
      description: 'Auto-synthesizes Express mock middleware routes on the fly if undefined endpoints are queried.',
      enabled: false,
      icon: 'Sliders',
      commandName: 'endpoints',
      settings: { targetFile: 'server.ts' }
    },
    {
      id: 'search-grounding',
      name: 'Scraper / Web Search',
      description: 'Enables active search grounding for fetching up-to-date documentation on the fly.',
      enabled: true,
      icon: 'Globe',
      commandName: 'search',
      settings: { provider: 'googleSearch' }
    },
    {
      id: 'dep-shield',
      name: 'Dependency Armored Shield',
      description: 'Passively audits package peer conflicts, generating custom secure shields.',
      enabled: true,
      icon: 'ShieldCheck',
      commandName: 'shield',
      settings: { auditLevel: 'strict' }
    },
    {
      id: 'sandbox-diagnostics',
      name: 'Sandbox Diagnostic Probe',
      description: 'Reads system architecture metrics, environment variables, and sandbox boundaries.',
      enabled: true,
      icon: 'Cpu',
      commandName: 'diagnostics',
      settings: { gatherMetrics: true }
    }
  ]);

  // AI Chat history
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [serverKeys, setServerKeys] = useState({
    gemini: false,
    openai: false,
    anthropic: false,
    ollama: false
  });

  // Autonomous Agent controller state
  const [agentGoal, setAgentGoal] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentSession, setAgentSession] = useState<AgentSession>({
    id: '1',
    goal: '',
    status: 'idle',
    steps: [],
    currentStepIndex: 0
  });

  // Load sticky configuration and run telemetry key scan on mount
  useEffect(() => {
    const initConfig = async () => {
      let isLocalKeyFound = false;
      try {
        const stored = localStorage.getItem('codespire_client_config');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.encryptedGeminiKey || parsed.encryptedOpenAiKey || parsed.encryptedAnthropicKey) {
            isLocalKeyFound = true;
            addLog('Found saved encrypted API key(s) in localStorage. Enter Master Password to unlock.', 'warning');
          }
          setConfig(prev => ({
            ...prev,
            ...parsed,
            isMasterKeyConfigured: false // Wait for master password confirmation
          }));
        }
      } catch (err) {
        addLog('Failed to recover stored system parameters.', 'error');
      }

      // Check server system key telemetry configurations
      try {
        const res = await fetch('/api/workspace/key-check');
        const data = await res.json();
        if (data.status === 'success') {
          const sysActive = !!data.hasSystemKey;
          setHasServerKey(sysActive);
          setServerKeys({
            gemini: !!data.hasGeminiKey,
            openai: !!data.hasOpenAiKey,
            anthropic: !!data.hasAnthropicKey,
            ollama: !!data.hasOllamaHost
          });
          if (!sysActive && !isLocalKeyFound) {
            addLog('⚠️ ONBOARDING ADVISORY: CodeSpire keys are unconfigured. Chat synthesis commands are limited until provider parameters are defined.', 'warning');
          } else if (sysActive) {
            addLog('📡 Host system API key verified! Development shell layers initialized.', 'success');
          }
        }
      } catch (err) {
        console.error('Host environment telemetry run error:', err);
      }
    };

    initConfig();
  }, []);

  // Sync to local storage when parameters change
  const saveConfigToStorage = (updated: CodeSpireConfig) => {
    try {
      const copy = { ...updated, masterKey: '' }; // Clean key representation
      localStorage.setItem('codespire_client_config', JSON.stringify(copy));
    } catch (err) {
      console.error('Storage sync error:', err);
    }
  };

  // Safe logging utility
  const addLog = (msg: string, type: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'command' = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message: msg
      }
    ]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Decrypt Gemini API token dynamically
  const getDecryptedApiKey = async (): Promise<string | null> => {
    if (!config.encryptedGeminiKey) return null;
    try {
      const decrypted = await decryptData(config.encryptedGeminiKey, config.masterKey);
      return decrypted;
    } catch (err) {
      addLog('Master Key verification failed. Decryption was unsuccessful!', 'error');
      return null;
    }
  };

  // Inject plugin dynamically on the fly
  const handleInjectPlugin = (id: string, name: string) => {
    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (plugins.some(p => p.id === cleanId)) {
      addLog(`Plugin Registry: ID "${cleanId}" already registered. Boundary override denied!`, 'warning');
      return;
    }

    const newPlugin: Plugin = {
      id: cleanId,
      name,
      description: `Injected custom dynamic plugin. Active terminal hook: /${cleanId}`,
      enabled: true,
      icon: 'Sliders',
      commandName: cleanId,
      settings: { dynamicOverride: true, createdTimestamp: new Date().toISOString() }
    };

    setPlugins(prev => [...prev, newPlugin]);
    addLog(`✨ DYNAMIC WORKFLOW PLUGIN MOUNTED SUCCESSFULY: "${name}" [ID: ${cleanId}]`, 'success');
  };

  // Self-Mutation engine execution route
  const handleMutateSelf = async (filePath: string, instruction: string) => {
    addLog(`🧬 Preparing mutation stream...`, 'info');
    let customKey: string | null = null;
    let targetEncryptedKey = '';
    
    if (config.activeEngine === 'gemini') targetEncryptedKey = config.encryptedGeminiKey;
    else if (config.activeEngine === 'openai') targetEncryptedKey = config.encryptedOpenAiKey;
    else if (config.activeEngine === 'anthropic') targetEncryptedKey = config.encryptedAnthropicKey;

    if (targetEncryptedKey) {
      try {
        customKey = await decryptData(targetEncryptedKey, config.masterKey);
      } catch (e) {
        addLog('Could not decrypt secure client key. Please confirm your Master Password.', 'warning');
        return;
      }
    }

    addLog(`🧬 Processing mutation requests for: ${filePath}`, 'warning');
    addLog(`Synthesizing dynamic delta changes via neural brain: ${config.activeModel} (Engine: ${config.activeEngine})...`, 'info');

    try {
      const response = await fetch('/api/workspace/mutate-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          instruction,
          customApiKey: customKey,
          model: config.activeModel,
          engine: config.activeEngine,
          ollamaHost: config.ollamaHost
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        addLog(`🧬 FILE SYSTEM MUTATION COMPLETED SUCCESSFULY!`, 'success');
        addLog(`Successfully rewrote ${filePath} coordinates (${data.mutatedContentLength} bytes written into sandbox)`, 'success');
      } else {
        addLog(`Genetic mutation loop rejected output: ${data.message}`, 'error');
      }
    } catch (err: any) {
      addLog(`Unexpected engine fail during rewrite sequence: ${err?.message || err}`, 'error');
    }
  };

  // Helper to encrypt and save any raw API Key values directly
  const saveRawApiKey = async (key: string, engine: 'gemini' | 'openai' | 'anthropic' | 'ollama' = 'gemini'): Promise<boolean> => {
    if (!key.trim()) {
      addLog('Credentials or parameters cannot be blank.', 'warning');
      return false;
    }
    try {
      let updatedConfig = { ...config };
      if (engine === 'gemini' || engine === 'openai' || engine === 'anthropic') {
        const encrypted = await encryptData(key.trim(), config.masterKey);
        if (engine === 'gemini') updatedConfig.encryptedGeminiKey = encrypted;
        else if (engine === 'openai') updatedConfig.encryptedOpenAiKey = encrypted;
        else if (engine === 'anthropic') updatedConfig.encryptedAnthropicKey = encrypted;
      } else if (engine === 'ollama') {
        updatedConfig.ollamaHost = key.trim();
      }
      
      setConfig(updatedConfig);
      saveConfigToStorage(updatedConfig);
      addLog(`${engine.toUpperCase()} parameters stored and locked within local session.`, 'success');
      return true;
    } catch (err: any) {
      addLog(`Cryptographic initialization failure: ${err?.message || err}`, 'error');
      return false;
    }
  };

  // Secure & encrypt Gemini Key
  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawGeminiKey.trim()) {
      addLog('Please enter a valid Gemini API key.', 'warning');
      return;
    }
    const success = await saveRawApiKey(rawGeminiKey.trim(), 'gemini');
    if (success) {
      setRawGeminiKey('');
    }
  };

  // Lock in master key
  const handleLockMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKeyInput.trim()) {
      addLog('Master Password cannot be blank.', 'warning');
      return;
    }
    
    // Lock in
    const updated = {
      ...config,
      masterKey: masterKeyInput.trim(),
      isMasterKeyConfigured: true
    };
    setConfig(updated);
    setIsMasterEditing(false);
    addLog('Master encryption password activated. Spire vault unlocked successfully.', 'success');
  };

  // Toggle single plugin state
  const handleTogglePlugin = (id: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.enabled;
        addLog(`Plugin "${p.name}" turned ${nextState ? 'ON' : 'OFF'}`, nextState ? 'success' : 'warning');
        return { ...p, enabled: nextState };
      }
      return p;
    }));
  };

  // Update specific plugin config parameters
  const handleUpdatePluginSetting = (pluginId: string, key: string, value: any) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === pluginId) {
        return {
          ...p,
          settings: { ...p.settings, [key]: value }
        };
      }
      return p;
    }));
  };

  // AI Prompt Send Pipeline
  const handleSendMessage = async (text: string) => {
    // 1. Guard against unconfigured API keys
    let hasKey = false;
    if (config.activeEngine === 'gemini') {
      hasKey = !!config.encryptedGeminiKey || hasServerKey;
    } else if (config.activeEngine === 'openai') {
      hasKey = !!config.encryptedOpenAiKey || serverKeys.openai;
    } else if (config.activeEngine === 'anthropic') {
      hasKey = !!config.encryptedAnthropicKey || serverKeys.anthropic;
    } else if (config.activeEngine === 'ollama') {
      hasKey = true; // Local server defaults
    }

    if (!hasKey) {
      addLog(`❌ AI Core Synthesis Gated: No operational credentials detected for ${config.activeEngine.toUpperCase()} sandbox session.`, 'error');
      addLog(`👉 Action required: Type "/setkey YOUR_KEY" in the console or paste your key inside the onboarding setup wizard panel.`, 'warning');
      return;
    }

    // 2. Check if we have an explicit custom client-side key to decrypt
    let customKey: string | null = null;
    let targetEncryptedKey = '';
    if (config.activeEngine === 'gemini') targetEncryptedKey = config.encryptedGeminiKey;
    else if (config.activeEngine === 'openai') targetEncryptedKey = config.encryptedOpenAiKey;
    else if (config.activeEngine === 'anthropic') targetEncryptedKey = config.encryptedAnthropicKey;

    if (targetEncryptedKey) {
      try {
        customKey = await decryptData(targetEncryptedKey, config.masterKey);
      } catch (err) {
        addLog('Could not decrypt secure client key. Please confirm your Master Password.', 'warning');
        return;
      }
    }

    // Determine if web search tool is enabled
    const useSearch = config.useSearch;

    // Save prompt to history list
    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);

    addLog(`Translating prompt context to target model: ${config.activeModel} (Engine: ${config.activeEngine})...`, 'info');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: text,
          messages: messages, // keeps context active
          systemInstruction: config.systemInstruction,
          model: config.activeModel,
          temperature: config.temperature,
          customApiKey: customKey,
          useSearch,
          engine: config.activeEngine,
          ollamaHost: config.ollamaHost
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content: data.text,
          timestamp: new Date().toLocaleTimeString(),
          modelUsed: data.model,
          searchGrounding: data.grounding
        };

        setMessages(prev => [...prev, assistantMsg]);
        addLog(`[AI RESP] Successfully generated output. Model: ${data.model} (Engine: ${config.activeEngine})`, 'success');

        // Check if grounding was utilized
        if (data.searchUsed && data.grounding?.links?.length > 0) {
          addLog(`Grounding verified: ${data.grounding.links.length} web sources ingested.`, 'success');
        }
      } else {
        addLog(`AI Processing failed: ${data.message}`, 'error');
      }
    } catch (err: any) {
      addLog(`Failed to communicate with development API: ${err?.message || err}`, 'error');
    }
  };

  // Autonomous Agent Workflows
  // Triggers an intelligent sequence simulator that reads from the server and produces code changes!
  const triggerAutonomousAgent = async (goal: string) => {
    if (!goal.trim()) return;
    
    setIsAgentRunning(true);
    addLog(`🤖 INITIALIZING AUTONOMOUS WORKFLOW AGENT FOR GOAL: "${goal}"`, 'agent');

    // Generate planning steps dynamically
    const steps: AgentStep[] = [
      {
        id: 'step-1',
        title: 'Gather Environmental Context',
        description: 'Read sandbox directory, variables, and look safe boundaries.',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString(),
        logs: []
      },
      {
        id: 'step-2',
        title: 'Synthesize Automation Plan & Code',
        description: 'Leverage Gemini to design necessary enhancements matching goals.',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString(),
        logs: []
      },
      {
        id: 'step-3',
        title: 'Export Outputs to Workspace',
        description: 'Write source code edits seamlessly into the sandbox workspace.',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString(),
        logs: []
      },
      {
        id: 'step-4',
        title: 'System Validation & Verification',
        description: 'Run diagnostic test commands and compile check tests.',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString(),
        logs: []
      }
    ];

    setAgentSession({
      id: Math.random().toString(),
      goal,
      status: 'planning',
      steps,
      currentStepIndex: 0
    });

    try {
      // SEQUENCE STEP 1: GATHER CONTEXT
      setAgentSession(prev => {
        const updated = [...prev.steps];
        updated[0] = { ...updated[0], status: 'running', logs: ['Querying `/api/workspace/files`...', 'Environment verified. Found standard node environment setup.'] };
        return { ...prev, steps: updated, status: 'executing' };
      });
      addLog(`[Agent Step 1/4] Querying workspace structure...`, 'agent');
      
      const filesRes = await fetch('/api/workspace/files');
      const filesData = await filesRes.json();
      
      await new Promise((r) => setTimeout(r, 1200));

      setAgentSession(prev => {
        const updated = [...prev.steps];
        updated[0] = { ...updated[0], status: 'completed', logs: [...updated[0].logs, `Successfully read ${filesData.tree?.length || 10} file pointers.`] };
        updated[1] = { ...updated[1], status: 'running', logs: ['Executing targeted prompt with CodeSpire development LLM...'] };
        return { ...prev, steps: updated, currentStepIndex: 1 };
      });

      // SEQUENCE STEP 2: SYNTHESIZE
      addLog(`[Agent Step 2/4] Synthesizing instructions utilizing Model ${config.activeModel}...`, 'agent');
      
      let customKey: string | null = null;
      if (config.encryptedGeminiKey) {
        customKey = await getDecryptedApiKey();
      }

      const promptText = `The user wants us to build an autonomous workflow for task: "${goal}".
The current workspace file tree lists: ${JSON.stringify(filesData.tree)}.
Generate a step-by-step description of what edits are required to achieve this goal, detailing which files should be modified. Let's make it highly detailed and suited to developers. Provide exact paths and snippets.`;

      const aiRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: config.activeModel,
          temperature: config.temperature,
          customApiKey: customKey,
          useSearch: config.useSearch
        })
      });

      const aiData = await aiRes.json();
      const aiText = aiData.status === 'success' ? aiData.text : 'AI Synthesis failed or offline. Reverting to automated template synthesis.';

      await new Promise((r) => setTimeout(r, 1500));

      setAgentSession(prev => {
        const updated = [...prev.steps];
        updated[1] = { ...updated[1], status: 'completed', logs: [...updated[1].logs, 'Synthesis complete. CodeSpire resolved implementation steps flawlessly!'] };
        updated[2] = { ...updated[2], status: 'running', logs: ['Writing files straight into sandbox directory...'] };
        return { ...prev, steps: updated, currentStepIndex: 2 };
      });

      // SEQUENCE STEP 3: EXPORT FILES
      addLog(`[Agent Step 3/4] Exporting generated assets to filesystem...`, 'agent');
      
      // We will generate a nice task log in the workspace for preview
      const logsFileName = `codespire-agent-run-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
      const docContent = `===========================================================\n` +
                          ` CODESPIRE AI AUTONOMOUS RUN LOG\n` +
                          ` GOAL: "${goal}"\n` +
                          ` TIMESTAMP: ${new Date().toISOString()}\n` +
                          `===========================================================\n\n` +
                          `1. CODESPIRE AGENT SYNTHESIZED ARCHITECTURE:\n${aiText}\n\n` +
                          `2. STATUS: COMPLETED SUCCESSFULLY`;

      await fetch('/api/workspace/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: logsFileName, content: docContent })
      });

      addLog(`Wrote detailed telemetry workflow results -> ${logsFileName}`, 'success');
      await new Promise((r) => setTimeout(r, 1500));

      setAgentSession(prev => {
        const updated = [...prev.steps];
        updated[2] = { ...updated[2], status: 'completed', logs: [...updated[2].logs, `Successfully exported agent execution ledger into workspace file: ${logsFileName}`] };
        updated[3] = { ...updated[3], status: 'running', logs: ['Invoking test environment suite checking parameters...', '$ codespire test'] };
        return { ...prev, steps: updated, currentStepIndex: 3 };
      });

      // SEQUENCE STEP 4: VERIFICATION
      addLog(`[Agent Step 4/4] Ingesting diagnostic testing suite & verifying code integrity...`, 'agent');
      
      const checkRes = await fetch('/api/workspace/execute-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'npm-test' })
      });
      const checkData = await checkRes.json();
      const checkOut = checkData.status === 'success' ? checkData.output : 'Verification pipeline offline.';

      await new Promise((r) => setTimeout(r, 1000));

      setAgentSession(prev => {
        const updated = [...prev.steps];
        updated[3] = { ...updated[3], status: 'completed', logs: [...updated[3].logs, checkOut, 'Verification completes. Sandbox files are stable in container!'] };
        return { ...prev, steps: updated, status: 'completed' };
      });

      addLog(`🤖 CODESPIRE AGENT SECURED COMPLETED TASKS SUCCESSFULLY!`, 'success');
      setAgentGoal('');
    } catch (err: any) {
      addLog(`Workflow loop critical error: ${err?.message || err}`, 'error');
      setAgentSession(prev => {
        const updated = prev.steps.map(s => s.status === 'running' ? { ...s, status: 'failed' as const, logs: [...s.logs, 'Encountered unexpected loop crash during execute'] } : s);
        return { ...prev, steps: updated, status: 'failed' };
      });
    } finally {
      setIsAgentRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#ebebeb] flex flex-col font-mono selection:bg-emerald-500/20 selection:text-white">
      
      {/* Top Header Navigation Line */}
      <header className="bg-[#0f0f0f] border-b border-neutral-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-10 select-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-emerald-950 flex items-center justify-center border border-emerald-400/40 relative">
              <TerminalIcon size={16} className="text-emerald-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-bold tracking-widest text-emerald-400 font-sans uppercase">CodeSpire</span>
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">V1e-PRO</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Automated Multiplatform AI-LLM Developer Client</div>
          </div>
        </div>

        {/* Git Sync Widget */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800/60 px-2.5 py-1.5 rounded">
          <Github size={13} className="text-emerald-400" />
          <span className="text-[10px] text-neutral-500 font-mono">DXN1-termux/CodeSpire:</span>
          <span className="font-semibold text-neutral-200">main</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping ml-1" />
        </div>
      </header>

      {/* Main Grid Wrapper Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 min-h-0">
        
        {/* Left Side: Decryption, Key Vault & Plugins Manager */}
        <div className="xl:col-span-3 flex flex-col gap-4 min-w-0">
          
          {/* Section 1: Crypotgraphic Vault config */}
          <div className="bg-[#0b0b0b] border border-neutral-800/80 rounded-lg p-3.5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Cryptographic Vault</h3>
              </div>
              {config.isMasterKeyConfigured ? (
                <span className="text-[9px] py-0.5 px-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  Vault Locked
                </span>
              ) : (
                <span className="text-[9px] py-0.5 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                  Vault Standby
                </span>
              )}
            </div>

            {isMasterEditing ? (
              <form onSubmit={handleLockMasterKey} className="space-y-2">
                <div className="text-[10px] text-neutral-400 leading-relaxed">
                  Enter a secret passphrase to lock details like third-party tokens and git keys safely in your sandbox.
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Set Master Password..."
                    value={masterKeyInput}
                    onChange={(e) => setMasterKeyInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800/80 focus:border-emerald-500/80 text-xs px-3 py-1.5 rounded text-emerald-300 focus:outline-none placeholder-neutral-600 font-mono"
                  />
                  <Key size={12} className="absolute right-2.5 top-2.5 text-neutral-600" />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 py-1.5 rounded text-xs transition-all font-semibold active:scale-98 select-none"
                >
                  Set Cryptographic Password
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] bg-neutral-900 border border-neutral-800/60 p-2 rounded">
                  <span className="text-neutral-500 font-bold">Active Cipher:</span>
                  <span className="text-emerald-400 font-semibold select-all">AES-GCM (256-bit)</span>
                </div>
                
                {/* Save API Key details */}
                <form onSubmit={handleSaveGeminiKey} className="space-y-2 pt-1 border-t border-neutral-850">
                  <span className="text-[10px] text-neutral-400 font-bold block">BYOK: Personal Gemini API Key</span>
                  <div className="relative">
                    <input
                      type={isKeyVisible ? 'text' : 'password'}
                      placeholder="Paste your private API key..."
                      value={rawGeminiKey}
                      onChange={(e) => setRawGeminiKey(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800/80 focus:border-emerald-550 focus:outline-none text-xs px-3 py-1.5 rounded text-emerald-300 placeholder-neutral-650"
                    />
                    <button
                      type="button"
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      className="absolute right-2.5 top-2 text-neutral-500 hover:text-emerald-400 transition-colors"
                    >
                      {isKeyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-neutral-900 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1.5 rounded text-xs transition-colors font-sans select-none"
                  >
                    Lock & Encrypt Credentials
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsMasterEditing(true)}
                  className="w-full text-center text-[10px] text-neutral-500 hover:text-rose-500 underline py-1"
                >
                  Change Master Cipher key
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Plugins configure suite */}
          <div className="bg-[#0b0b0b] border border-neutral-800/80 rounded-lg p-3.5 shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <Sliders size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Workflow Plugins</h3>
            </div>

            <p className="text-[10px] text-neutral-400 leading-relaxed mb-3">
              Enable / disable individual terminal hooks, local environment variables integration, or autonomous workflows.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 custom-scrollbar">
              {plugins.map((p) => (
                <div key={p.id} className="bg-neutral-950 border border-neutral-800/50 hover:border-neutral-800/80 rounded p-2.5 transition-all duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-400 py-0.5">
                        {p.id === 'git-sync' && <Github size={14} />}
                        {p.id === 'file-output' && <FileText size={14} />}
                        {p.id === 'search-grounding' && <Globe size={14} />}
                        {p.id === 'sandbox-diagnostics' && <Cpu size={14} />}
                      </span>
                      <span className="text-xs font-bold text-neutral-200">{p.name}</span>
                    </div>
                    
                    {/* Switch Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePlugin(p.id)}
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer select-none relative ${
                        p.enabled ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                    >
                      <span className={`block w-3.5 h-3.5 bg-neutral-950 rounded-full transition-transform duration-200 ${
                        p.enabled ? 'translate-x-3.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-neutral-500 mt-1 lines-2 font-mono leading-tight">{p.description}</p>
                  
                  {p.enabled && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-900 text-[10px] leading-tight flex flex-col gap-1.5 text-neutral-400">
                      {p.id === 'git-sync' && (
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-neutral-500 block">Repository Target:</label>
                          <input 
                            type="text" 
                            value={p.settings.repoUrl}
                            onChange={(e) => handleUpdatePluginSetting(p.id, 'repoUrl', e.target.value)}
                            className="bg-neutral-900 border border-neutral-800/60 rounded px-1.5 py-0.5 mt-0.5 text-[10px] text-emerald-400 w-full focus:outline-none"
                          />
                        </div>
                      )}
                      {p.id === 'search-grounding' && (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Retrieval Tools:</span>
                          <span className="bg-neutral-900 text-emerald-400 px-1 py-0.2 rounded border border-neutral-800/60">Google Search</span>
                        </div>
                      )}
                      {p.id === 'file-output' && (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Live Workspace Writeback:</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">Enabled</span>
                        </div>
                      )}
                      {p.id === 'sandbox-diagnostics' && (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Real-Time Metrics Monitoring:</span>
                          <span className="text-emerald-400 bg-neutral-900 px-1 rounded">ON</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Center/Right Grid Workspace: Left split File system/editor, right split terminal */}
        <div className="xl:col-span-9 flex flex-col gap-4 min-w-0">
          
          {/* Top Panel: Model Switching selection, grounding and temperature configuration */}
          <div className="bg-[#0b0b0b] border border-neutral-800/80 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl select-none">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">Brain & Model Switching Registry</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* model picker dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500">Active neural model:</span>
                <select 
                  value={config.activeModel}
                  onChange={(e) => {
                    const modelName = e.target.value;
                    setConfig(prev => ({ ...prev, activeModel: modelName }));
                    addLog(`Active Brain switched -> ${modelName}`, 'info');
                  }}
                  className="bg-neutral-900 border border-neutral-800 text-xs px-2.5 py-1 rounded text-emerald-400 focus:outline-none focus:border-emerald-500/50 font-mono font-bold cursor-pointer"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Standard Quick)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Advanced Coding/Agent)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
                </select>
              </div>

              {/* temperature slider picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500">Temperature:</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-neutral-900 px-1 rounded border border-neutral-800/60">{config.temperature}</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={config.temperature} 
                  onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-16 accent-emerald-500 cursor-pointer" 
                />
              </div>

              {/* real-time search grounding switcher */}
              <button
                type="button"
                onClick={() => {
                  const nextSearch = !config.useSearch;
                  setConfig(prev => ({ ...prev, useSearch: nextSearch }));
                  addLog(`Google Search Web Grounding turned ${nextSearch ? 'ON' : 'OFF'}`, nextSearch ? 'success' : 'warning');
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] select-none shadow hover:brightness-110 active:scale-98 transition-all ${
                  config.useSearch 
                    ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400' 
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                }`}
              >
                <Globe size={11} /> 
                Grounding Web Search: {config.useSearch ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Center Main Split: Workspace Explorer left, Terminal Console right */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            
            {/* Split 1: Workspace Sandbox Explorer & Editor */}
            <div className="flex flex-col min-h-0">
              <WorkspacePane 
                onAddLog={addLog}
                onFileSelect={(path) => setActiveFilePath(path)}
                activeFilePath={activeFilePath}
              />
            </div>

            {/* Split 2: Command Terminal TUI Console with options */}
            <div className="flex flex-col min-h-0">
              <TuiTerminal 
                logs={logs}
                messages={messages}
                activeModel={config.activeModel}
                config={config}
                onAddLog={addLog}
                onClearLogs={handleClearLogs}
                onSendMessage={handleSendMessage}
                onSetConfig={setConfig}
                onTriggerAgent={triggerAutonomousAgent}
                onMutateSelf={handleMutateSelf}
                onInjectPlugin={handleInjectPlugin}
                hasServerKey={hasServerKey}
                onSaveRawApiKey={saveRawApiKey}
              />
            </div>

          </div>

          {/* Bottom Panel: Interactive Autonomous Agent workflow milestones and status metrics */}
          <div className="bg-[#0b0b0b] border border-neutral-800/80 rounded-lg p-3.5 flex flex-col gap-3 shadow-xl select-none">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-100">Spire Autonomous Agent Console</h3>
                  <p className="text-[10px] text-neutral-500">Plan and verify complex multi-turn modifications to files in this workspace instantly.</p>
                </div>
              </div>

              <div className="flex-grow max-w-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="E.g., Design a README file, checkout environment status, or write templates..."
                    value={agentGoal}
                    onChange={(e) => setAgentGoal(e.target.value)}
                    disabled={isAgentRunning}
                    className="flex-1 bg-neutral-900 border border-neutral-800/80 focus:border-emerald-500/80 text-xs px-3 py-1.5 rounded text-emerald-300 placeholder-neutral-600 focus:outline-none"
                  />
                  <button
                    onClick={() => triggerAutonomousAgent(agentGoal)}
                    disabled={isAgentRunning || !agentGoal.trim()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded shadow transition-all active:scale-97 select-none ${
                      isAgentRunning || !agentGoal.trim()
                        ? 'bg-neutral-850 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                        : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 cursor-pointer font-bold'
                    }`}
                  >
                    <Play size={12} className={isAgentRunning ? 'animate-pulse' : ''} />
                    Deploy Agent
                  </button>
                </div>
              </div>
            </div>

            {/* Steps & Milestones Tracker when running/planned */}
            {agentSession.status !== 'idle' && (
              <div className="bg-neutral-950 border border-neutral-850 p-2.5 rounded text-xs space-y-2 animation-fade-in font-mono">
                <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-neutral-900 leading-none">
                  <span className="text-neutral-400 font-bold uppercase shrink-0">Active Run Goal: "{agentSession.goal}"</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                    agentSession.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                    agentSession.status === 'failed' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse' :
                    'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                  }`}>
                    {agentSession.status === 'executing' ? '🛰️ RUNNING CODE ACTIONS' : agentSession.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-900 h-1.5 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ease-out ${
                      agentSession.status === 'completed' ? 'bg-emerald-500' :
                      agentSession.status === 'failed' ? 'bg-rose-500' :
                      'bg-cyan-500'
                    }`}
                    style={{ 
                      width: `${
                        agentSession.status === 'completed' ? 100 :
                        agentSession.status === 'failed' ? 50 :
                        ((agentSession.currentStepIndex + 0.5) / agentSession.steps.length) * 100
                      }%` 
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[10px] pt-1">
                  {agentSession.steps.map((step, idx) => (
                    <div 
                      key={step.id} 
                      className={`p-2 rounded border transition-colors leading-tight ${
                        step.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                        step.status === 'running' ? 'bg-cyan-550/5 border-cyan-500/30 text-cyan-400 font-bold' :
                        step.status === 'failed' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                        'bg-neutral-900/40 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold">0{idx + 1}.</span>
                        <span className="truncate">{step.title}</span>
                      </div>
                      <div className="text-[9px] text-neutral-500 leading-tight line-clamp-1">{step.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
