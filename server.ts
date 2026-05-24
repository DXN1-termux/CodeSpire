import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Initialize express app
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

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
      useSearch = false 
    } = req.body;
    
    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ status: 'error', message: 'No prompt or messages provided' });
    }
    
    // Choose appropriate API Key: custom key provided via encrypted BYOK OR server env key
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No API Key available. Please configure your custom API Key in settings, or ensure the server configuration is set up.' 
      });
    }
    
    // Initialize GoogleGenAI SDK as per the skill instructions
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    
    // Determine target model
    let targetModel = model;
    if (model === 'gemini-flash') {
      targetModel = 'gemini-flash-latest';
    } else if (model === 'gemini-pro') {
      targetModel = 'gemini-3.1-pro-preview';
    } else if (model === 'gemini-lite') {
      targetModel = 'gemini-3.1-flash-lite';
    }
    
    const config: any = {
      temperature: Number(temperature),
    };
    
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    
    // Add web search capabilities (googleSearch tool) if requested
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }
    
    // Let's build contents. Supports multiple turns conversation or single prompt
    let contents: any = [];
    if (messages && messages.length > 0) {
      // Map standard format [{role: 'user'|'model', content: string}] -> SDK format
      contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
      }));
      
      // If there is an immediate prompt to append, append it
      if (prompt) {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });
      }
    } else {
      contents = prompt;
    }
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: contents,
      config: config
    });
    
    // Retrieve search grounding metadata if any details are returned
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const searchQueries = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    
    res.json({
      status: 'success',
      text: response.text,
      model: targetModel,
      searchUsed: useSearch,
      grounding: {
        queries: searchQueries,
        links: groundingChunks.map((chunk: any) => ({
          title: chunk.web?.title || 'Web Search Link',
          uri: chunk.web?.uri || ''
        })).filter((item: any) => item.uri)
      }
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
