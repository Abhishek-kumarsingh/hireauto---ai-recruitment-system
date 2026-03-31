'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Paperclip, Loader2, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'file';
  fileName?: string;
}

const ChatInterface = () => {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hi! I'm HireAuto Bot. Which job are you applying for?", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [candidateData, setCandidateData] = useState<any>({
    job: '',
    experience: 0,
    skills: [],
    projects: 0,
    resumeData: null,
    score: 0,
    status: 'Cold'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'bot', type: 'text' | 'file' = 'text', fileName?: string) => {
    const newMessage: Message = { id: Date.now().toString(), text, sender, timestamp: new Date(), type, fileName };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg = input.trim();
    setInput('');
    addMessage(userMsg, 'user');
    setIsProcessing(true);

    // Process steps
    setTimeout(async () => {
      switch (step) {
        case 0: // Job
          setCandidateData(prev => ({ ...prev, job: userMsg }));
          addMessage(`Great! How many years of experience do you have in ${userMsg}?`, 'bot');
          setStep(1);
          break;
        case 1: // Experience
          const exp = parseInt(userMsg) || 0;
          setCandidateData(prev => ({ ...prev, experience: exp }));
          addMessage("What are your top skills? (comma-separated, e.g., React, Node.js, Python)", 'bot');
          setStep(2);
          break;
        case 2: // Skills
          const skills = userMsg.split(',').map(s => s.trim());
          setCandidateData(prev => ({ ...prev, skills }));
          addMessage("How many significant projects have you worked on?", 'bot');
          setStep(3);
          break;
        case 3: // Projects
          const projects = parseInt(userMsg) || 0;
          const updatedData = { ...candidateData, projects };
          setCandidateData(updatedData);
          addMessage("Almost done! Please upload your resume (PDF) for a final score boost.", 'bot');
          setStep(4);
          // Calculate initial score without resume
          calculateScore(updatedData);
          break;
        default:
          addMessage("I've received your application. Our HR team will get back to you soon!", 'bot');
      }
      setIsProcessing(false);
    }, 1000);
  };

  const calculateScore = async (data: any) => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: data.experience,
          skills: data.skills,
          projects: data.projects,
          resumeQuality: data.resumeData?.qualityScore || 0
        })
      });
      const result = await res.json();
      setCandidateData(prev => ({ ...prev, score: result.score, status: result.status }));
      
      if (result.status === 'Hot') {
        addMessage(`Wow! You're a HOT candidate with a score of ${result.score}/100. We're scheduling an instant HR call for you!`, 'bot');
        // Trigger scheduling
        await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: 'Candidate Phone', candidateName: 'Candidate Name' })
        });
      } else {
        addMessage(`Your current application score is ${result.score}/100 (${result.status}).`, 'bot');
      }

      // Save to Firebase
      if (auth.currentUser) {
        const path = 'candidates';
        try {
          await addDoc(collection(db, path), {
            ...data,
            score: result.score,
            status: result.status,
            uid: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }

    } catch (error) {
      console.error('Scoring error:', error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || file.type !== 'application/pdf') return;

    addMessage(`Uploading ${file.name}...`, 'user', 'file', file.name);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        body: formData
      });
      const resumeData = await res.json();
      
      const updatedData = { ...candidateData, resumeData };
      setCandidateData(updatedData);
      addMessage("Resume parsed successfully! Recalculating your score...", 'bot');
      calculateScore(updatedData);
    } catch (error) {
      addMessage("Sorry, I couldn't process your resume. Let's continue with what we have.", 'bot');
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] },
    noClick: step !== 4,
    noKeyboard: step !== 4
  });

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-[#075E54] p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold">HireAuto Bot</h2>
            <p className="text-xs opacity-80">Online | AI Recruitment</p>
          </div>
        </div>
        {user ? (
          <button onClick={() => signOut(auth)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Logout">
            <LogOut size={18} />
          </button>
        ) : (
          <button onClick={handleLogin} className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/30 transition-colors">
            <LogIn size={14} />
            Login
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#E5DDD5]">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-xl shadow-sm relative ${
                msg.sender === 'user' 
                  ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none'
              }`}>
                {msg.type === 'file' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip size={16} className="text-blue-500" />
                    <span className="font-medium truncate">{msg.fileName}</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                )}
                <span className="text-[10px] opacity-50 mt-1 block text-right">
                  {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-xl shadow-sm rounded-tl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#075E54]" />
              <span className="text-xs text-gray-500 italic">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#F0F0F0] border-t border-gray-200" {...getRootProps()}>
        <input {...getInputProps()} />
        <div className="flex items-center gap-2">
          <button 
            className={`p-2 rounded-full transition-colors ${step === 4 ? 'text-[#075E54] hover:bg-gray-200' : 'text-gray-400 cursor-not-allowed'}`}
            title="Upload Resume"
            disabled={step !== 4}
          >
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isDragActive ? "Drop PDF here..." : "Type a message..."}
            className="flex-1 bg-white p-2 px-4 rounded-full border-none focus:ring-2 focus:ring-[#075E54] text-sm outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !user}
            className="p-2 bg-[#075E54] text-white rounded-full hover:bg-[#128C7E] transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
        {!user && (
          <p className="text-[10px] text-center text-red-500 mt-2 font-bold">
            Please login with Google to start your application.
          </p>
        )}
        {step === 4 && user && (
          <p className="text-[10px] text-center text-gray-500 mt-2 italic">
            Drag & drop your resume PDF here to boost your score!
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
