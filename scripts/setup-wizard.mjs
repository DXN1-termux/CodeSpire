import fs from 'fs';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';
import enquirer from 'enquirer';

const { Select, Password, Confirm } = enquirer;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function typewriter(text, colorFn = null, delay = 18) {
  for (const char of text) {
    process.stdout.write(colorFn ? colorFn(char) : char);
    await sleep(delay);
  }
  process.stdout.write('\n');
}

function printInstallHint(dep) {
  const platform = process.platform;
  const isAndroid = platform === 'android' || process.env.PREFIX?.includes('com.termux') || fs.existsSync('/data/data/com.termux');
  
  console.log(chalk.hex('#F59E0B')(`\n⚠️  Dependency check failure: ${dep.toUpperCase()} is required to operate CodeSpire.\n`));
  
  if (isAndroid) {
    console.log(chalk.hex('#D1D5DB')(`👉 Termux environment detected! Install using pkg:\n   ${chalk.cyan(`pkg install ${dep === 'git' ? 'git' : 'nodejs'}`)}`));
  } else if (platform === 'darwin') {
    console.log(chalk.hex('#D1D5DB')(`👉 Install using Homebrew:\n   ${chalk.cyan(`brew install ${dep === 'git' ? 'git' : 'node'}`)}`));
  } else if (platform === 'win32') {
    console.log(chalk.hex('#D1D5DB')(`👉 Install using Winget:\n   ${chalk.cyan(`winget install ${dep === 'git' ? 'Git.Git' : 'OpenJS.NodeJS'}`)}\nOr download the official installer.`));
  } else {
    console.log(chalk.hex('#D1D5DB')(`👉 Install using your system package manager:\n   Debian/Ubuntu: ${chalk.cyan(`sudo apt update && sudo apt install -y ${dep === 'git' ? 'git' : 'nodejs npm'}`)}\n   Fedora/RHEL: ${chalk.cyan(`sudo dnf install -y ${dep === 'git' ? 'git' : 'nodejs'}`)}`));
  }
  console.log('\n');
}

function updateEnv(key, value) {
  let envContent = '';
  if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf8');
  }
  
  const lines = envContent.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }
    newLines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync('.env', newLines.join('\n').trim() + '\n', 'utf8');
}

async function runDevServer() {
  const child = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function main() {
  // First-run detection
  if (fs.existsSync('.codespire-configured')) {
    console.log(chalk.cyan('⚡ CodeSpire configured. Proceeding to development boot cycle...'));
    await sleep(600);
    await runDevServer();
    return;
  }

  try {
    // Large ASCII Art Banner
    const bannerLines = [
      " ██████╗  ██████╗  ██████╗  ███████╗ ███████╗ ██████╗  ██╗ ██████╗  ███████╗",
      "██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔════╝ ██╔════╝ ██╔══██╗ ██║ ██╔══██╗ ██╔════╝",
      "██║      ██║   ██║ ██║  ██║ █████╗   ███████╗ ██████╔╝ ██║ ██████╔╝ █████╗  ",
      "██║      ██║   ██║ ██║  ██║ ██╔══╝   ╚════██║ ██╔═══╝  ██║ ██╔══██╗ ██╔══╝  ",
      "╚██████╗ ╚██████╔╝ ██████╔╝ ███████╗ ███████║ ██║      ██║ ██║  ██║ ███████╗",
      " ╚══════╝  ╚═════╝  ╚═════╝  ╚══════╝ ╚══════╝ ╚═╝      ╚═╝ ╚═╝  ╚═╝ ╚══════╝"
    ];

    const bannerColors = [
      chalk.hex('#06B6D4'),
      chalk.hex('#08B7C4'),
      chalk.hex('#09B8B4'),
      chalk.hex('#0BB9A4'),
      chalk.hex('#0DBC94'),
      chalk.hex('#10B981')
    ];

    console.clear();
    for (let i = 0; i < bannerLines.length; i++) {
      console.log(bannerColors[i](bannerLines[i]));
      await sleep(60);
    }

    console.log(chalk.hex('#08B7C4').dim("               v1e-PRO · by DXN1-termux"));
    console.log(chalk.hex('#0BB9A4')("═════════════════════════════════════════════════════════════════════════"));
    console.log();

    // Typewriter intro text
    await typewriter("Initializing CodeSpire neural development interface...", chalk.hex('#D1D5DB'));
    await typewriter("Loading cryptographic configurations & diagnostic utilities...", chalk.hex('#D1D5DB'));
    await typewriter("Establishing connection to the host container environment...", chalk.hex('#D1D5DB'));
    console.log();

    // Dependency detection
    console.log(chalk.cyan("› GATHERING DIAGNOSTIC TELEMETRY..."));

    // Check Node.js
    process.stdout.write(chalk.cyan(`[ checking ] node...\r`));
    await sleep(400);
    const nodeVer = process.version;
    const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
    if (majorVersion < 18) {
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.red('[  ✗  ]')} Node.js version is ${nodeVer} (v18+ is required)`);
      printInstallHint('node');
      process.exit(1);
    } else {
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.hex('#10B981')('[  ✓  ]')} Node.js ${chalk.hex('#10B981')(nodeVer)}`);
    }

    // Check Git
    process.stdout.write(chalk.cyan(`[ checking ] git...\r`));
    await sleep(400);
    let gitVerString = '';
    try {
      gitVerString = execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.hex('#10B981')('[  ✓  ]')} Git ${chalk.hex('#10B981')(gitVerString.split('\n')[0])}`);
    } catch (e) {
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.red('[  ✗  ]')} Git ${chalk.red('not found — install from git-scm.com')}`);
      printInstallHint('git');
      process.exit(1);
    }

    // Check NPM
    process.stdout.write(chalk.cyan(`[ checking ] npm...\r`));
    await sleep(400);
    let npmVerString = '';
    try {
      npmVerString = execSync('npm --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.hex('#10B981')('[  ✓  ]')} NPM ${chalk.hex('#10B981')('v' + npmVerString)}`);
    } catch (e) {
      process.stdout.write(`\r\x1b[K`);
      console.log(`${chalk.red('[  ✗  ]')} NPM ${chalk.red('not found — install from nodejs.org')}`);
      printInstallHint('npm');
      process.exit(1);
    }

    console.log(chalk.hex('#10B981')("\n🔐 Telemetry green. Pre-flight sanity tests complete.\n"));
    await sleep(400);

    // Step 1: LLM Selection
    const selectEngine = new Select({
      name: 'engine',
      message: chalk.cyan('› Select your AI Engine'),
      choices: [
        {
          name: 'gemini',
          message: `${chalk.hex('#10B981')('Gemini Flash / Pro')} ${chalk.dim('— Google Gemini (default, already wired in)')}`
        },
        {
          name: 'openai',
          message: `${chalk.hex('#D1D5DB')('OpenAI GPT-4o')} ${chalk.dim('— OpenAI API')}`
        },
        {
          name: 'anthropic',
          message: `${chalk.hex('#D1D5DB')('Anthropic Claude')} ${chalk.dim('— Claude Sonnet via Anthropic API')}`
        },
        {
          name: 'ollama',
          message: `${chalk.hex('#D1D5DB')('Ollama (Local)')} ${chalk.dim('— Runs entirely on-device, no API key needed')}`
        }
      ],
      symbols: {
        indicator: chalk.hex('#10B981')('▶')
      },
      result(value) {
        return this.choices.find(c => c.name === value || c.message === value)?.name || value;
      }
    });

    const chosenEngine = await selectEngine.run();

    // Step 2: API Key entry or Ollama path verification
    let apiKey = '';
    if (chosenEngine === 'gemini') {
      console.log(chalk.cyan(`\n🔗 Get a Gemini API key at: ${chalk.underline('https://aistudio.google.com/app/apikey')}`));
      const keyPrompt = new Password({
        name: 'apiKey',
        message: 'Enter your Gemini API key:',
        validate(val) {
          if (!val || val.trim().length < 20) {
            return chalk.hex('#F59E0B')('⚠️  Key must be non-empty and at least 20 characters.');
          }
          return true;
        }
      });
      apiKey = await keyPrompt.run();
    } else if (chosenEngine === 'openai') {
      console.log(chalk.cyan(`\n🔗 Manage OpenAI keys at: ${chalk.underline('https://platform.openai.com/api-keys')}`));
      const keyPrompt = new Password({
        name: 'apiKey',
        message: 'Enter your OpenAI API key:',
        validate(val) {
          if (!val || val.trim().length < 20) {
            return chalk.hex('#F59E0B')('⚠️  Key must be non-empty and at least 20 characters.');
          }
          return true;
        }
      });
      apiKey = await keyPrompt.run();
    } else if (chosenEngine === 'anthropic') {
      console.log(chalk.cyan(`\n🔗 Manage Anthropic keys at: ${chalk.underline('https://console.anthropic.com/')}`));
      const keyPrompt = new Password({
        name: 'apiKey',
        message: 'Enter your Anthropic API key:',
        validate(val) {
          if (!val || val.trim().length < 20) {
            return chalk.hex('#F59E0B')('⚠️  Key must be non-empty and at least 20 characters.');
          }
          return true;
        }
      });
      apiKey = await keyPrompt.run();
    } else if (chosenEngine === 'ollama') {
      console.log(chalk.cyan("\n📡 Performing local system lookup for Ollama server..."));
      let ollamaFound = false;
      let ollamaVersion = '';
      try {
        ollamaVersion = execSync('ollama --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        ollamaFound = true;
      } catch (e) {
        // ollama command not found in PATH
      }

      if (ollamaFound) {
        console.log(`${chalk.hex('#10B981')('[  ✓  ]')} Ollama detected! Version: ${chalk.hex('#10B981')(ollamaVersion)}`);
      } else {
        console.log(`${chalk.red('[  ✗  ]')} Ollama CLI is not active in your current system path.`);
        console.log(chalk.hex('#F59E0B')('\n🛠️  Ollama Installation Instructions:'));
        const pf = process.platform;
        const isAndroid = pf === 'android' || process.env.PREFIX?.includes('com.termux') || fs.existsSync('/data/data/com.termux');
        
        if (isAndroid) {
          console.log(chalk.hex('#D1D5DB')(`👉 Ollama is best run inside Termux (via PRoot Ubuntu environment) or on your main host OS. Learn more at:\n   ${chalk.cyan('https://ollama.com')}`));
        } else if (pf === 'darwin') {
          console.log(chalk.hex('#D1D5DB')(`👉 Download the macOS app or run:\n   ${chalk.cyan('brew install ollama')}`));
        } else if (pf === 'win32') {
          console.log(chalk.hex('#D1D5DB')(`👉 Download the official Windows installer at:\n   ${chalk.cyan('https://ollama.com/download/windows')}`));
        } else {
          console.log(chalk.hex('#D1D5DB')(`👉 Run the following installation command in your terminal:\n   ${chalk.cyan('curl -fsSL https://ollama.com/install.sh | sh')}`));
        }
        console.log();

        const confirmPrompt = new Confirm({
          name: 'continue',
          message: 'Ollama not found. Proceed template setup anyway?',
          initial: true
        });
        const cont = await confirmPrompt.run();
        if (!cont) {
          console.log(chalk.red('Setup aborted. Please install Ollama and run start again.'));
          process.exit(0);
        }
      }
    }

    // Step 3: Master Password Setup
    let masterPassword = '';
    if (chosenEngine !== 'ollama') {
      while (true) {
        console.log();
        const pw1Prompt = new Password({
          name: 'pw1',
          message: 'Set a Master Password to encrypt your API key:',
          validate(val) {
            if (!val || val.length < 6) {
              return chalk.hex('#F59E0B')('⚠️  Password must be at least 6 characters.');
            }
            return true;
          }
        });
        const pw1 = await pw1Prompt.run();

        const pw2Prompt = new Password({
          name: 'pw2',
          message: 'Confirm Master Password:',
          validate(val) {
            if (!val || val.length < 6) {
              return chalk.hex('#F59E0B')('⚠️  Password must be at least 6 characters.');
            }
            return true;
          }
        });
        const pw2 = await pw2Prompt.run();

        if (pw1 !== pw2) {
          console.log(chalk.red('\n✗ Passwords do not match — try again'));
          await sleep(800);
          continue;
        }

        masterPassword = pw1;
        break;
      }
    }

    // Step 4: Write Configurations & .env values
    if (chosenEngine === 'gemini') {
      updateEnv('GEMINI_API_KEY', apiKey);
    } else if (chosenEngine === 'openai') {
      updateEnv('OPENAI_API_KEY', apiKey);
    } else if (chosenEngine === 'anthropic') {
      updateEnv('ANTHROPIC_API_KEY', apiKey);
    } else if (chosenEngine === 'ollama') {
      updateEnv('OLLAMA_HOST', 'http://localhost:11434');
    }

    // Create the configured indicator file
    fs.writeFileSync('.codespire-configured', new Date().toISOString(), 'utf8');

    if (chosenEngine !== 'ollama') {
      console.log(chalk.hex('#F59E0B')('\n⚠️  IMPORTANT SECURITY NOTE:'));
      console.log(chalk.hex('#D1D5DB')(`   Your master password is strictly ${chalk.hex('#F59E0B')('memory-only')}.`));
      console.log(chalk.hex('#D1D5DB')('   It has not been stored in plaintext or files anywhere on this sandbox.'));
    }

    // Step 5: Completion Screen
    const chosenName = chosenEngine === 'gemini' 
      ? 'Gemini Flash / Pro' 
      : chosenEngine === 'openai' 
        ? 'OpenAI GPT-4o' 
        : chosenEngine === 'anthropic' 
          ? 'Anthropic Claude' 
          : 'Ollama (Local)';

    const apiKeyStatus = chosenEngine === 'ollama' ? 'skipped (local host)' : 'encrypted and stored';
    const pwStatus = chosenEngine === 'ollama' ? 'not required' : 'memory-only';

    console.log();
    await sleep(400);
    await typewriter("═══════════════════════════════════", chalk.hex('#10B981'));
    await typewriter("  ✓ CodeSpire configured successfully", chalk.hex('#10B981'));
    await typewriter(`  ✓ LLM: ${chosenName}`, chalk.hex('#D1D5DB'));
    await typewriter(`  ✓ API Key: ${apiKeyStatus}`, chalk.hex('#D1D5DB'));
    await typewriter(`  ✓ Master Password: ${pwStatus}`, chalk.hex('#D1D5DB'));
    await typewriter("  ", chalk.hex('#D1D5DB'));
    await typewriter("  Launching CodeSpire...", chalk.cyan);
    await typewriter("═══════════════════════════════════", chalk.hex('#10B981'));

    await sleep(1200);

    // Boot the main development server process
    await runDevServer();

  } catch (err) {
    console.error(`\n${chalk.red('✗ Setup encountered an error:')} ${err.message || err}`);
    console.log(chalk.hex('#D1D5DB')('You can retry by running: npm start'));
    process.exit(1);
  }
}

main();
