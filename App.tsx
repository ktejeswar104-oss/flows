import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Code, Send, Download, FileText, X, Check, Copy, Terminal, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from './lib/firebase';
import { cn, generateTransferCode, formatBytes } from './lib/utils';
import { useAuth } from './lib/AuthContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LANGUAGES = [
  { name: 'Python', value: 'python' },
  { name: 'JavaScript', value: 'javascript' },
  { name: 'C', value: 'c' },
  { name: 'C++', value: 'cpp' },
  { name: 'Java', value: 'java' },
];

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [transferType, setTransferType] = useState<'file' | 'code'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [receiveCode, setReceiveCode] = useState('');
  const [receivedData, setReceivedData] = useState<any>(null);
  const [isReceiving, setIsReceiving] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedLang, setSelectedLang] = useState('python');
  const [output, setOutput] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsUploading(true);
    
    const code = generateTransferCode();
    const storageRef = ref(storage, `transfers/${code}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        setIsUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await setDoc(doc(db, 'transfers', code), {
          id: code,
          type: 'file',
          name: file.name,
          fileUrl: downloadURL,
          fileSize: file.size,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          senderId: auth.currentUser?.uid || null,
        });
        setGeneratedCode(code);
        setIsUploading(false);
      }
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  const handleSendCode = async () => {
    if (!codeSnippet.trim()) return;
    setIsUploading(true);
    const code = generateTransferCode();
    
    await setDoc(doc(db, 'transfers', code), {
      id: code,
      type: 'code',
      content: codeSnippet,
      language: selectedLang,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      senderId: auth.currentUser?.uid || null,
    });
    
    setGeneratedCode(code);
    setIsUploading(false);
  };

  const handleReceive = async () => {
    if (receiveCode.length !== 6) return;
    setIsReceiving(true);
    try {
      const docSnap = await getDoc(doc(db, 'transfers', receiveCode));
      if (docSnap.exists()) {
        setReceivedData(docSnap.data());
      } else {
        alert("Invalid or expired code.");
      }
    } catch (error) {
      console.error("Receive error:", error);
    }
    setIsReceiving(false);
  };

  const simulateCompile = async () => {
    setIsCompiling(true);
    setOutput(null);
    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simple mock logic for "compilation"
    if (selectedLang === 'python') {
      setOutput(">>> Hello World!\n>>> Process finished with exit code 0");
    } else {
      setOutput(`[${selectedLang.toUpperCase()}] Compilation successful.\nOutput: Hello from ShareFlow!`);
    }
    setIsCompiling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-100 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-100 selection:text-zinc-950">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-800/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 border-b border-zinc-800/50 backdrop-blur-md bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-100/10">
              <Send className="w-6 h-6 text-zinc-950" />
            </div>
            <span className="text-xl font-bold tracking-tight">ShareFlow</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-6 h-6 rounded-full" alt="User" />
                <span className="text-sm font-medium">{user.displayName || 'User'}</span>
              </div>
            ) : (
              <button className="text-sm font-medium hover:text-zinc-400 transition-colors">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 flex gap-2">
            <button
              onClick={() => setActiveTab('send')}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                activeTab === 'send' ? "bg-zinc-100 text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              Send Data
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                activeTab === 'receive' ? "bg-zinc-100 text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              Receive Data
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'send' ? (
            <motion.div
              key="send"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setTransferType('file')}
                  className={cn(
                    "flex-1 p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3",
                    transferType === 'file' ? "bg-zinc-100/5 border-zinc-100" : "bg-zinc-900/30 border-zinc-800 opacity-50 hover:opacity-100"
                  )}
                >
                  <Upload className="w-8 h-8" />
                  <span className="font-semibold">Files & Media</span>
                </button>
                <button
                  onClick={() => setTransferType('code')}
                  className={cn(
                    "flex-1 p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3",
                    transferType === 'code' ? "bg-zinc-100/5 border-zinc-100" : "bg-zinc-900/30 border-zinc-800 opacity-50 hover:opacity-100"
                  )}
                >
                  <Code className="w-8 h-8" />
                  <span className="font-semibold">Code Snippets</span>
                </button>
              </div>

              {transferType === 'file' ? (
                <div {...getRootProps()} className={cn(
                  "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 transition-all duration-300 cursor-pointer",
                  isDragActive ? "border-zinc-100 bg-zinc-100/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/20"
                )}>
                  <input {...getInputProps()} />
                  <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                    <Upload className="w-10 h-10 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold mb-2">Drop files here or click to upload</p>
                    <p className="text-zinc-500">Transfer photos, videos, PDFs, and more</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-zinc-100 transition-colors"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={simulateCompile}
                      disabled={isCompiling}
                      className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                      Run Code
                    </button>
                  </div>
                  <textarea
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder="Paste your code here..."
                    className="w-full h-64 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 font-mono text-sm outline-none focus:border-zinc-100 transition-colors resize-none"
                  />
                  {output && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-xs text-zinc-400">
                      <p className="text-zinc-500 mb-2 uppercase tracking-widest font-bold">Output</p>
                      <pre>{output}</pre>
                    </div>
                  )}
                  <button
                    onClick={handleSendCode}
                    className="w-full py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all active:scale-[0.98]"
                  >
                    Generate Transfer Code
                  </button>
                </div>
              )}

              {isUploading && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
                    <Loader2 className="w-12 h-12 text-zinc-100 animate-spin mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Uploading...</h3>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-zinc-100"
                      />
                    </div>
                    <p className="text-zinc-500">{Math.round(uploadProgress)}% completed</p>
                  </div>
                </div>
              )}

              {generatedCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                >
                  <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center relative">
                    <button onClick={() => setGeneratedCode(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-100">
                      <X className="w-6 h-6" />
                    </button>
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Ready to Share!</h3>
                    <p className="text-zinc-500 mb-8">Share this 6-digit code with the recipient</p>
                    <div className="text-6xl font-black tracking-[0.2em] text-zinc-100 mb-8 bg-zinc-950 py-8 rounded-2xl border border-zinc-800">
                      {generatedCode}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        alert("Code copied to clipboard!");
                      }}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-semibold transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                      Copy Code
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="receive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-12 text-center">
                <h3 className="text-2xl font-bold mb-2">Enter Transfer Code</h3>
                <p className="text-zinc-500 mb-8">Enter the 6-digit code to download your data</p>
                <div className="flex justify-center gap-4 mb-8">
                  <input
                    type="text"
                    maxLength={6}
                    value={receiveCode}
                    onChange={(e) => setReceiveCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full max-w-[300px] text-center text-4xl font-black tracking-[0.2em] bg-zinc-950 border border-zinc-800 rounded-2xl py-6 outline-none focus:border-zinc-100 transition-colors"
                    placeholder="000000"
                  />
                </div>
                <button
                  onClick={handleReceive}
                  disabled={receiveCode.length !== 6 || isReceiving}
                  className="w-full max-w-[300px] py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  {isReceiving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Retrieve Data"}
                </button>
              </div>

              {receivedData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center">
                        {receivedData.type === 'file' ? <FileText className="w-7 h-7" /> : <Code className="w-7 h-7" />}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">{receivedData.name || (receivedData.type === 'code' ? 'Code Snippet' : 'Untitled File')}</h4>
                        <p className="text-zinc-500 text-sm">
                          {receivedData.type === 'file' ? formatBytes(receivedData.fileSize) : `${receivedData.language} script`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setReceivedData(null)} className="text-zinc-500 hover:text-zinc-100">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {receivedData.type === 'file' ? (
                    <a
                      href={receivedData.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                    >
                      <Download className="w-6 h-6" />
                      Download File
                    </a>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl overflow-hidden border border-zinc-800">
                        <SyntaxHighlighter
                          language={receivedData.language}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, padding: '24px', background: '#09090b' }}
                        >
                          {receivedData.content}
                        </SyntaxHighlighter>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(receivedData.content);
                          alert("Code copied!");
                        }}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-semibold transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                        Copy Snippet
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-12 border-t border-zinc-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
          <p>© 2026 ShareFlow. Secure P2P-style data transfer.</p>
        </div>
      </footer>
    </div>
  );
}
