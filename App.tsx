import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Search } from './components/Search';
import { Dashboard } from './components/Dashboard';
import { Comparison } from './components/Comparison';
import { Viewer3D } from './components/Viewer3D';
import { ViewState, Molecule, DashboardChart, ProjectData } from './types';
import { CheckCircle2, AlertCircle, X, FlaskConical, Cpu, GitBranch, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [projectMolecules, setProjectMolecules] = useState<Molecule[]>([]);
  const [projectCharts, setProjectCharts] = useState<DashboardChart[]>([]);
  const [selected3DMolecule, setSelected3DMolecule] = useState<Molecule | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Notification System
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Apply Theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  // --- Project Management Logic ---

  const handleQuickSave = () => {
    try {
      const projectData: ProjectData = {
        molecules: projectMolecules,
        charts: projectCharts,
        lastModified: Date.now()
      };
      localStorage.setItem('chemselect_autosave', JSON.stringify(projectData));
      showNotification("Projeto e análises salvos localmente!", 'success');
    } catch (error) {
      showNotification("Erro ao salvar projeto.", 'error');
    }
  };

  const handleQuickLoad = () => {
    try {
      const saved = localStorage.getItem('chemselect_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Handle Legacy Format (Array only) vs New Format (Object)
        if (Array.isArray(parsed)) {
          setProjectMolecules(parsed);
          setProjectCharts([]); // Reset charts for legacy data
          showNotification("Dados antigos restaurados (sem gráficos salvos).", 'success');
        } else if (parsed.molecules) {
          setProjectMolecules(parsed.molecules);
          setProjectCharts(parsed.charts || []);
          showNotification("Projeto completo restaurado com sucesso!", 'success');
        } else {
          throw new Error("Formato inválido");
        }
      } else {
        showNotification("Nenhum projeto salvo encontrado.", 'error');
      }
    } catch (error) {
      showNotification("Erro ao carregar projeto.", 'error');
    }
  };

  const handleExportProject = () => {
    try {
      const projectData: ProjectData = {
        molecules: projectMolecules,
        charts: projectCharts,
        lastModified: Date.now()
      };
      
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `hspmol_project_${new Date().toISOString().slice(0,10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showNotification("Arquivo de projeto exportado.", 'success');
    } catch (error) {
      showNotification("Erro ao exportar arquivo.", 'error');
    }
  };

  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Logic to detect format
        if (Array.isArray(json)) {
           // Legacy
           if (json.length > 0 && (!json[0].id || !json[0].name)) throw new Error("Estrutura inválida");
           setProjectMolecules(json);
           setProjectCharts([]);
        } else if (json.molecules) {
           // New Format
           setProjectMolecules(json.molecules);
           setProjectCharts(json.charts || []);
        } else {
          throw new Error("O arquivo não contém dados válidos.");
        }
        
        showNotification("Projeto importado com sucesso!", 'success');
        setView(ViewState.COMPARISON); 
      } catch (error) {
        console.error(error);
        showNotification("Arquivo inválido ou corrompido.", 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- Molecule Management ---

  const addToProject = (molecule: Molecule) => {
    if (!projectMolecules.find(m => m.id === molecule.id)) {
      setProjectMolecules([...projectMolecules, molecule]);
      showNotification(`${molecule.name} adicionado ao projeto.`, 'success');
    }
  };

  const removeFromProject = (id: string) => {
    setProjectMolecules(projectMolecules.filter(m => m.id !== id));
    // Also remove from charts logic could be here, but simple ID check in render is safer
  };

  const updateMolecule = (updated: Molecule) => {
    setProjectMolecules(projectMolecules.map(m => m.id === updated.id ? updated : m));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        projectCount={projectMolecules.length}
        onQuickSave={handleQuickSave}
        onQuickLoad={handleQuickLoad}
        onExport={handleExportProject}
        onImport={handleImportProject}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenInfo={() => setShowInfoModal(true)}
      />
      
      <main className="flex-1 h-screen overflow-hidden relative">
        {/* subtle background pattern overlay */}
        <div className="absolute inset-0 bg-gray-50/90 dark:bg-slate-900/95 pointer-events-none -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        {/* Toast Notification */}
        {notification && (
          <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${
            notification.type === 'success' 
              ? 'bg-white dark:bg-slate-900 border-green-500/50 text-green-600 dark:text-green-400' 
              : 'bg-white dark:bg-slate-900 border-red-500/50 text-red-600 dark:text-red-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
            <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{notification.message}</span>
          </div>
        )}

        {view === ViewState.SEARCH && (
          <Search 
            onAddToProject={addToProject} 
            projectMolecules={projectMolecules} 
            onView3D={setSelected3DMolecule}
          />
        )}

        {view === ViewState.COMPARISON && (
          <Comparison 
            projectMolecules={projectMolecules} 
            onUpdateMolecule={updateMolecule}
            onRemoveMolecule={removeFromProject}
            onView3D={setSelected3DMolecule}
          />
        )}

        {view === ViewState.DASHBOARD && (
          <Dashboard 
            projectMolecules={projectMolecules}
            charts={projectCharts}
            setCharts={setProjectCharts}
            isDarkMode={isDarkMode}
          />
        )}

        {/* 3D Viewer Modal Overlay */}
        {selected3DMolecule && (
          <Viewer3D 
            molecule={selected3DMolecule} 
            onClose={() => setSelected3DMolecule(null)} 
            isDarkMode={isDarkMode}
          />
        )}
      </main>

       {/* Info Modal - Rendered at Root to fix Stacking Context */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5"/>
                </button>
                
                <div className="p-6 text-center border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50">
                    <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
                        <FlaskConical className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">HSPmol</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Plataforma de Materiais & Solubilidade</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded text-slate-400"><Cpu className="w-4 h-4"/></div>
                            <div className="text-left">
                                <p className="text-xs text-slate-500 uppercase font-bold">Ambiente</p>
                                <p className="text-sm text-slate-800 dark:text-slate-200">Client-Side (React/Vite)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded text-slate-400"><GitBranch className="w-4 h-4"/></div>
                            <div className="text-left">
                                <p className="text-xs text-slate-500 uppercase font-bold">Versão</p>
                                <p className="text-sm text-slate-800 dark:text-slate-200">v1.3.0 (HSP Edition)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded text-slate-400"><Globe className="w-4 h-4"/></div>
                            <div className="text-left">
                                <p className="text-xs text-slate-500 uppercase font-bold">Deploy (Cloud Run)</p>
                                <p className="text-sm text-brand-600 dark:text-brand-400 italic">URL não configurada</p> 
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-xs text-slate-500 text-center pt-2">
                        ID do Projeto: hspmol-app-2025
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;