import React, { useState } from 'react';
import { Molecule, ChemicalProperty } from '../types';
import { Trash2, Edit3, Save, X, Beaker, Box } from 'lucide-react';

interface ComparisonProps {
  projectMolecules: Molecule[];
  onUpdateMolecule: (updated: Molecule) => void;
  onRemoveMolecule: (id: string) => void;
  onView3D: (mol: Molecule) => void;
}

export const Comparison: React.FC<ComparisonProps> = ({ projectMolecules, onUpdateMolecule, onRemoveMolecule, onView3D }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteBuffer, setNoteBuffer] = useState('');

  // Collect all unique property names
  const allPropertyNames = Array.from(
    new Set(
      projectMolecules.flatMap(m => m.properties.map(p => p.name))
    )
  ).sort();

  const startEditing = (mol: Molecule) => {
    setEditingId(mol.id);
    setNoteBuffer(mol.notes || '');
  };

  const saveNote = (mol: Molecule) => {
    onUpdateMolecule({ ...mol, notes: noteBuffer });
    setEditingId(null);
  };

  if (projectMolecules.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Beaker className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-slate-300 mb-2">Tabela Vazia</h3>
          <p className="max-w-md text-center">Adicione substâncias através da Busca para iniciar a comparação técnica lado a lado.</p>
        </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
      <div className="min-w-max">
        <h2 className="text-2xl font-bold text-white mb-6 sticky left-0">Comparativo de Propriedades</h2>
        
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-4 text-left text-slate-400 font-medium bg-slate-900 sticky left-0 z-20 w-64 border-b border-r border-slate-800">Propriedade</th>
              {projectMolecules.map(mol => (
                <th key={mol.id} className="p-4 min-w-[240px] text-left bg-slate-800 border-b border-r border-slate-700/50 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                        <div className="text-lg font-bold text-white">{mol.name}</div>
                        <div className="font-mono text-xs text-brand-400">{mol.formula}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onView3D(mol)}
                            className="p-1.5 text-slate-500 hover:text-brand-400 bg-slate-900 rounded border border-slate-700 hover:border-brand-500"
                            title="Ver 3D"
                        >
                            <Box className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => onRemoveMolecule(mol.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded border border-slate-700 hover:border-red-500"
                            title="Remover"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                  </div>
                  {/* Structure placeholder */}
                   <div className="mt-2 h-24 bg-white/5 rounded flex items-center justify-center overflow-hidden relative group/img">
                       <img src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${mol.name}/PNG`} alt={mol.name} className="h-full object-contain opacity-80 grayscale group-hover/img:grayscale-0 transition-all" onError={(e) => e.currentTarget.style.display = 'none'} />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer" onClick={() => onView3D(mol)}>
                           <span className="text-xs text-white flex items-center gap-1"><Box className="w-3 h-3"/> Inspecionar 3D</span>
                       </div>
                   </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Identification Block */}
            <tr className="bg-slate-800/30">
                <td className="p-4 font-bold text-brand-100 sticky left-0 bg-slate-800/95 backdrop-blur border-r border-slate-800 border-b border-slate-800 z-10">Identificação</td>
                {projectMolecules.map(mol => <td key={mol.id} className="bg-slate-800/30 border-b border-r border-slate-800"></td>)}
            </tr>
            <tr>
                <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 border-b border-slate-800/50">Peso Molecular</td>
                {projectMolecules.map(mol => (
                    <td key={mol.id} className="p-3 text-slate-200 border-b border-r border-slate-800/50 font-mono">{mol.molecularWeight} g/mol</td>
                ))}
            </tr>
            <tr>
                <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 border-b border-slate-800/50">SMILES</td>
                {projectMolecules.map(mol => (
                    <td key={mol.id} className="p-3 text-xs text-slate-500 border-b border-r border-slate-800/50 font-mono break-all max-w-[200px]">{mol.smiles || '-'}</td>
                ))}
            </tr>

            {/* Dynamic Properties */}
            <tr className="bg-slate-800/30">
                <td className="p-4 font-bold text-brand-100 sticky left-0 bg-slate-800/95 backdrop-blur border-r border-slate-800 border-b border-slate-800 z-10">Propriedades Físico-Químicas</td>
                {projectMolecules.map(mol => <td key={mol.id} className="bg-slate-800/30 border-b border-r border-slate-800"></td>)}
            </tr>

            {allPropertyNames.map(propName => (
              <tr key={propName} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 border-b border-slate-800/50 flex items-center gap-2">
                    {propName}
                </td>
                {projectMolecules.map(mol => {
                  const prop = mol.properties.find(p => p.name === propName);
                  return (
                    <td key={mol.id} className="p-3 text-slate-200 border-b border-r border-slate-800/50 font-mono">
                      {prop ? (
                        <span>{prop.value} <span className="text-slate-500 text-xs">{prop.unit}</span></span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">N/A</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Annotations Row */}
            <tr className="bg-slate-800/30">
                <td className="p-4 font-bold text-brand-100 sticky left-0 bg-slate-800/95 backdrop-blur border-r border-slate-800 border-t border-slate-800 z-10">Anotações do Projeto</td>
                {projectMolecules.map(mol => <td key={mol.id} className="bg-slate-800/30 border-t border-r border-slate-800"></td>)}
            </tr>
            <tr>
              <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 align-top">
                 Notas
              </td>
              {projectMolecules.map(mol => (
                <td key={mol.id} className="p-3 border-r border-slate-800/50 align-top min-h-[100px]">
                  {editingId === mol.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-brand-500 outline-none min-h-[80px]"
                        value={noteBuffer}
                        onChange={(e) => setNoteBuffer(e.target.value)}
                        placeholder="Adicione observações sobre aplicações, riscos, etc..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveNote(mol)} className="flex items-center gap-1 px-2 py-1 bg-brand-600 text-white text-xs rounded hover:bg-brand-500"><Save className="w-3 h-3" /> Salvar</button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"><X className="w-3 h-3" /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div 
                        className="group cursor-pointer min-h-[40px] relative"
                        onClick={() => startEditing(mol)}
                    >
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{mol.notes || <span className="text-slate-600 italic">Clique para adicionar notas...</span>}</p>
                        <Edit3 className="w-3 h-3 text-brand-500 absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};