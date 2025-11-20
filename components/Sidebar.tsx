import React from 'react';
import { FlaskConical, LayoutDashboard, Scale, Search, Database } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  projectCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, projectCount }) => {
  const navClass = (view: ViewState) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200 ${
      currentView === view
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <div className="w-64 bg-scientific-card border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-brand-500 p-2 rounded-lg">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-slate-100 tracking-tight">ChemSelect</h1>
          <p className="text-xs text-brand-500 font-medium">Research & Compare</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <div onClick={() => setView(ViewState.SEARCH)} className={navClass(ViewState.SEARCH)}>
          <Search className="w-5 h-5" />
          <span className="font-medium">Busca & Fontes</span>
        </div>

        <div onClick={() => setView(ViewState.COMPARISON)} className={navClass(ViewState.COMPARISON)}>
          <div className="relative">
            <Scale className="w-5 h-5" />
            {projectCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {projectCount}
              </span>
            )}
          </div>
          <span className="font-medium">Comparativo</span>
        </div>

        <div onClick={() => setView(ViewState.DASHBOARD)} className={navClass(ViewState.DASHBOARD)}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard Analítico</span>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-xs uppercase font-bold tracking-wider">Bases Conectadas</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">PubChem</span>
            <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">ChEMBL</span>
            <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">MatWeb</span>
          </div>
        </div>
      </div>
    </div>
  );
};