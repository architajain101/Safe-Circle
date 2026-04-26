import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Report, ReportStatus, RiskLevel } from '../types';
import { Search, CheckCircle, XCircle, AlertTriangle, Eye, Trash2, User, Phone, AtSign, Sliders } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (reportId: string, status: ReportStatus) => {
    console.log(`Updating document ${reportId} status to ${status}`);
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { status });
      
      // Force local update if successful
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status } : null);
      }
      
      // Update the main reports list locally to ensure instant feedback
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      
    } catch (error) {
      console.error("Update Status Error:", error);
      alert("Failed to update status. Check console for details.");
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const updateRisk = async (reportId: string, severity: RiskLevel) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { 'aiAnalysis.severity': severity });
      
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { 
          ...prev, 
          aiAnalysis: { ...prev.aiAnalysis!, severity } 
        } : null);
      }
      
      setReports(prev => prev.map(r => r.id === reportId ? { 
        ...r, 
        aiAnalysis: { ...r.aiAnalysis!, severity } 
      } : r));
      
    } catch (error) {
      console.error("Update Risk Error:", error);
      alert("Failed to update risk level.");
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${reportId}`);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = r.targetValue.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.userId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status?: ReportStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'under_review': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'action_taken': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'dismissed': return 'bg-slate-800 text-slate-500 border-slate-700';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-black uppercase tracking-tighter text-white">Security Console</h1>
          <p className="text-slate-400 text-sm">Managing {reports.length} security alerts across the network.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors w-64"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-sm text-white px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="action_taken">Action Taken</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Target</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Risk</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Source</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <AnimatePresence mode="popLayout">
                {filteredReports.map((report) => (
                  <motion.tr 
                    key={report.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-800/20 transition-colors cursor-pointer group"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-6 py-4 text-xs">
                      <div className="text-white font-bold">{formatDistanceToNow(report.createdAt)} ago</div>
                      <div className="text-[10px] text-slate-500 uppercase">{new Date(report.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          {report.targetType === 'phone' ? <Phone size={14} /> : <AtSign size={14} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-black">{report.targetValue}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{report.targetType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${
                        report.aiAnalysis?.severity === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        report.aiAnalysis?.severity === 'medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                        'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {report.aiAnalysis?.severity || 'low'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {report.isManual ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-tighter">Manual</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-tighter">AI Analysis</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusColor(report.status || 'pending')}`}>
                        {(report.status || 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><Eye size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReport(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">{selectedReport.targetType === 'phone' ? <Phone size={24} /> : <AtSign size={24} />}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Entity Report</div>
                      {selectedReport.isManual && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30 text-[8px] font-black uppercase tracking-widest">Manual Submission</span>
                      )}
                    </div>
                    <h2 className="text-4xl font-display font-black text-white uppercase tracking-tighter">{selectedReport.targetValue}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><XCircle size={24} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Narrative</h3>
                    <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 text-slate-300 italic">"{selectedReport.description}"</div>
                  </div>
                  {selectedReport.imageUrl && <img src={selectedReport.imageUrl} className="w-full rounded-3xl border border-slate-800" />}
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Reporter Info</h3>
                      <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <User size={14} className="text-slate-500" />
                        <span className="text-[10px] text-white font-mono truncate">{selectedReport.userId}</span>
                      </div>
                      
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-6">Management</h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => updateStatus(selectedReport.id, 'action_taken')}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                            selectedReport.status === 'action_taken' 
                            ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' 
                            : 'bg-slate-900 text-green-500 border border-green-500/20 hover:bg-green-500/10'
                          }`}
                        >
                          <CheckCircle size={14} /> Accept
                        </button>
                        <button 
                          onClick={() => updateStatus(selectedReport.id, 'dismissed')}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                            selectedReport.status === 'dismissed' 
                            ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                            : 'bg-slate-900 text-red-500 border border-red-500/20 hover:bg-red-500/10'
                          }`}
                        >
                          <XCircle size={14} /> Decline
                        </button>
                      </div>

                      <div className="space-y-2 pt-4">
                        <label className="text-[8px] text-slate-600 uppercase font-black">Status Override</label>
                        <select value={selectedReport.status || 'pending'} onChange={(e) => updateStatus(selectedReport.id, e.target.value as ReportStatus)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="action_taken">Action Taken</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] text-slate-600 uppercase font-black">Risk Level</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['low', 'medium', 'high'] as RiskLevel[]).map(l => (
                            <button key={l} onClick={() => updateRisk(selectedReport.id, l)} className={`py-1 rounded text-[10px] font-black uppercase ${selectedReport.aiAnalysis?.severity === l ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-600'}`}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
