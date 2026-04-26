import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import Navbar from './components/Navbar';
import SearchSection from './components/SearchSection';
import ReportForm from './components/ReportForm';
import ChatbotReport from './components/ChatbotReport';
import AdminDashboard from './components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { History, Shield, Github, Twitter, AlertCircle, Lock } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Report } from './types';
import { formatDistanceToNow } from 'date-fns';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [reportMode, setReportMode] = useState<'FORM' | 'CHAT'>('FORM');
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'USER' | 'ADMIN'>('USER');

  // Check admin status
  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        try {
          // Hardcoded admin based on your requirement
          const isHardcodedAdmin = user.email === 'kusumthakur2219@gmail.com';
          
          // Check database too
          let isDbAdmin = false;
          try {
            const adminDoc = await getDocFromServer(doc(db, 'admins', user.uid));
            isDbAdmin = adminDoc.exists();
          } catch (e) {
            // Probably permission denied if not admin, which is fine
          }
          
          setIsAdmin(isHardcodedAdmin || isDbAdmin);
        } catch (error) {
          setIsAdmin(false);
        }
      };
      checkAdmin();
    } else {
      setIsAdmin(false);
      setView('USER');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 selection:text-white">
      <Navbar 
        onUserChange={setUser} 
        activeTab={view === 'ADMIN' ? 'admin' : (activeTab === 'history' ? 'recent' : activeTab)} 
        setActiveTab={(id) => {
          if (id === 'admin') {
            setView('ADMIN');
          } else {
            setView('USER');
            setActiveTab(id === 'recent' ? 'history' : id);
          }
        }} 
        isAdmin={isAdmin}
      />
      
      <main className="max-w-7xl mx-auto px-4 pt-32 pb-32">
        {view === 'ADMIN' ? (
          <AdminDashboard />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="md:col-span-1 bento-card p-6 flex flex-col justify-between">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Network Status</div>
                <div className="text-3xl font-display font-black text-white uppercase tracking-tighter">Verified</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Secure Connection</span>
                </div>
              </div>
              <div className="md:col-span-1 bento-card p-6 flex flex-col justify-between bg-blue-600 shadow-[0_20px_50px_rgba(37,99,235,0.3)] border-blue-500">
                <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Total Flags</div>
                <div className="text-3xl font-display font-black text-white uppercase tracking-tighter">482,921</div>
                <div className="text-[10px] font-bold text-blue-100 uppercase mt-2">Community Driven</div>
              </div>
              <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Latest Threat Detected</div>
                <div className="flex items-center gap-4">
                  <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
                    <AlertCircle className="text-red-500" size={24} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white tracking-tight leading-tight">SMS Phishing Campaign</div>
                    <div className="text-xs text-slate-400 font-medium tracking-tight">Global Region · Just now</div>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'search' && (
                <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <SearchSection />
                </motion.div>
              )}

              {activeTab === 'report' && (
                <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <div className="max-w-3xl mx-auto mb-6 flex justify-center">
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800 flex">
                      <button 
                        onClick={() => setReportMode('FORM')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          reportMode === 'FORM' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Classic Form
                      </button>
                      <button 
                        onClick={() => setReportMode('CHAT')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          reportMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        SafeBot Guide
                      </button>
                    </div>
                  </div>
                  
                  {reportMode === 'FORM' ? (
                    <ReportForm 
                      user={user} 
                      onSuccess={() => setActiveTab('search')} 
                      onSwitchToChat={() => setReportMode('CHAT')}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto">
                      <ChatbotReport 
                        user={user} 
                        onSuccess={() => setActiveTab('search')} 
                        onCancel={() => setReportMode('FORM')} 
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <ReportViewer />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>


      <footer className="border-t border-slate-900 bg-slate-950 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
                <Shield size={20} className="text-white" />
              </div>
              <span className="font-display font-black uppercase text-xl text-white">SafeCircle</span>
            </div>
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] text-center">
              Shielding the Herd · Powered by Community & AI
            </div>
            <div className="flex justify-end gap-3">
              <a href="#" className="p-3 bento-card rounded-2xl text-slate-400 hover:text-white transition-colors">
                <Github size={18} />
              </a>
              <a href="#" className="p-3 bento-card rounded-2xl text-slate-400 hover:text-white transition-colors">
                <Twitter size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReportViewer() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <History className="text-slate-500" size={24} />
          <h2 className="text-3xl font-display font-black uppercase tracking-tighter">Recent Protections</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Network active</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="p-6 bento-card hover:bg-slate-900 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{report.targetType}</div>
                <div className="text-xl font-bold text-white group-hover:text-blue-500 transition-colors">
                  {report.targetValue}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="px-2 py-1 bg-slate-800 rounded text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  {report.aiAnalysis?.type || 'Report'}
                </div>
                {report.aiAnalysis && (
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                    report.aiAnalysis.severity === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                    report.aiAnalysis.severity === 'medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                    'bg-green-500/10 text-green-500 border-green-500/20'
                  }`}>
                    {report.consistencyFlag === 'verified' ? '✓ Verified' : 
                     report.consistencyFlag === 'inconsistent' ? '⚠ Conflict' : 
                     `AI ${report.aiAnalysis.severity}`}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-400 italic mb-4 line-clamp-2">
              "{report.description}"
            </p>
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">
              <span>PROT: {report.userId?.slice(0, 8)}</span>
              <span>{report.createdAt ? formatDistanceToNow(report.createdAt) : 'just now'} AGO</span>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="col-span-full py-32 text-center text-slate-500 bento-card border-dashed">
            Waiting for first community report...
          </div>
        )}
      </div>
    </motion.div>
  );
}
