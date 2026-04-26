import { Shield, Search, PlusCircle, History, Lock } from 'lucide-react';
import Auth from './Auth';
import { User } from 'firebase/auth';

interface NavbarProps {
  onUserChange: (user: User | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
}

export default function Navbar({ onUserChange, activeTab, setActiveTab, isAdmin }: NavbarProps) {
  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'report', label: 'Report', icon: PlusCircle },
    { id: 'history', label: 'Browse', icon: History },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Console', icon: Lock });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setActiveTab('search')}
        >
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Shield className="text-white" size={24} />
          </div>
          <span className="font-display text-xl font-bold tracking-tighter uppercase text-white">
            SafeCircle
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-800 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <Auth onUserChange={onUserChange} />
      </div>
    </nav>
  );
}
