import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { TargetType, AIAnalysis } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Phone, 
  AtSign, 
  CheckCircle, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  Mic,
  MicOff,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { analyzeReportAdvanced } from '../services/aiService';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string | React.ReactNode;
  timestamp: number;
}

export default function ChatbotReport({ user, onSuccess, onCancel }: { 
  user: User | null; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Report State
  const [reportData, setReportData] = useState<{
    targetType: TargetType | null;
    identifier: string;
    description: string;
    image?: string | null;
  }>({
    targetType: null,
    identifier: '',
    description: '',
  });

  const [currentStep, setCurrentStep] = useState<'WELCOME' | 'TYPE' | 'INPUT' | 'DESCRIPTION' | 'CONFIRMATION' | 'SUBMITTING' | 'DONE'>('WELCOME');

  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage("Hi! I'm SafeBot. I'm here to help you report a scam or threat to the community. It's confidential and secure.");
      setTimeout(() => {
        addBotMessage("First, what kind of entity are you reporting?");
        setCurrentStep('TYPE');
      }, 1000);
    }

    // Initialize Speech Recognition
    const win = window as any;
    if (win.webkitSpeechRecognition || win.SpeechRecognition) {
      const SpeechRecognition = win.webkitSpeechRecognition || win.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isBotTyping]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addBotMessage = (content: string | React.ReactNode) => {
    setIsBotTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Math.random().toString(36),
        type: 'bot',
        content,
        timestamp: Date.now()
      }]);
      setIsBotTyping(false);
    }, 800);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36),
      type: 'user',
      content,
      timestamp: Date.now()
    }]);
  };

  const handleSelectType = (type: TargetType) => {
    setReportData(prev => ({ ...prev, targetType: type }));
    addUserMessage(type === 'phone' ? "Reporting a Phone Number" : "Reporting a Username");
    setCurrentStep('INPUT');
    addBotMessage(`Understood. What is the ${type === 'phone' ? 'Phone Number' : 'Username'}?`);
  };

  const handleInputSubmit = (value: string) => {
    if (!value.trim() && !screenshot) return;
    
    if (currentStep === 'INPUT') {
      setReportData(prev => ({ ...prev, identifier: value }));
      addUserMessage(value);
      setCurrentStep('DESCRIPTION');
      addBotMessage("Got it. Now, please describe the incident. You can use your voice or type it out. You can also attach a screenshot if you have one.");
    } else if (currentStep === 'DESCRIPTION') {
      setReportData(prev => ({ ...prev, description: value, image: screenshot }));
      addUserMessage(value + (screenshot ? " [Evidence Attached]" : ""));
      setCurrentStep('CONFIRMATION');
      addBotMessage(
        <div className="space-y-4">
          <p>I've gathered all the details. Here is a summary of your report:</p>
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-slate-500 uppercase font-black">Target</span> <span className="text-white">{reportData.targetType === 'phone' ? 'Phone' : 'User'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 uppercase font-black">ID</span> <span className="text-white font-mono">{reportData.identifier}</span></div>
            <div className="pt-2 border-t border-slate-700">
              <span className="text-slate-500 uppercase font-black block mb-1">Incident</span>
              <span className="text-slate-300 italic">"{value}"</span>
            </div>
            {screenshot && (
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 uppercase font-black">Screenshot</span>
                <span className="text-blue-500 font-black">ATTACHED</span>
              </div>
            )}
          </div>
          <p>Shall I proceed and send this to the administration team for verification?</p>
          <div className="flex gap-2">
            <button 
              onClick={() => finalizeReport(value, screenshot)}
              className="flex-1 bg-blue-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20"
            >
              Confirm & Send
            </button>
            <button 
              onClick={onCancel}
              className="px-4 py-3 bg-slate-800 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    setInput('');
    setScreenshot(null);
  };

  const finalizeReport = async (desc: string, img: string | null) => {
    setCurrentStep('SUBMITTING');
    addBotMessage(
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin" size={16} />
        <span>Synchronizing with SafeCircle Network... Checking for existing threats...</span>
      </div>
    );

    try {
      if (!user) throw new Error("You must be signed in to submit a report.");
      
      let analysis: AIAnalysis;
      try {
        analysis = await analyzeReportAdvanced(
          desc,
          "Chatbot Submission",
          img || undefined
        );
      } catch (e) {
        console.warn("AI Analysis skipped or failed:", e);
        analysis = {
          type: "Manual Report",
          severity: "medium",
          confidence: 70,
          consistencyFlag: 'consistent',
          sentiment: "Manual Submission",
          intent: "Report transmitted via SafeBot",
          threatLevel: "medium"
        };
      }

      const finalData: any = {
        userId: user.uid,
        targetValue: reportData.identifier,
        targetType: reportData.targetType,
        description: desc,
        aiAnalysis: analysis,
        extractedText: analysis.extractedText || "None",
        consistencyFlag: analysis.consistencyFlag || "consistent",
        isManual: true,
        status: 'pending',
        createdAt: Date.now()
      };

      if (img) finalData.imageUrl = img;

      await addDoc(collection(db, 'reports'), finalData);
      
      setCurrentStep('DONE');
      addBotMessage(
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle size={20} />
            <span className="font-black uppercase tracking-widest text-sm">Report Received</span>
          </div>
          <p>Thank you. Your report has been securely transmitted. Our administrators will verify the details immediately. Stay safe within the circle.</p>
          <button 
            onClick={onSuccess}
            className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      );
    } catch (error: any) {
      console.error(error);
      let errorMsg = error?.message || "Internal network error.";
      try {
        if (errorMsg.startsWith("{")) {
          const parsed = JSON.parse(errorMsg);
          errorMsg = `Security Rule Violation: ${parsed.operationType} on ${parsed.path}`;
        }
      } catch (e) {}

      addBotMessage(
        <div className="text-red-500 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-black uppercase tracking-widest text-sm">Transmission Failed</span>
          </div>
          <p>{errorMsg}</p>
          <button 
            onClick={() => setCurrentStep('DESCRIPTION')}
            className="w-full py-3 bg-slate-800 rounded-xl text-[10px] font-black uppercase"
          >
            Try Again
          </button>
        </div>
      );
      
      if (error instanceof Error && !error.message.startsWith("{")) {
        handleFirestoreError(error, OperationType.CREATE, 'reports');
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col h-[600px] overflow-hidden">
      {/* Chat Header */}
      <div className="px-8 py-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Assistant</div>
            <div className="text-xl font-display font-black text-white uppercase tracking-tighter">SafeBot 1.0</div>
          </div>
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
          <ShieldCheck size={20} className="rotate-45" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                  msg.type === 'bot' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {msg.type === 'bot' ? <Bot size={16} /> : <UserIcon size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.type === 'bot' 
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none' 
                    : 'bg-blue-600 text-white rounded-tr-none shadow-lg'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
          {isBotTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex gap-1 items-center">
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions / Input */}
      <div className="p-8 bg-slate-950 border-t border-slate-800">
        {currentStep === 'TYPE' && !isBotTyping && (
          <div className="flex gap-4">
            <button 
              onClick={() => handleSelectType('phone')}
              className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group"
            >
              <Phone size={20} className="text-slate-500 group-hover:text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Phone</span>
            </button>
            <button 
              onClick={() => handleSelectType('username')}
              className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group"
            >
              <AtSign size={20} className="text-slate-500 group-hover:text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Username</span>
            </button>
          </div>
        )}

        {(currentStep === 'INPUT' || currentStep === 'DESCRIPTION') && !isBotTyping && (
          <div className="space-y-4">
            {screenshot && (
              <div className="relative inline-block">
                <img src={screenshot} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-slate-700" />
                <button 
                  onClick={() => setScreenshot(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleInputSubmit(input);
              }}
              className="relative flex gap-2"
            >
              <div className="relative flex-1">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={currentStep === 'INPUT' ? "Type identifier here..." : "Type description here..."}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all pr-12"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={toggleRecording}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>

              <div className="flex gap-2">
                {currentStep === 'DESCRIPTION' && (
                  <label className="bg-slate-900 border border-slate-800 rounded-2xl px-4 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all text-slate-500 hover:text-white">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <ImageIcon size={18} />
                  </label>
                )}
                <button 
                  disabled={!input.trim() && !screenshot}
                  className="bg-blue-600 rounded-2xl px-6 flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
