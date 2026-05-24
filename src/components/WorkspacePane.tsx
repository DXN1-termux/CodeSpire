import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Save, 
  FilePlus, 
  FolderPlus, 
  X, 
  CheckCircle, 
  Terminal,
  Loader2,
  Lock
} from 'lucide-react';
import { WorkspaceFile } from '../types';

interface WorkspacePaneProps {
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error' | 'agent') => void;
  onFileSelect: (filePath: string) => void;
  activeFilePath: string | null;
}

export default function WorkspacePane({ onAddLog, onFileSelect, activeFilePath }: WorkspacePaneProps) {
  const [fileTree, setFileTree] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({ '': true });
  
  // File editor state
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // Fetch file tree
  const fetchFileTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace/files');
      const data = await response.json();
      if (data.status === 'success') {
        setFileTree(data.tree);
      } else {
        onAddLog(`Error loading workspace: ${data.message}`, 'error');
      }
    } catch (err: any) {
      onAddLog(`Failed to fetch workspace files: ${err?.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileTree();
  }, []);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Read clean workspace file content
  const handleReadFile = async (filePath: string) => {
    setReadingFile(true);
    try {
      const response = await fetch('/api/workspace/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedFile({ path: filePath, content: data.content });
        setEditorContent(data.content);
        onFileSelect(filePath);
        onAddLog(`File loaded: ${filePath}`, 'info');
      } else {
        onAddLog(`Failed to read file ${filePath}: ${data.message}`, 'error');
      }
    } catch (err: any) {
      onAddLog(`Error reading workspace file: ${err?.message || err}`, 'error');
    } finally {
      setReadingFile(false);
    }
  };

  // Clean filesystem write back
  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSavingFile(true);
    try {
      const response = await fetch('/api/workspace/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile.path, content: editorContent })
      });
      const data = await response.json();
      if (data.status === 'success') {
        onAddLog(`Successfully saved edits to ${selectedFile.path}`, 'success');
        setSelectedFile(prev => prev ? { ...prev, content: editorContent } : null);
        fetchFileTree();
      } else {
        onAddLog(`Failed to save edits to ${selectedFile.path}: ${data.message}`, 'error');
      }
    } catch (err: any) {
      onAddLog(`Error saving workspace file: ${err?.message || err}`, 'error');
    } finally {
      setSavingFile(false);
    }
  };

  // Create empty file
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    setSavingFile(true);
    try {
      const response = await fetch('/api/workspace/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: newFileName.trim(), content: '' })
      });
      const data = await response.json();
      if (data.status === 'success') {
        onAddLog(`New file created: ${newFileName}`, 'success');
        setNewFileName('');
        setIsCreatingFile(false);
        fetchFileTree();
        handleReadFile(data.path);
      } else {
        onAddLog(`Failed to create file: ${data.message}`, 'error');
      }
    } catch (err: any) {
      onAddLog(`Error creating workspace file: ${err?.message || err}`, 'error');
    } finally {
      setSavingFile(false);
    }
  };

  // Render Directory and Files Tree beautifully
  const renderTreeNodes = (nodes: WorkspaceFile[], depth = 0) => {
    return nodes.map((node) => {
      const isDir = node.type === 'directory';
      const isExpanded = !!expandedDirs[node.path];
      const isSelected = selectedFile?.path === node.path;

      return (
        <div key={node.path} className="select-none">
          <div 
            onClick={() => isDir ? toggleDir(node.path) : handleReadFile(node.path)}
            className={`flex items-center py-1.5 px-2 hover:bg-neutral-800/60 rounded cursor-pointer transition-all duration-200 group ${
              isSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-medium' : 'text-neutral-300'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isDir ? (
              <>
                <span className="mr-1 text-neutral-500 transition-transform duration-200">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className="mr-2 text-amber-500/80 group-hover:text-amber-400">
                  <Folder size={15} />
                </span>
              </>
            ) : (
              <>
                <span className="w-[18px]" /> {/* spacing alignment for leaf nodes */}
                <span className="mr-2 text-neutral-500 group-hover:text-emerald-400">
                  <FileCode size={15} className={isSelected ? 'text-emerald-400' : ''} />
                </span>
              </>
            )}
            <span className="text-xs truncate font-mono tracking-tight group-hover:translate-x-0.5 transition-transform duration-200">{node.name}</span>
          </div>

          {isDir && isExpanded && node.children && (
            <div className="mt-0.5">
              {renderTreeNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800/80 rounded-lg overflow-hidden font-mono shadow-xl relative">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-900 border-b border-neutral-800/80 select-none">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-emerald-400 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-100">Workspace Sandbox</h2>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => setIsCreatingFile(prev => !prev)}
            title="Create New File"
            className="p-1 text-neutral-400 hover:text-emerald-400 rounded hover:bg-neutral-800 transition-colors"
          >
            <FilePlus size={14} />
          </button>
          <button 
            type="button"
            onClick={fetchFileTree}
            title="Refresh Files"
            className="p-1 text-neutral-400 hover:text-emerald-400 rounded hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isCreatingFile && (
        <form onSubmit={handleCreateFile} className="p-2 border-b border-neutral-800 bg-neutral-905 flex items-center gap-1.5 animation-fade-in">
          <input 
            type="text" 
            placeholder="src/components/MyComponent.tsx"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800/80 text-xs px-2 py-1 text-emerald-400 focus:outline-none focus:border-emerald-500 rounded font-mono"
            autoFocus
          />
          <button 
            type="submit" 
            className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-xs px-2"
          >
            Create
          </button>
          <button 
            type="button" 
            onClick={() => setIsCreatingFile(false)}
            className="p-1 bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700"
          >
            <X size={12} />
          </button>
        </form>
      )}

      {/* Pane Layout split or list */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Left Tree Explorer */}
        <div className="w-full md:w-56 border-r border-neutral-800/80 flex flex-col min-h-0 overflow-y-auto p-2 bg-neutral-950/40 custom-scrollbar select-none">
          {loading && fileTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-2">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span className="text-[10px]">INDEXING DIRECTORY...</span>
            </div>
          ) : fileTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-600 text-[10px] text-center px-4">
              WORKSPACE EMPTY OR ACCESS DENIED
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderTreeNodes(fileTree)}
            </div>
          )}
        </div>

        {/* Right Code Editor Pane */}
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-950/80 relative">
          {readingFile ? (
            <div className="absolute inset-0 bg-neutral-950/80 z-20 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
              <div className="text-xs text-emerald-500 tracking-wider font-bold">DECRYPTING & PARSING FILE SYSTEM...</div>
            </div>
          ) : selectedFile ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* File Title and Controls */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-xs">
                <span className="text-neutral-400 select-all truncate max-w-xs">{selectedFile.path}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-500 tracking-wider uppercase flex items-center gap-1">
                    <CheckCircle size={10} /> Active Draft
                  </span>
                  <button
                    onClick={handleSaveFile}
                    disabled={savingFile || selectedFile.content === editorContent}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs select-none ${
                      selectedFile.content === editorContent 
                        ? 'opacity-50 cursor-not-allowed bg-neutral-800 text-neutral-500' 
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {savingFile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Change
                  </button>
                </div>
              </div>

              {/* Workspace Code Textarea */}
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-neutral-950 text-neutral-200 outline-none p-4 font-mono text-xs leading-relaxed resize-none overflow-y-auto selection:bg-emerald-500/25 select-text custom-scrollbar focus:ring-0 ring-0 hover:ring-0"
                style={{ tabSize: 2, WebkitTextFillColor: 'inherit' }}
                placeholder="// Start writing code output for the workspace..."
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8 text-center select-none bg-radial from-neutral-900/40 via-transparent">
              <FileCode className="w-10 h-10 mb-3 text-neutral-600 animate-pulse" />
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">CodeSpire Direct Workspace Editor</div>
              <p className="text-[11px] max-w-sm text-neutral-500 leading-relaxed mb-4">
                Select a source file in the left directory tree to inspect code contents, perform edits, or export code outputs instantly.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                <span className="text-[10px] bg-neutral-900 text-emerald-400 border border-neutral-800 py-1 px-1.5 rounded">⚡ Live FS Write</span>
                <span className="text-[10px] bg-neutral-900 text-emerald-400 border border-neutral-800 py-1 px-1.5 rounded">🔒 Encrypted Storage</span>
                <span className="text-[10px] bg-neutral-900 text-emerald-400 border border-neutral-800 py-1 px-1.5 rounded">🛸 Termux Support</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
