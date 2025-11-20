import React, { useEffect, useRef, useState } from 'react';
import { Molecule } from '../types';
import { X, Loader2, Box, Layers, Circle, Dna, AlertTriangle } from 'lucide-react';

// Declaration for the global 3Dmol object loaded via script tag
declare const $3Dmol: any;

interface Viewer3DProps {
  molecule: Molecule;
  onClose: () => void;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ molecule, onClose }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerInstance, setViewerInstance] = useState<any>(null);
  const [style, setStyle] = useState<'stick' | 'sphere' | 'surface' | 'cartoon'>('stick');
  const [is2D, setIs2D] = useState(false);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Initialize viewer
    const config = { backgroundColor: '#0f172a' };
    const viewer = $3Dmol.createViewer(viewerRef.current, config);
    setViewerInstance(viewer);
    setLoading(true);
    setError(null);
    setIs2D(false);

    const fetchStructure = async () => {
      try {
        // LOGIC FOR PROTEINS (PDB)
        if (molecule.structureType === 'protein' && molecule.pdbId) {
            setStyle('cartoon'); // Default style for proteins
            const url = `https://files.rcsb.org/download/${molecule.pdbId}.pdb`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Estrutura PDB não encontrada no RCSB.");
            
            const pdbData = await response.text();
            viewer.addModel(pdbData, "pdb");
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        } 
        // LOGIC FOR SMALL MOLECULES (PubChem SDF)
        else {
            setStyle('stick'); // Default for small molecules
            
            // Prefer English name for API calls, fallback to generic name
            const searchTerm = molecule.englishName || molecule.name;
            let sdfData = '';
            let found2D = false;

            // Try 1: Get CID first (More robust than direct name-to-SDF)
            let cid = null;
            try {
              const cidResponse = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchTerm)}/cids/JSON`);
              if (cidResponse.ok) {
                const cidJson = await cidResponse.json();
                cid = cidJson?.IdentifierList?.CID?.[0];
              }
            } catch (e) {
               console.warn("CID fetch failed, trying direct name...", e);
            }

            if (cid) {
               // Try 3D by CID
               const cid3dRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`);
               if (cid3dRes.ok) {
                 sdfData = await cid3dRes.text();
               } else {
                 // Fallback to 2D by CID if 3D is missing
                 const cid2dRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=2d`);
                 if (cid2dRes.ok) {
                   sdfData = await cid2dRes.text();
                   found2D = true;
                 }
               }
            } else {
               // Fallback: Direct Name Search (If CID failed)
               const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchTerm)}/SDF?record_type=3d`;
               const response = await fetch(url);
               if (response.ok) {
                 sdfData = await response.text();
               } else {
                 // Try 2D direct name
                 const response2d = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchTerm)}/SDF?record_type=2d`);
                 if (response2d.ok) {
                    sdfData = await response2d.text();
                    found2D = true;
                 }
               }
            }

            if (!sdfData) {
               throw new Error(`Estrutura não disponível no PubChem para "${searchTerm}".`);
            }
            
            setIs2D(found2D);
            viewer.addModel(sdfData, "sdf");
            viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } });
        }

        viewer.zoomTo();
        viewer.render();
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Não foi possível carregar a estrutura 3D.");
        setLoading(false);
      }
    };

    fetchStructure();

    return () => {
       if(viewerRef.current) viewerRef.current.innerHTML = '';
    };
  }, [molecule]);

  // Handle style changes
  useEffect(() => {
    if (!viewerInstance || loading || error) return;

    viewerInstance.removeAllLabels();
    
    const modelConfig = {}; 

    if (style === 'stick') {
        viewerInstance.setStyle(modelConfig, { stick: {radius: 0.15}, sphere: {scale: 0.3} });
    } else if (style === 'sphere') {
        viewerInstance.setStyle(modelConfig, { sphere: {} });
    } else if (style === 'surface') {
        // Surface allows us to see volume
        viewerInstance.setStyle(modelConfig, { stick: {radius: 0.1, colorscheme: 'whiteCarbon'} });
        viewerInstance.addSurface($3Dmol.SurfaceType.VDW, {opacity:0.6, color: 'white'});
    } else if (style === 'cartoon') {
        // Cartoon is best for proteins
        viewerInstance.setStyle(modelConfig, { cartoon: { color: 'spectrum' } });
    }

    viewerInstance.render();
  }, [style, viewerInstance, loading, error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-scientific-card border border-brand-700 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-brand-500" />
              Visualização Estrutural {is2D ? '(2D Planar)' : '3D'}
              {molecule.structureType === 'protein' && <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded border border-purple-500/50">Proteína</span>}
            </h3>
            <p className="text-sm text-brand-400 font-mono">
                {molecule.name} 
                {molecule.englishName && <span className="text-slate-500 ml-1">({molecule.englishName})</span>}
                {molecule.pdbId ? ` (PDB: ${molecule.pdbId})` : ` (${molecule.formula})`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Viewer Container */}
        <div className="flex-1 relative bg-slate-950">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-2" />
                    <span className="text-sm">Obtendo estrutura ({molecule.englishName || molecule.name})...</span>
                </div>
            )}
            
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 p-8 text-center">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 max-w-md">
                        <p className="text-red-400 mb-2 font-bold flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> Erro na Renderização</p>
                        <p className="text-sm mb-4">{error}</p>
                        <p className="text-xs text-slate-500">Dica: Tente buscar pelo nome em inglês ou verifique se a substância possui estrutura pública catalogada.</p>
                        <button onClick={onClose} className="mt-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm transition-colors">Fechar</button>
                    </div>
                </div>
            )}
            
            {is2D && !loading && !error && (
                 <div className="absolute top-4 left-4 z-10 bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs px-3 py-2 rounded backdrop-blur-md flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Estrutura 3D não disponível. Exibindo projeção 2D.</span>
                 </div>
            )}

            <div ref={viewerRef} className="w-full h-full cursor-move" />
            
            {/* Controls Overlay */}
            {!loading && !error && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-full flex gap-2 shadow-xl z-10">
                    <button 
                        onClick={() => setStyle('stick')}
                        className={`p-2 rounded-full transition-all ${style === 'stick' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Bastões (Sticks)"
                    >
                        <Layers className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setStyle('sphere')}
                        className={`p-2 rounded-full transition-all ${style === 'sphere' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Esferas (Spacefill)"
                    >
                        <Circle className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setStyle('surface')}
                        className={`p-2 rounded-full transition-all ${style === 'surface' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Superfície"
                    >
                        <Box className="w-4 h-4" />
                    </button>
                    {molecule.structureType === 'protein' && (
                         <button 
                            onClick={() => setStyle('cartoon')}
                            className={`p-2 rounded-full transition-all ${style === 'cartoon' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            title="Cartoon (Fitas)"
                        >
                            <Dna className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 px-6">
            <span>Use o mouse para rotacionar (Clique esquerdo), Zoom (Scroll), Pan (Clique direito).</span>
            <span>Fonte: {molecule.structureType === 'protein' ? 'RCSB PDB' : 'PubChem'}</span>
        </div>
      </div>
    </div>
  );
};