/**
 * CodeSpire Shared Type Definitions
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  searchGrounding?: {
    queries?: string[];
    links?: Array<{ title: string; uri: string }>;
  };
}

export interface WorkspaceFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mtime?: string;
  children?: WorkspaceFile[];
}

export interface CodeSpireConfig {
  activeEngine: 'gemini' | 'openai' | 'anthropic' | 'ollama';
  activeModel: string;
  temperature: number;
  masterKey: string; // The user-defined decryption key
  isMasterKeyConfigured: boolean;
  encryptedGeminiKey: string;
  encryptedOpenAiKey: string;
  encryptedAnthropicKey: string;
  ollamaHost: string;
  encryptedGithubToken: string;
  useSearch: boolean;
  systemInstruction: string;
  activeTheme?: 'cosmic' | 'matrix' | 'cyberpunk' | 'deepsea';
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
  commandName: string;
  settings: Record<string, any>;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'command' | 'agent';
  message: string;
}

export interface AgentStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  timestamp: string;
  logs: string[];
}

export interface AgentSession {
  id: string;
  goal: string;
  status: 'idle' | 'planning' | 'executing' | 'completed' | 'failed';
  steps: AgentStep[];
  currentStepIndex: number;
}
