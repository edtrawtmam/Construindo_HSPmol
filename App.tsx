import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Search } from './components/Search';
import { Dashboard } from './components/Dashboard';
import { Comparison } from './components/Comparison';
import { Viewer3D } from './components/Viewer3D';
import { ViewState, Molecule, DashboardChart, ProjectData } from './types';
import { HansenCalculator } from './services/hansenSDK';
import { CheckCircle2, AlertCircle, X, FlaskConical, Cpu, GitBranch, Globe, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [projectMolecules, setProjectMolecules] = useState<Molecule[]>([]);
  const [projectCharts, setProjectCharts] = useState<DashboardChart[]>([]);
  const [selected3DMolecule, setSelected3DMolecule] = useState<Molecule | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHspDocs, setShowHspDocs] = useState(false);
  
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

  const addToProject = async (molecule: Molecule) => {
    if (!projectMolecules.find(m => m.id === molecule.id)) {
      // Processa a molécula para adicionar HSP automaticamente usando o melhor método
      const enrichedMolecule = await HansenCalculator.processMolecule(molecule);
      
      setProjectMolecules(prev => [...prev, enrichedMolecule]);
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
        onOpenHspDocs={() => setShowHspDocs(true)}
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

       {/* Info Modal */}
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

      {/* HSP Methodology Modal */}
      {showHspDocs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-brand-500"/> Metodologia HSP Engine
                    </h2>
                    <button onClick={() => setShowHspDocs(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-6 h-6"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                    <section>
                        <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">Visão Geral da Implementação</h3>
                        <p>
                            O <strong>HSP Engine</strong> é um módulo computacional implementado inteiramente no lado do cliente (navegador) que utiliza algoritmos de Contribuição de Grupos (GCM) e Equações de Estado (EoS) para prever os Parâmetros de Solubilidade de Hansen ($\delta_D, \delta_P, \delta_H$) de qualquer estrutura molecular válida.
                        </p>
                        <p>
                            O sistema utiliza uma abordagem de <strong>Seleção Inteligente (Smart Select)</strong>: ao inserir uma molécula, o motor executa todos os métodos disponíveis simultaneamente. Se houver dados experimentais de referência (validado contra o <em>Hansen Handbook</em>), o sistema compara os resultados e seleciona automaticamente o método preditivo com menor desvio ($Ra$). Se não houver referência, utiliza heurísticas baseadas na estrutura (ex: Polímeros vs Sais) para escolher o método mais robusto.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">Métodos de Cálculo</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <h4 className="font-bold text-lg mb-2">1. Van Krevelen & Hoftyzer (VKH)</h4>
                                <p className="text-sm mb-2">
                                    O método padrão para polímeros e moléculas orgânicas neutras. Baseia-se na soma das contribuições de grupos funcionais para as forças de dispersão ($F_d$), polares ($F_p$) e pontes de hidrogênio ($E_h$).
                                </p>
                                <div className="bg-white dark:bg-slate-900 p-2 rounded text-xs font-mono mb-2">
                                    δD = ΣFd / V<br/>
                                    δP = √(ΣFp²) / V<br/>
                                    δH = √(ΣEh / V)
                                </div>
                                <p className="text-xs text-slate-500 italic">Fonte: Properties of Polymers, 4th Ed, 2009.</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <h4 className="font-bold text-lg mb-2">2. Costas Panayiotou (EoS)</h4>
                                <p className="text-sm mb-2">
                                    Uma extensão baseada em Equação de Estado (EoS) que introduz a dependência da temperatura. Utiliza coeficientes de expansão térmica ($\alpha$) para ajustar os parâmetros base calculados via VKH.
                                </p>
                                <div className="bg-white dark:bg-slate-900 p-2 rounded text-xs font-mono mb-2">
                                    δ(T) ≈ δ(298K) * [1 - α(T - 298)]
                                </div>
                                <p className="text-xs text-slate-500 italic">Fonte: Panayiotou et al., Ind. Eng. Chem. Res. 2004.</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <h4 className="font-bold text-lg mb-2">3. Marcus (Sais e ILs)</h4>
                                <p className="text-sm mb-2">
                                    Método heurístico especializado para Sais Fundidos e Líquidos Iônicos (ILs). Estes materiais possuem forças de coesão extremamente altas devido a interações coulombianas, resultando em $\delta_P$ e $\delta_H$ elevados.
                                </p>
                                <p className="text-xs text-slate-500 italic">Fonte: Marcus, Y. "The Properties of Solvents", Wiley, 1998.</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <h4 className="font-bold text-lg mb-2">4. Stefanis-Panayiotou</h4>
                                <p className="text-sm mb-2">
                                    Método de contribuição de grupos de segunda ordem (UNIFAC-based). Considera a vizinhança dos grupos funcionais, oferecendo maior precisão para moléculas polifuncionais complexas.
                                </p>
                                <p className="text-xs text-slate-500 italic">Fonte: Stefanis, E. & Panayiotou, C. (2008).</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">Referências Bibliográficas</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            <li><strong>Hansen, C. M.</strong> (2007). <em>Hansen Solubility Parameters: A User's Handbook</em> (2nd ed.). CRC Press.</li>
                            <li><strong>Van Krevelen, D. W., & te Nijenhuis, K.</strong> (2009). <em>Properties of Polymers</em> (4th ed.). Elsevier.</li>
                            <li><strong>Stefanis, E., & Panayiotou, C.</strong> (2008). Prediction of Hansen Solubility Parameters with a New Group-Contribution Method. <em>International Journal of Thermophysics</em>, 29(2), 568-585.</li>
                            <li><strong>Abbott, S.</strong> (2018). <em>Solubility Science: Principles and Practice</em>. Steven Abbott TCNF.</li>
                            <li><strong>Marcus, Y.</strong> (1998). <em>The Properties of Solvents</em>. Wiley.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;