import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Report } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SearchSection() {
  const [id, setId] = useState('');
  const [results, setResults] = useState<Report[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return;

    setSearching(true);
    setSearched(true);
    try {
      console.log(`Searching for reports on: ${id.trim()}`);
      const q = query(collection(db, 'reports'), where('targetValue', '==', id.trim()));
      const snap = await getDocs(q);
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      console.log(`Found ${reports.length} matching reports.`);
      setResults(reports);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    } finally {
      setSearching(false);
    }
  };

  const getRiskScore = (reports: Report[]) => {
    const count = reports.length;
    
    // Check if any report has high severity AI analysis
    const hasHighRisk = reports.some(r => r.aiAnalysis?.severity === 'high' || r.aiAnalysis?.threatLevel === 'critical');
    const hasMedRisk = reports.some(r => r.aiAnalysis?.severity === 'medium' || r.aiAnalysis?.threatLevel === 'high');

    if (count === 0) return { label: 'Safe', percent: 0, color: 'text-green-400', bg: 'bg-green-400/10', icon: ShieldCheck, desc: 'No reports found. This entity appears safe.' };
    
    if (hasHighRisk) return { label: 'High', percent: 95, color: 'text-red-600', bg: 'bg-red-600/10', icon: ShieldX, desc: 'Critical threat detected by AI or community.' };
    
    if (count === 1 && !hasMedRisk) return { label: 'Low', percent: 20, color: 'text-green-500', bg: 'bg-green-500/10', icon: ShieldCheck, desc: 'Single report found, use caution.' };
    
    if (count <= 3 || hasMedRisk) return { label: 'Moderate', percent: 50, color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: ShieldAlert, desc: 'Multiple reports or elevated risk flags.' };
    
    if (count === 4) return { label: 'Moderate-High', percent: 75, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: ShieldAlert, desc: 'Significant reports, proceed with extreme caution.' };
    
    return { label: 'High', percent: 90, color: 'text-red-500', bg: 'bg-red-500/10', icon: ShieldX, desc: 'High-risk contact, avoid interaction.' };
  };

  const score = getRiskScore(results);

  return (
    <div className="max-w-4xl mx-auto pt-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-8xl font-display font-black mb-6 tracking-tighter uppercase leading-none">
          Verify User <br/> <span className="text-blue-500">Reputation</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
          Shielding your digital connections with community intelligence.
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-16">
        <div className="relative group max-w-3xl mx-auto">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Search phone number or @username..."
            className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl py-6 pl-14 pr-32 text-xl focus:outline-none focus:border-blue-500 transition-all shadow-2xl text-white placeholder-slate-600"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={24} />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-2xl transition-all disabled:opacity-50 shadow-lg"
          >
            {searching ? 'Checking...' : 'Analyze'}
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid md:grid-cols-3 gap-8"
          >
            <div className={`md:col-span-1 bento-card p-8 flex flex-col items-center justify-center text-center ${score.bg}`}>
              <div className="relative flex items-center justify-center mb-6">
                <div className={`w-32 h-32 rounded-full border-8 border-slate-800 flex flex-col items-center justify-center ${score.color}`}>
                  <span className="text-3xl font-black">{score.label}</span>
                  {score.percent > 0 && <span className="text-xs font-bold opacity-60">{score.percent}%</span>}
                </div>
                <div className={`absolute -bottom-2 ${score.bg.replace('/10', '')} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-700`}>
                  Risk Status
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{id}</h3>
              <p className="text-slate-400 text-sm">{score.desc}</p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="bento-card p-6 min-h-full">
                <h3 className="text-xl font-display font-bold flex items-center justify-between gap-2 text-slate-200 mb-6 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} className="text-slate-500" />
                    Evidence Log
                  </div>
                  <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full font-mono text-slate-500">{results.length} Reports</span>
                </h3>
                
                {results.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 italic font-medium">
                    No malicious flags found in the collective database.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((report) => (
                      <div key={report.id} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {report.aiAnalysis?.type || 'Report'}
                            </span>
                            {report.aiAnalysis && (
                              <div className="flex flex-wrap gap-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-slate-700 bg-slate-800 text-slate-400`}>
                                  {report.aiAnalysis.threatLevel || report.aiAnalysis.severity} Risk
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                  report.consistencyFlag === 'verified' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                  report.consistencyFlag === 'inconsistent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                  'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                  {report.consistencyFlag}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            {formatDistanceToNow(report.createdAt)} ago
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-3 group-hover:text-white transition-colors italic">
                          "{report.description}"
                        </p>
                        
                        {report.aiAnalysis?.sentiment && (
                          <div className="mb-3 px-3 py-2 bg-slate-950/50 rounded-xl border border-slate-800/50">
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <div className="text-[7px] font-black text-slate-600 uppercase mb-0.5">Sentiment</div>
                                <div className="text-[10px] text-slate-400 font-medium">{report.aiAnalysis.sentiment}</div>
                              </div>
                              <div className="flex-1 border-l border-slate-800 pl-4">
                                <div className="text-[7px] font-black text-slate-600 uppercase mb-0.5">Estimated Intent</div>
                                <div className="text-[10px] text-slate-500 italic">"{report.aiAnalysis.intent}"</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {report.extractedText && (
                          <div className="mb-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-500 font-mono italic">
                            <div className="text-[8px] font-black text-slate-700 uppercase mb-1">AI Extracted Evidence</div>
                            {report.extractedText}
                          </div>
                        )}
                        {report.imageUrl && (
                          <a href={report.imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 text-[10px] font-bold hover:underline uppercase tracking-tight">
                            View Image Evidence
                          </a>
                        )}
                        {report.audioUrl && (
                          <div className="mt-2">
                            <audio src={report.audioUrl} controls className="h-8 w-full max-w-[200px]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
