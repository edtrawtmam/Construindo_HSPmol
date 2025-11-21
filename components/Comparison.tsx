import React, { useState, useMemo } from 'react';
import { Molecule } from '../types';
import { Trash2, Edit3, Save, X, Beaker, Box, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, Download, Settings2, Check } from 'lucide-react';

interface ComparisonProps {
  projectMolecules: Molecule[];
  onUpdateMolecule: (updated: Molecule) => void;
  onRemoveMolecule: (id: string) => void;
  onView3D: (mol: Molecule) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const Comparison: React.FC<ComparisonProps> = ({ projectMolecules, onUpdateMolecule, onRemoveMolecule, onView3D }) => {
  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showSettings, setShowSettings] = useState(false);

  // Editing State (for Notes)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteBuffer, setNoteBuffer] = useState('');

  // Table Configuration State
  const [hiddenProperties, setHiddenProperties] = useState<string[]>([]);
  const [hiddenMolecules, setHiddenMolecules] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // --- Derived Data Helpers ---

  // 1. Get all unique property names across all molecules
  const allPropertyNames = useMemo(() => {
    const names = new Set<string>();
    projectMolecules.forEach(m => m.properties.forEach(p => names.add(p.name)));
    return Array.from(names).sort();
  }, [projectMolecules]);

  // 2. Columns Definition (Static + Dynamic)
  const columns = useMemo(() => {
    const staticCols = [
      { key: 'name', label: 'Nome', isDynamic: false },
      { key: 'formula', label: 'Fórmula', isDynamic: false },
      { key: 'molecularWeight', label: 'Peso Mol.', isDynamic: false },
    ];
    const dynamicCols = allPropertyNames.map(name => ({ key: name, label: name, isDynamic: true }));
    return [...staticCols, ...dynamicCols];
  }, [allPropertyNames]);

  // 3. Filter Data (Rows and Cols)
  const visibleColumns = useMemo(() => columns.filter(c => !hiddenProperties.includes(c.key)), [columns, hiddenProperties]);
  
  const visibleMolecules = useMemo(() => {
    let filtered = projectMolecules.filter(m => !hiddenMolecules.includes(m.id));

    // Sort Logic
    if (sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        // Extract value based on key type
        if (['name', 'formula', 'molecularWeight'].includes(sortConfig.key)) {
          valA = a[sortConfig.key as keyof Molecule];
          valB = b[sortConfig.key as keyof Molecule];
        } else {
          // Dynamic property search
          const propA = a.properties.find(p => p.name === sortConfig.key);
          const propB = b.properties.find(p => p.name === sortConfig.key);
          valA = propA ? propA.value : '';
          valB = propB ? propB.value : '';
        }

        // Numeric Extraction Helper
        const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));

        const isNumA = !isNaN(numA) && String(valA).trim() !== '';
        const isNumB = !isNaN(numB) && String(valB).trim() !== '';

        // Comparison
        if (isNumA && isNumB) {
           return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        return sortConfig.direction === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return filtered;
  }, [projectMolecules, hiddenMolecules, sortConfig]);

  // --- Handlers ---

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const startEditing = (mol: Molecule) => {
    setEditingId(mol.id);
    setNoteBuffer(mol.notes || '');
  };

  const saveNote = (mol: Molecule) => {
    onUpdateMolecule({ ...mol, notes: noteBuffer });
    setEditingId(null);
  };

  const exportToCSV = () => {
    // Header
    const headerRow = visibleColumns.map(c => `"${c.label}"`).join(',');
    
    // Rows
    const rows = visibleMolecules.map(mol => {
        return visibleColumns.map(col => {
            let val = '';
            if (col.isDynamic) {
                val = mol.properties.find(p => p.name === col.key)?.value.toString() || '';
            } else {
                val = mol[col.key as keyof Molecule]?.toString() || '';
            }
            return `"${val.replace(/"/g, '""')}"`; // Escape quotes
        }).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chemselect_data_table.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleColumnVisibility = (key: string) => {
      setHiddenProperties(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleRowVisibility = (id: string) => {
      setHiddenMolecules(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };


  if (projectMolecules.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Beaker className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-slate-300 mb-2">Projeto Vazio</h3>
          <p className="max-w-md text-center">Adicione substâncias através da Busca para construir tabelas comparativas.</p>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Top Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur flex justify-between items-center shrink-0 z-20">
        <div>
            <h2 className="text-2xl font-bold text-white">Construtor de Tabela & Comparativo</h2>
            <p className="text-slate-400 text-sm">Organize, filtre e compare propriedades moleculares.</p>
        </div>
        <div className="flex items-center gap-3">
            {/* View Toggles */}
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <TableIcon className="w-4 h-4" /> Tabela
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Comparativo
                </button>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2"></div>

            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-brand-900/50 border-brand-500 text-brand-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                title="Configurar Colunas e Linhas"
            >
                <Settings2 className="w-5 h-5" />
            </button>
            
            {viewMode === 'table' && (
                <button 
                    onClick={exportToCSV}
                    className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-green-900/30 hover:text-green-400 hover:border-green-500/50 transition-colors"
                    title="Exportar Tabela (CSV)"
                >
                    <Download className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 p-6">
            
            {viewMode === 'table' ? (
                // --- TABLE VIEW ---
                <div className="min-w-max border border-slate-800 rounded-lg overflow-hidden shadow-2xl bg-slate-900">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-xs">
                            <tr>
                                <th className="p-4 w-12 text-center border-b border-r border-slate-800">#</th>
                                <th className="p-4 w-24 text-center border-b border-r border-slate-800">Ações</th>
                                {visibleColumns.map(col => (
                                    <th 
                                        key={col.key} 
                                        className="p-4 border-b border-r border-slate-800 cursor-pointer hover:bg-slate-900 hover:text-brand-400 transition-colors group select-none"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            {col.label}
                                            <div className="flex flex-col text-slate-700 group-hover:text-brand-500">
                                                {sortConfig.key === col.key ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {visibleMolecules.map((mol, index) => (
                                <tr key={mol.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-4 text-slate-600 text-center border-r border-slate-800 bg-slate-900/50">{index + 1}</td>
                                    <td className="p-2 border-r border-slate-800 bg-slate-900/50">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => onView3D(mol)} className="p-1.5 hover:bg-brand-900/50 text-slate-500 hover:text-brand-400 rounded transition-colors" title="Ver 3D">
                                                <Box className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onRemoveMolecule(mol.id)} className="p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-colors" title="Remover">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    {visibleColumns.map(col => {
                                        if (col.isDynamic) {
                                            const prop = mol.properties.find(p => p.name === col.key);
                                            return (
                                                <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-300 border-r border-slate-800/50">
                                                    {prop ? <span className="font-mono text-xs">{prop.value} <span className="text-slate-500 text-[10px]">{prop.unit}</span></span> : <span className="text-slate-700 text-xs">-</span>}
                                                </td>
                                            );
                                        }
                                        // Static Fields
                                        if (col.key === 'name') {
                                            return <td key={`${mol.id}-name`} className="p-4 font-bold text-brand-100 border-r border-slate-800/50">{mol.name}</td>;
                                        }
                                        if (col.key === 'formula') {
                                            return <td key={`${mol.id}-formula`} className="p-4 text-brand-400 font-mono text-xs border-r border-slate-800/50">{mol.formula}</td>;
                                        }
                                        return <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-300 border-r border-slate-800/50">{String(mol[col.key as keyof Molecule] || '-')}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // --- GRID/TRANSPOSED VIEW (Legacy Comparison) ---
                <div className="min-w-max">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="p-4 text-left text-slate-400 font-medium bg-slate-900 sticky left-0 z-10 w-64 border-b border-r border-slate-800">Propriedade</th>
                                {visibleMolecules.map(mol => (
                                    <th key={mol.id} className="p-4 min-w-[240px] text-left bg-slate-800 border-b border-r border-slate-700/50 relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-lg font-bold text-white">{mol.name}</div>
                                                <div className="font-mono text-xs text-brand-400">{mol.formula}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => onView3D(mol)} className="p-1.5 text-slate-500 hover:text-brand-400 bg-slate-900 rounded border border-slate-700"><Box className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => onRemoveMolecule(mol.id)} className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded border border-slate-700"><Trash2 className="w-3.5 h-3.5" /></button>
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
                            {/* Render Transposed Rows based on Visible Columns */}
                             {/* ID Block */}
                             <tr>
                                <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 border-b border-slate-800/50">Peso Molecular</td>
                                {visibleMolecules.map(mol => <td key={mol.id} className="p-3 text-slate-200 border-b border-r border-slate-800/50 font-mono">{mol.molecularWeight} g/mol</td>)}
                            </tr>

                            {/* Dynamic Properties */}
                            {visibleColumns.filter(c => c.isDynamic).map(col => (
                                <tr key={col.key} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 border-b border-slate-800/50">{col.label}</td>
                                    {visibleMolecules.map(mol => {
                                        const prop = mol.properties.find(p => p.name === col.key);
                                        return (
                                            <td key={mol.id} className="p-3 text-slate-200 border-b border-r border-slate-800/50 font-mono">
                                                {prop ? <span>{prop.value} <span className="text-slate-500 text-xs">{prop.unit}</span></span> : <span className="text-slate-600 italic">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            
                             {/* Notes Section (Always visible at bottom of grid) */}
                            <tr className="bg-slate-800/30">
                                <td className="p-4 font-bold text-brand-100 sticky left-0 bg-slate-800/95 backdrop-blur border-r border-slate-800 border-t border-slate-800 z-10">Anotações</td>
                                {visibleMolecules.map(mol => <td key={mol.id} className="bg-slate-800/30 border-t border-r border-slate-800"></td>)}
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-400 sticky left-0 bg-slate-900 border-r border-slate-800 align-top">Notas de Projeto</td>
                                {visibleMolecules.map(mol => (
                                    <td key={mol.id} className="p-3 border-r border-slate-800/50 align-top min-h-[100px]">
                                        {editingId === mol.id ? (
                                            <div className="space-y-2">
                                            <textarea
                                                className="w-full bg-slate-900 text-slate-200 text-xs p-2 rounded border border-brand-500 outline-none min-h-[80px]"
                                                value={noteBuffer}
                                                onChange={(e) => setNoteBuffer(e.target.value)}
                                                placeholder="Adicione observações..."
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => saveNote(mol)} className="flex items-center gap-1 px-2 py-1 bg-brand-600 text-white text-xs rounded hover:bg-brand-500"><Save className="w-3 h-3" /> Salvar</button>
                                                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"><X className="w-3 h-3" /> Cancelar</button>
                                            </div>
                                            </div>
                                        ) : (
                                            <div className="group cursor-pointer min-h-[40px] relative" onClick={() => startEditing(mol)}>
                                                <p className="text-xs text-slate-300 whitespace-pre-wrap">{mol.notes || <span className="text-slate-600 italic">Clique para anotar...</span>}</p>
                                                <Edit3 className="w-3 h-3 text-brand-500 absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
            <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto animate-in slide-in-from-right-5 absolute right-0 top-0 bottom-0 z-30 shadow-2xl h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2"><Settings2 className="w-4 h-4"/> Configuração</h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
                </div>

                <div className="space-y-6">
                    {/* Column Visibility */}
                    <div>
                        <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-2">Colunas Visíveis</h4>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                            {columns.map(col => (
                                <div 
                                    key={col.key} 
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-all ${!hiddenProperties.includes(col.key) ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-900/50 border-transparent text-slate-600'}`}
                                    onClick={() => toggleColumnVisibility(col.key)}
                                >
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${!hiddenProperties.includes(col.key) ? 'bg-brand-500 border-brand-500' : 'border-slate-600'}`}>
                                        {!hiddenProperties.includes(col.key) && <Check className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className="truncate">{col.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row Visibility */}
                    <div>
                        <h4 className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-2">Materiais Visíveis</h4>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                            {projectMolecules.map(mol => (
                                <div 
                                    key={mol.id} 
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-all ${!hiddenMolecules.includes(mol.id) ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-slate-900/50 border-transparent text-slate-600'}`}
                                    onClick={() => toggleRowVisibility(mol.id)}
                                >
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${!hiddenMolecules.includes(mol.id) ? 'bg-brand-500 border-brand-500' : 'border-slate-600'}`}>
                                        {!hiddenMolecules.includes(mol.id) && <Check className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className="truncate">{mol.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};