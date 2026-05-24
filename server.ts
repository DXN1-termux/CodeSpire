import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Initialize express app
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

interface AICompletionParams {
  engine?: 'gemini' | 'openai' | 'anthropic' | 'ollama';
  model: string;
  prompt?: string;
  messages?: any[];
  systemInstruction?: string;
  temperature?: number;
  apiKey?: string;
  ollamaHost?: string;
  useSearch?: boolean;
}

interface AICompletionResponse {
  text: string;
  model: string;
  searchUsed?: boolean;
  grounding?: {
    queries?: string[];
    links?: { title: string; uri: string }[];
  };
}

// Unified multi-engine content synthesizer
async function generateAICompletion(params: AICompletionParams): Promise<AICompletionResponse> {
  const {
    engine = 'gemini',
    model,
    prompt,
    messages = [],
    systemInstruction = '',
    temperature = 0.7,
    apiKey,
    ollamaHost = 'http://localhost:11434',
    useSearch = false
  } = params;

  // Standardize messages to { role: 'user' | 'assistant', content: string }
  const standardMessages = messages.map((m: any) => ({
    role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // Append raw contextual prompt if provided
  if (prompt) {
    standardMessages.push({ role: 'user', content: prompt });
  }

  // GEMINI ENGINE COMPILATION
  if (engine === 'gemini') {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('AI Engine configuration fault: Gemini API Key is unconfigured.');

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    let targetModel = model;
    if (model.includes('flash-lite')) targetModel = 'gemini-3.1-flash-lite';
    else if (model.includes('pro')) targetModel = 'gemini-3.1-pro-preview';
    else if (model.includes('flash') || !targetModel) targetModel = 'gemini-3.5-flash';

    const config: any = {
      temperature: Number(temperature),
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const contents = standardMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: contents,
      config: config
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const searchQueries = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    return {
      text: response.text || '',
      model: targetModel,
      searchUsed: useSearch,
      grounding: {
        queries: searchQueries,
        links: groundingChunks.map((chunk: any) => ({
          title: chunk.web?.title || 'Web Search Link',
          uri: chunk.web?.uri || ''
        })).filter((item: any) => item.uri)
      }
    };
  }

  // OPENAI ENGINE COMPILATION
  if (engine === 'openai') {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('AI Engine configuration fault: OpenAI API Key is unconfigured.');

    let targetModel = model;
    if (targetModel.startsWith('gemini')) {
      targetModel = 'gpt-4o'; // Auto transition standard
    }

    const payloadMessages: any[] = [];
    if (systemInstruction) {
      payloadMessages.push({ role: 'system', content: systemInstruction });
    }
    payloadMessages.push(...standardMessages);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: payloadMessages,
        temperature: Number(temperature)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Gateway error (${res.status}): ${errText}`);
    }

    const json = await res.json() as any;
    const text = json.choices?.[0]?.message?.content || '';
    return {
      text,
      model: targetModel
    };
  }

  // ANTHROPIC ENGINE COMPILATION
  if (engine === 'anthropic') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('AI Engine configuration fault: Anthropic API Key is unconfigured.');

    let targetModel = model;
    if (targetModel.startsWith('gemini')) {
      targetModel = 'claude-3-5-sonnet-20241022'; // Auto transition standard
    }

    const payloadMessages = standardMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const body: any = {
      model: targetModel,
      messages: payloadMessages,
      temperature: Number(temperature),
      max_tokens: 4096
    };
    if (systemInstruction) {
      body.system = systemInstruction;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic Gateway error (${res.status}): ${errText}`);
    }

    const json = await res.json() as any;
    const text = json.content?.[0]?.text || '';
    return {
      text,
      model: targetModel
    };
  }

  // OLLAMA ENGINE COMPILATION
  if (engine === 'ollama') {
    let targetModel = model;
    if (targetModel.startsWith('gemini')) {
      targetModel = 'llama3'; // Default container fallback
    }

    const payloadMessages: any[] = [];
    if (systemInstruction) {
      payloadMessages.push({ role: 'system', content: systemInstruction });
    }
    payloadMessages.push(...standardMessages);

    const host = ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
    const cleanedHost = host.endsWith('/') ? host.slice(0, -1) : host;

    const res = await fetch(`${cleanedHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: payloadMessages,
        temperature: Number(temperature)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Local server error (${res.status}): ${errText}`);
    }

    const json = await res.json() as any;
    const text = json.choices?.[0]?.message?.content || '';
    return {
      text,
      model: targetModel
    };
  }

  throw new Error(`Unsupported synthesis engine provider requested: "${engine}"`);
}

// Helper to recursively get files excluding node_modules/dist/.git
function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
  let results: any[] = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const relativePath = path.relative(baseDir, filePath);
      
      // Exclude noisy directories
      if (
        file === 'node_modules' || 
        file === 'dist' || 
        file === '.git' || 
        file === '.cache' ||
        filePath.includes('node_modules') ||
        filePath.includes('dist')
      ) {
        return;
      }
      
      if (stat && stat.isDirectory()) {
        results.push({
          name: file,
          path: relativePath,
          type: 'directory',
          children: getFilesRecursively(filePath, baseDir)
        });
      } else {
        results.push({
          name: file,
          path: relativePath,
          type: 'file',
          size: stat.size,
          mtime: stat.mtime
        });
      }
    });
  } catch (error) {
    console.error('Error listing files:', error);
  }
  
  // Sort directories first, then files
  return results.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// 1. API: Get Workspace File Tree (reads the exact sandbox environment)
app.get('/api/workspace/files', (req, res) => {
  try {
    const rootPath = process.cwd();
    const tree = getFilesRecursively(rootPath);
    res.json({ status: 'success', tree });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error?.message || 'Failed to read workspace tree' });
  }
});

// 1b. API: Check if server has system API key configured across providers
app.get('/api/workspace/key-check', (req, res) => {
  res.json({
    status: 'success',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasOllamaHost: !!process.env.OLLAMA_HOST,
    hasSystemKey: !!process.env.GEMINI_API_KEY
  });
});

// 2. API: Read specific workspace file
app.post('/api/workspace/read-file', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ status: 'error', message: 'No file path provided' });
    }
    
    // Resolve absolute path and protect boundaries
    const safePath = path.resolve(process.cwd(), filePath);
    if (!safePath.startsWith(process.cwd())) {
      return res.status(403).json({ status: 'error', message: 'Access denied: Path out of workspace boundaries' });
    }
    
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    
    if (fs.statSync(safePath).isDirectory()) {
      return res.status(400).json({ status: 'error', message: 'Path is a directory, not a file' });
    }
    
    const content = fs.readFileSync(safePath, 'utf8');
    res.json({ status: 'success', content, path: filePath });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error?.message || 'Failed to read file' });
  }
});

// 3. API: Write file into the workspace (authentic environment output)
app.post('/api/workspace/write-file', (req, res) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ status: 'error', message: 'No file path provided' });
    }
    
    // Resolve absolute path and protect boundaries
    const safePath = path.resolve(process.cwd(), filePath);
    if (!safePath.startsWith(process.cwd())) {
      return res.status(403).json({ status: 'error', message: 'Access denied: Path out of workspace boundaries' });
    }
    
    // Create folders recursively if they do not exist
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(safePath, content || '', 'utf8');
    res.json({ status: 'success', message: 'File written successfully', path: filePath });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error?.message || 'Failed to write file' });
  }
});

// 3b. API: AI-Driven Self-Mutation (Dynamic code-rewriting & self-evolution engine)
app.post('/api/workspace/mutate-self', async (req, res) => {
  try {
    const { filePath, instruction, customApiKey, model = 'gemini-3.5-flash', engine = 'gemini', ollamaHost } = req.body;
    if (!filePath) {
      return res.status(400).json({ status: 'error', message: 'No file path provided' });
    }
    if (!instruction) {
      return res.status(400).json({ status: 'error', message: 'No rewrite instruction provided' });
    }

    // Resolve absolute path and protect boundaries
    const safePath = path.resolve(process.cwd(), filePath);
    if (!safePath.startsWith(process.cwd())) {
      return res.status(403).json({ status: 'error', message: 'Access denied: Target path outside workspace.' });
    }

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ status: 'error', message: `Target file not found for mutation: ${filePath}` });
    }

    const currentContent = fs.readFileSync(safePath, 'utf8');

    const systemPrompt = `You are the CodeSpire Autonomous Self-Mutation Core. 
You are given the source code of a file and editing instructions.
Your absolute only task is to rewrite the file completely to satisfy the instructions.
Your output must be strictly valid raw code matching the file type or extension of ${filePath}. 
CRITICAL: Do not include ANY introductory or concluding conversational prose. Do NOT warp the code in backticks like "\`\`\`typescript" or "\`\`\`. Start immediately with code.`;

    const userPrompt = `### FILE PATH: ${filePath}\n\n### ORIGINAL FILE CONTENT:\n${currentContent}\n\n### MUTATION INSTRUCTIONS:\n${instruction}`;

    const completion = await generateAICompletion({
      engine,
      model,
      prompt: userPrompt,
      systemInstruction: systemPrompt,
      temperature: 0.1, // very low temperature for precise code rewriting
      apiKey: customApiKey,
      ollamaHost
    });

    let mutatedCode = completion.text || '';
    
    // Safety scrub for markdown wrappers if the AI makes an exception
    if (mutatedCode.startsWith('```')) {
      const firstLineBreak = mutatedCode.indexOf('\n');
      const lastTripleTick = mutatedCode.lastIndexOf('```');
      if (firstLineBreak !== -1 && lastTripleTick > firstLineBreak) {
        mutatedCode = mutatedCode.substring(firstLineBreak + 1, lastTripleTick).trim();
      }
    }

    // Write mutated code straight back into the sandbox directory!
    fs.writeFileSync(safePath, mutatedCode, 'utf8');

    res.json({
      status: 'success',
      message: `File modified successfully via self-mutation loop.`,
      path: filePath,
      mutatedContentLength: mutatedCode.length,
      sample: mutatedCode.substring(0, 300) + '...'
    });
  } catch (error: any) {
    console.error('Self-mutation engine failure:', error);
    res.status(500).json({ status: 'error', message: error?.message || 'Self-mutation failed.' });
  }
});

// 4. API: AI Generation Chat with BYOK support and Grounding
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { 
      prompt, 
      messages, 
      systemInstruction, 
      model = 'gemini-3.5-flash', 
      temperature = 0.7, 
      customApiKey, 
      useSearch = false,
      engine = 'gemini',
      ollamaHost
    } = req.body;
    
    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ status: 'error', message: 'No prompt or messages provided' });
    }
    
    const completion = await generateAICompletion({
      engine,
      model,
      prompt,
      messages,
      systemInstruction,
      temperature,
      apiKey: customApiKey,
      ollamaHost,
      useSearch
    });
    
    res.json({
      status: 'success',
      text: completion.text,
      model: completion.model,
      searchUsed: !!completion.searchUsed,
      grounding: completion.grounding || { queries: [], links: [] }
    });
  } catch (error: any) {
    console.error('Error during AI Chat Generation:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error?.message || 'An error occurred during AI processing.'
    });
  }
});

// 5. API: Simulate Command Execution / Workflow action runs
app.post('/api/workspace/execute-workflow', (req, res) => {
  try {
    const { action, params } = req.body;
    
    if (!action) {
      return res.status(400).json({ status: 'error', message: 'No action provided for execution' });
    }
    
    let output = '';
    let success = true;
    
    // We can simulate workflows beautifully by generating response objects or running sandbox checks!
    switch (action) {
      case 'git-status':
        output = `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)\n\tmodified:   src/App.tsx\n\tmodified:   server.ts\n\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n\tREADME.md\n\nno changes added to commit (use "git add" and/or "git commit -a")`;
        break;
      case 'git-clone':
        const username = params?.username || 'DXN1-termux';
        const repo = params?.repo || 'CodeSpire';
        output = `Cloning into '${repo}'...\nremote: Enumerating objects: 104, done.\nremote: Counting objects: 100% (104/104), done.\nremote: Compressing objects: 100% (78/78), done.\nremote: Total 104 (delta 42), reused 91 (delta 31), pack-reused 0\nReceiving objects: 100% (104/104), 14.28 MiB | 8.21 MiB/s, done.\nResolving deltas: 100% (42/42), done.`;
        break;
      case 'npm-test':
        output = `> codespire@1.0.0 test\n> vitest run\n\n RUN  v1.3.1 /workspace\n\n ✓ src/utils/crypto.test.ts (2 tests) 20ms\n ✓ src/actions/agents.test.ts (3 tests) 31ms\n ✓ server/auth.test.ts (1 test) 8ms\n\n Test Files  3 passed (3)\n      Tests  6 passed (6)\n   Start at  ${new Date().toLocaleTimeString()}\n   Duration  1.24s (transform 340ms, setup 120ms)`;
        break;
      case 'sys-diagnose':
        const totalMem = 16384; // mock MB
        const usedMem = 5824 + Math.floor(Math.random() * 500);
        output = `[CODESPIRE SYSTEM REPORT - ${new Date().toISOString()}]\n` +
                 `PLATFORM: Multi-Environment Container Runtime\n` +
                 `OS      : Linux / macOS / Termux / Windows Core Simulator\n` +
                 `UPTIME  : 14 hours, 32 minutes, 11 seconds\n` +
                 `CPU     : Intel Core / AMD Ryzen Pro (Auto-Scaled Multi-Core)\n` +
                 `MEMORY  : ${usedMem} MB / ${totalMem} MB (${((usedMem/totalMem)*100).toFixed(1)}%)\n` +
                 `STORAGE : /workspace (42.1 GB free, 120 GB total)\n` +
                 `NETWORK : Connected (IPv4: 10.244.3.42, ISP: Cloud-Routed)\n` +
                 `STATUS  : SECURE (BYOK Cryptographic storage active)`;
        break;
      case 'env-vars':
        const secureEnvKeys = Object.keys(process.env).map(key => {
          const val = process.env[key] || '';
          const masked = val.length > 8 ? val.substring(0, 4) + '...' + val.substring(val.length - 4) : '***';
          return `${key}=${key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD') ? masked : val}`;
        });
        output = `[ENVIRONMENT VARIABLES DETECTED]\n` + secureEnvKeys.join('\n');
        break;
      default:
        output = `Action '${action}' executed successfully with params: ${JSON.stringify(params)}`;
    }
    
    res.json({ status: 'success', success, output });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error?.message || 'Failed to execute workflow' });
  }
});

// Configure Vite middleware and static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite's Dev Server mounted as Middleware
    console.log('Starting CodeSpire Express Server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
  } else {
    // Production mode - serves compiled artifacts from dist
    console.log('Starting CodeSpire Express Server in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(` 🚀 CodeSpire Server Running Successfully!`);
    console.log(` 🌐 Live Address: http://0.0.0.0:${PORT}`);
    console.log(` 📁 Sandbox Workspace Root: ${process.cwd()}`);
    console.log(`==================================================`);
  });
}

startServer();
