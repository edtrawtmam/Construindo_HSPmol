import React, { useRef } from 'react';
import { FlaskConical, LayoutDashboard, Scale, Search, Database, Save, FolderOpen, Download, Upload, HardDrive } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  projectCount: number;
  onQuickSave: () => void;
  onQuickLoad: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  projectCount,
  onQuickSave,
  onQuickLoad,
  onExport,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navClass = (view: ViewState) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200 ${
      currentView === view
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset input
    if (event.target) event.target.value = '';
  };

  return (
    <div className="w-64 bg-scientific-card border-r border-slate-800 flex flex-col h-screen sticky top-0 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 flex-shrink-0">
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

      <div className="p-4 border-t border-slate-800 space-y-4 flex-shrink-0">
        
        {/* Project Management Section */}
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs uppercase font-bold tracking-wider">Gestão de Projeto</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onQuickSave}
              className="flex flex-col items-center justify-center p-2 bg-slate-800 hover:bg-brand-700 hover:text-white text-slate-400 rounded border border-slate-700 transition-all text-xs gap-1"
              title="Salvar no navegador (LocalStorage)"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button 
              onClick={onQuickLoad}
              className="flex flex-col items-center justify-center p-2 bg-slate-800 hover:bg-brand-700 hover:text-white text-slate-400 rounded border border-slate-700 transition-all text-xs gap-1"
              title="Carregar do navegador"
            >
              <FolderOpen className="w-4 h-4" />
              Restaurar
            </button>
            <button 
              onClick={onExport}
              className="flex flex-col items-center justify-center p-2 bg-slate-800 hover:bg-purple-700 hover:text-white text-slate-400 rounded border border-slate-700 transition-all text-xs gap-1"
              title="Baixar arquivo .json"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2 bg-slate-800 hover:bg-purple-700 hover:text-white text-slate-400 rounded border border-slate-700 transition-all text-xs gap-1"
              title="Carregar arquivo .json"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>

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