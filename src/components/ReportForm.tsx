import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { TargetType, AIAnalysis } from '../types';
import { motion } from 'motion/react';
import { Send, Image as ImageIcon, AlertTriangle, Phone, AtSign, Cpu, CheckCircle, XCircle, Loader2, Mic, ChevronRight, ChevronLeft, Volume2, ShieldCheck, AlertCircle, Bot } from 'lucide-react';
import { analyzeReport, analyzeReportAdvanced } from '../services/aiService';

type Step = 'TYPE' | 'INPUT' | 'EVIDENCE' | 'PROCESSING' | 'CONFIRM' | 'SUCCESS';

export default function ReportForm({ user, onSuccess, onSwitchToChat }: { 
  user: User | null; 
  onSuccess: () => void;
  onSwitchToChat?: () => void;
}) {
  const [step, setStep] = useState<Step>('TYPE');
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [category, setCategory] = useState('Scam / Fraud');
  const [evidence, setEvidence] = useState('');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'QUOTA' | 'GENERIC'>('NONE');
  const [detailedError, setDetailedError] = useState<string | null>(null);

  // File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return alert("File too large (max 5MB)");

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (type === 'image') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 600; // Reduced for faster processing
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setImageFile(canvas.toDataURL('image/jpeg', 0.5)); // Reduced quality for speed
        };
        img.src = result;
      } else {
        setAudioFile(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!evidence && !imageFile) return alert("Please provide at least a text description or an image.");
    setStep('PROCESSING');
    setErrorType('NONE');
    setDetailedError(null);
    setIsManual(false);
    try {
      // Use advanced analysis for deeper insights
      const result = await analyzeReportAdvanced(evidence, category, imageFile || undefined, audioFile || undefined);
      setAnalysis(result);
      if (result.type) setCategory(result.type);
      setStep('CONFIRM');
    } catch (err: any) {
      console.error(err);
      if (err.message === 'AI_QUOTA_EXCEEDED') {
        setErrorType('QUOTA');
      } else {
        setErrorType('GENERIC');
        // Try to extract detailed error from JSON message if it was thrown as one
        try {
          const parsed = JSON.parse(err.message);
          setDetailedError(parsed.details || err.message);
        } catch {
          setDetailedError(err.message);
        }
      }
      setStep('EVIDENCE');
    }
  };

  const skipToManual = () => {
    setIsManual(true);
    setErrorType('NONE');
    // We stay on EVIDENCE step but the button will change
  };

  const proceedToManualConfirm = () => {
    setAnalysis({
      type: "Manual Report",
      severity: "medium",
      confidence: 100,
      consistencyFlag: 'consistent',
      sentiment: "Manual Submission",
      intent: "User reported incident manually",
      threatLevel: "medium"
    });
    setStep('CONFIRM');
  };

  const finalSubmit = async () => {
    const normalizedIdentifier = identifier.trim();
    console.log("Starting finalSubmit", { user: !!user, targetType, hasAnalysis: !!analysis, identifier: normalizedIdentifier });
    if (!user || !targetType || !analysis || !normalizedIdentifier) {
      alert("Missing required data for report submission.");
      return;
    }
    
    setSubmitting(true);
    try {
      const reportData: any = {
        userId: user.uid,
        targetValue: normalizedIdentifier,
        targetType: targetType,
        description: evidence || "Media evidence provided.",
        aiAnalysis: {
          type: analysis.type,
          severity: analysis.severity,
          confidence: analysis.confidence,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          threatLevel: analysis.threatLevel
        },
        extractedText: analysis.extractedText || "",
        consistencyFlag: analysis.consistencyFlag || "consistent",
        isManual: isManual,
        status: 'pending',
        createdAt: Date.now(),
      };

      if (imageFile) reportData.imageUrl = imageFile;
      if (audioFile) reportData.audioUrl = audioFile;

      console.log("Saving report to Firestore...", reportData);
      await addDoc(collection(db, 'reports'), reportData);
      console.log("Report saved successfully!");
      
      setSubmitting(false);
      setStep('SUCCESS');
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (error) {
      console.error("Firestore Save Error:", error);
      alert("Submission failed. Please check your connection and try again.");
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center">
        <AlertTriangle className="mx-auto text-slate-500 mb-4" size={48} />
        <h3 className="text-xl font-display font-bold mb-2">Login Required</h3>
        <p className="text-slate-400 max-w-sm mx-auto">
          You must be part of the SafeCircle community to file a report.
        </p>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'TYPE':
        return (
          <div className="space-y-8 py-8">
            <div className="text-center">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter mb-2">Select Target</h2>
              <p className="text-slate-500 text-sm">What are you reporting today?</p>
              <button 
                onClick={onSwitchToChat}
                className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                title="Use our conversational assistant instead"
              >
                <Bot size={14} /> Prefer a guided chat?
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setTargetType('phone'); setStep('INPUT'); }}
                className="bento-card p-8 flex flex-col items-center gap-4 hover:border-blue-500 hover:bg-blue-500/5 group"
              >
                <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-blue-600 transition-colors">
                  <Phone size={32} className="text-white" />
                </div>
                <span className="font-black uppercase tracking-widest text-sm">Phone Number</span>
              </button>
              <button
                onClick={() => { setTargetType('username'); setStep('INPUT'); }}
                className="bento-card p-8 flex flex-col items-center gap-4 hover:border-blue-500 hover:bg-blue-500/5 group"
              >
                <div className="p-4 bg-slate-800 rounded-2xl group-hover:bg-blue-600 transition-colors">
                  <AtSign size={32} className="text-white" />
                </div>
                <span className="font-black uppercase tracking-widest text-sm">Username</span>
              </button>
            </div>
          </div>
        );

      case 'INPUT':
        return (
          <div className="space-y-8 py-8">
            <button onClick={() => setStep('TYPE')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-center">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter mb-2">Identify Target</h2>
              <p className="text-slate-500 text-sm">Provide the exact {targetType === 'phone' ? 'number' : 'username'}</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={targetType === 'phone' ? '+1 000 000 0000' : '@username'}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl px-8 py-6 text-2xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-all text-center"
              />
              <button
                disabled={!identifier}
                onClick={() => setStep('EVIDENCE')}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm transition-all"
              >
                Next Step <ChevronRight size={20} />
              </button>
            </div>
          </div>
        );

      case 'EVIDENCE':
        return (
          <div className="space-y-8 py-8">
            <button onClick={() => setStep('INPUT')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-center">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter mb-2">Collect Evidence</h2>
              <p className="text-slate-500 text-sm">Screenshots, audio, or detailed description</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group/upload h-32">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'image')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={`absolute inset-0 bento-card flex flex-col items-center justify-center gap-2 border-dashed transition-colors ${imageFile ? 'bg-blue-500/10 border-blue-500' : 'group-hover/upload:border-blue-500/50'}`}>
                    {imageFile ? (
                      <div className="relative w-full h-full p-2">
                        <img src={imageFile} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                        <div className="absolute inset-0 bg-blue-600/20 rounded-xl flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                          <CheckCircle className="text-white" size={32} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="text-slate-500" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Image Evidence</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="relative group/upload h-32">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(e, 'audio')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={`absolute inset-0 bento-card flex flex-col items-center justify-center gap-2 border-dashed transition-colors ${audioFile ? 'bg-blue-500/10 border-blue-500' : 'group-hover/upload:border-blue-500/50'}`}>
                    {audioFile ? (
                      <>
                        <Volume2 className="text-blue-500" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Audio Recorded</span>
                      </>
                    ) : (
                      <>
                        <Mic className="text-slate-500" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voice Evidence</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">Description</label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Tell us what happened..."
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 text-white placeholder-slate-700 min-h-[150px] focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {isManual ? (
                <button
                  disabled={!evidence && !imageFile}
                  onClick={proceedToManualConfirm}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_rgba(249,115,22,0.2)]"
                >
                  Confirm Manual Report <Send size={20} />
                </button>
              ) : (
                <button
                  disabled={!evidence && !imageFile}
                  onClick={startAnalysis}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_rgba(37,99,235,0.2)]"
                >
                  Analyze Evidence <Cpu size={20} />
                </button>
              )}

              {isManual && (
                <div className="text-center">
                  <button 
                    onClick={() => setIsManual(false)} 
                    className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-500 transition-colors"
                  >
                    Wait, try AI Analysis again
                  </button>
                </div>
              )}

              {errorType !== 'NONE' && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase text-red-500 tracking-tight">
                        {errorType === 'QUOTA' ? 'AI Quota Exceeded' : 'Analysis Failed'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {errorType === 'QUOTA' 
                          ? "The AI is currently at capacity. You can wait a few minutes or proceed with a manual report."
                          : detailedError 
                            ? `Error: ${detailedError}`
                            : "We couldn't process the evidence automatically. Please submit manually."}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={skipToManual}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                  >
                    Submit Manually
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'PROCESSING':
        return (
          <div className="py-24 text-center space-y-6">
            <div className="relative inline-block">
              <Loader2 className="animate-spin text-blue-500" size={80} />
              <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-black uppercase tracking-tighter">AI Processing</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto animate-pulse">Running OCR, transcribing audio, and verifying claims...</p>
            </div>
          </div>
        );

      case 'CONFIRM':
        if (!analysis) return null;
        return (
          <div className="space-y-8 py-8">
            <div className="text-center mb-12">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 ${
                isManual ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                analysis.consistencyFlag === 'verified' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                analysis.consistencyFlag === 'inconsistent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isManual ? <ShieldCheck size={14} /> :
                 analysis.consistencyFlag === 'verified' ? <CheckCircle size={14} /> : 
                 analysis.consistencyFlag === 'inconsistent' ? <AlertCircle size={14} /> : <Loader2 size={14} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isManual ? 'Manual Submission' :
                   analysis.consistencyFlag === 'verified' ? 'Verified by AI' : 
                   analysis.consistencyFlag === 'inconsistent' ? 'Evidence Conflict' : 'Pending Review'}
                </span>
              </div>
              <h2 className="text-4xl font-display font-black uppercase tracking-tighter">
                {isManual ? 'Final Check' : 'Report Audit'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bento-card p-6 space-y-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extracted Evidence</div>
                {analysis.extractedText && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 italic">
                    <span className="block text-[8px] font-black uppercase text-slate-600 mb-2">OCR Text</span>
                    "{analysis.extractedText}"
                  </div>
                )}
                {analysis.sttResult && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 italic">
                    <span className="block text-[8px] font-black uppercase text-slate-600 mb-2">Audio Transcript</span>
                    "{analysis.sttResult}"
                  </div>
                )}
                {!analysis.extractedText && !analysis.sttResult && (
                  <div className="text-slate-600 text-xs italic">No media evidence extracted. Relying on description.</div>
                )}
              </div>

              <div className="bento-card p-6 flex flex-col justify-center items-center text-center space-y-4 relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                  <ShieldCheck size={120} />
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Verdict</div>
                <div className="text-3xl font-display font-black text-white uppercase tracking-tighter border-b-4 border-blue-600 pb-2">
                  {analysis.type}
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-center p-3 bg-slate-950 rounded-2xl border border-slate-900">
                    <span className="text-[8px] font-black uppercase text-slate-600">Severity</span>
                    <span className={`text-sm font-black uppercase ${
                      analysis.severity === 'high' ? 'text-red-500' : 
                      analysis.severity === 'medium' ? 'text-orange-500' : 'text-green-500'
                    }`}>{analysis.severity}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-950 rounded-2xl border border-slate-900">
                    <span className="text-[8px] font-black uppercase text-slate-600">Threat</span>
                    <span className={`text-sm font-black uppercase ${
                      analysis.threatLevel === 'critical' ? 'text-red-600 animate-pulse' :
                      analysis.threatLevel === 'high' ? 'text-red-500' : 
                      analysis.threatLevel === 'medium' ? 'text-orange-500' : 'text-green-500'
                    }`}>{analysis.threatLevel}</span>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="text-left">
                    <span className="text-[8px] font-black uppercase text-slate-600 block mb-1">Sentiment</span>
                    <p className="text-xs text-white leading-tight">{analysis.sentiment}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-[8px] font-black uppercase text-slate-600 block mb-1">Intent</span>
                    <p className="text-xs text-slate-400 italic">"{analysis.intent}"</p>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-slate-800 pt-4 w-full justify-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-slate-600">Confidence</span>
                    <span className="text-xs font-black uppercase text-white">{analysis.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep('EVIDENCE')}
                className="flex-1 bento-card py-6 font-black uppercase tracking-widest text-xs text-slate-400 hover:text-white transition-colors"
              >
                Edit Evidence
              </button>
              <button
                onClick={finalSubmit}
                disabled={submitting}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all"
              >
                {submitting ? 'Protecting...' : 'Confirm Report'}
                <Send size={18} />
              </button>
            </div>
          </div>
        );
      case 'SUCCESS':
        return (
          <div className="py-24 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20 text-green-500">
                <CheckCircle size={48} className="animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter text-white">Report Filed</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Thank you for protecting the community. Your report has been securely saved to the SafeCircle database.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto bento-card overflow-hidden"
    >
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-800 flex">
        <div 
          className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]" 
          style={{ width: `${(STEP_MAP[step] + 1) / 6 * 100}%` }} 
        />
      </div>

      <div className="px-8 pb-8 pt-4">
        {renderStep()}
      </div>
    </motion.div>
  );
}

const STEP_MAP: Record<string, number> = {
  TYPE: 0,
  INPUT: 1,
  EVIDENCE: 2,
  PROCESSING: 3,
  CONFIRM: 4,
  SUCCESS: 5
};
