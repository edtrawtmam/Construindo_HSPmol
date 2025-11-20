import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Search } from './components/Search';
import { Dashboard } from './components/Dashboard';
import { Comparison } from './components/Comparison';
import { Viewer3D } from './components/Viewer3D';
import { ViewState, Molecule } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [projectMolecules, setProjectMolecules] = useState<Molecule[]>([]);
  const [selected3DMolecule, setSelected3DMolecule] = useState<Molecule | null>(null);

  const addToProject = (molecule: Molecule) => {
    if (!projectMolecules.find(m => m.id === molecule.id)) {
      setProjectMolecules([...projectMolecules, molecule]);
    }
  };

  const removeFromProject = (id: string) => {
    setProjectMolecules(projectMolecules.filter(m => m.id !== id));
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
      />
      
      <main className="flex-1 h-screen overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        {/* subtle background pattern overlay */}
        <div className="absolute inset-0 bg-scientific-bg/95 pointer-events-none -z-10"></div>

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