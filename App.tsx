import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Search } from './components/Search';
import { Dashboard } from './components/Dashboard';
import { Comparison } from './components/Comparison';
import { Viewer3D } from './components/Viewer3D';
import { ViewState, Molecule, DashboardChart, ProjectData } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [projectMolecules, setProjectMolecules] = useState<Molecule[]>([]);
  const [projectCharts, setProjectCharts] = useState<DashboardChart[]>([]);
  const [selected3DMolecule, setSelected3DMolecule] = useState<Molecule | null>(null);
  
  // Notification System
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
      
      const exportFileDefaultName = `chemselect_project_${new Date().toISOString().slice(0,10)}.json`;

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
    <div className="flex h-screen bg-scientific-bg text-scientific-text font-sans">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        projectCount={projectMolecules.length}
        onQuickSave={handleQuickSave}
        onQuickLoad={handleQuickLoad}
        onExport={handleExportProject}
        onImport={handleImportProject}
      />
      
      <main className="flex-1 h-screen overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        {/* subtle background pattern overlay */}
        <div className="absolute inset-0 bg-scientific-bg/95 pointer-events-none -z-10"></div>

        {/* Toast Notification */}
        {notification && (
          <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${
            notification.type === 'success' 
              ? 'bg-slate-900 border-green-500/50 text-green-400' 
              : 'bg-slate-900 border-red-500/50 text-red-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
            <span className="font-medium text-sm text-slate-200">{notification.message}</span>
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
          />
        )}

        {/* 3D Viewer Modal Overlay */}
        {selected3DMolecule && (
          <Viewer3D 
            molecule={selected3DMolecule} 
            onClose={() => setSelected3DMolecule(null)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;