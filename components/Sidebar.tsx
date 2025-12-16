import React, { useRef } from 'react';
import { FlaskConical, LayoutDashboard, Scale, Search, Database, Save, FolderOpen, Download, Upload, HardDrive, Info, Sun, Moon, Layers } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  projectCount: number;
  onQuickSave: () => void;
  onQuickLoad: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenInfo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  projectCount,
  onQuickSave,
  onQuickLoad,
  onExport,
  onImport,
  isDarkMode,
  toggleTheme,
  onOpenInfo
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navClass = (view: ViewState) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors duration-200 ${
      currentView === view
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
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
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 transition-colors duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
        <div 
          className="bg-brand-500 p-2 rounded-lg cursor-pointer hover:bg-brand-400 transition-colors"
          onClick={onOpenInfo}
        >
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            HSPmol
            <button 
              onClick={onOpenInfo} 
              className="text-slate-400 hover:text-brand-400 transition-colors"
              title="Sobre o Sistema"
            >
              <Info className="w-4 h-4"/>
            </button>
          </h1>
          <p className="text-xs text-brand-500 font-medium">Materials & Solubility</p>
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

      <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-4 flex-shrink-0">
        
        {/* Theme Toggle */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-200 dark:border-slate-800">
             <span className="text-xs font-bold text-slate-500 ml-2">Modo Visual</span>
             <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                title={isDarkMode ? "Mudar para Claro" : "Mudar para Escuro"}
             >
                 {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
             </button>
        </div>

        {/* Project Management Section */}
        <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs uppercase font-bold tracking-wider">Gestão de Projeto</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onQuickSave}
              className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-700 hover:text-brand-600 dark:hover:text-white text-slate-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-700 transition-all text-xs gap-1 shadow-sm"
              title="Salvar no navegador (LocalStorage)"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button 
              onClick={onQuickLoad}
              className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-700 hover:text-brand-600 dark:hover:text-white text-slate-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-700 transition-all text-xs gap-1 shadow-sm"
              title="Carregar do navegador"
            >
              <FolderOpen className="w-4 h-4" />
              Restaurar
            </button>
            <button 
              onClick={onExport}
              className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-700 hover:text-purple-600 dark:hover:text-white text-slate-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-700 transition-all text-xs gap-1 shadow-sm"
              title="Baixar arquivo .json"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-700 hover:text-purple-600 dark:hover:text-white text-slate-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-700 transition-all text-xs gap-1 shadow-sm"
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

        {/* Connected Bases */}
        <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-xs uppercase font-bold tracking-wider">Bases Conectadas</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">PubChem</span>
            <span className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">ChEMBL</span>
            <span className="text-[10px] px-2 py-1 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">MatWeb</span>
          </div>
        </div>

        {/* HSP Module Active Box */}
        <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-lg border border-brand-200 dark:border-brand-800">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-2">
            <Layers className="w-4 h-4" />
            <span className="text-xs uppercase font-bold tracking-wider">Módulos Ativos</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-1 bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-full border border-brand-200 dark:border-brand-700 shadow-sm font-semibold">HSP Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};