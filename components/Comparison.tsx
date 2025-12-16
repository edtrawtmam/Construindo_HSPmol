import React, { useState, useMemo } from 'react';
import { Molecule, HansenParameters } from '../types';
import { HansenCalculator } from '../services/hansenSDK';
import { Trash2, Edit3, Save, X, Beaker, Box, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, Download, Settings2, Check, ExternalLink, Calculator, Target, Pencil, BookOpen, AlertCircle, BadgeCheck } from 'lucide-react';

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
  // View Mode State: Added 'validation'
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'validation'>('table');
  const [showSettings, setShowSettings] = useState(false);

  // Manual Edit State (HSP)
  const [hspEditId, setHspEditId] = useState<string | null>(null);
  const [hspEditValues, setHspEditValues] = useState<HansenParameters>({ deltaD: 0, deltaP: 0, deltaH: 0, method: 'Manual' });

  // HSP Calculation State
  const [targetHSPMoleculeId, setTargetHSPMoleculeId] = useState<string | null>(null);

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

  // 2. Helper to generate Source URL dynamically
  const getSourceUrl = (mol: Molecule) => {
    if (mol.structureType === 'protein' && mol.pdbId) {
      return `https://www.rcsb.org/structure/${mol.pdbId}`;
    }
    const query = mol.englishName || mol.name;
    return `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(query)}`;
  };

  // 3. Columns Definition (UPDATED: Lower Case Delta, Units, Indices)
  const columns = useMemo(() => {
    const staticCols = [
      { key: 'name', label: 'Substância', isDynamic: false },
      { key: 'formula', label: 'Fórmula', isDynamic: false },
      { key: 'molecularWeight', label: 'Massa Molar (g/mol)', isDynamic: false },
      // SourceUrl removed, merged into name
      { key: 'hsp_method', label: 'Método HSP', isDynamic: false },
      { key: 'hsp_d', label: 'δd (Disp) [MPa½]¹', isDynamic: false },
      { key: 'hsp_p', label: 'δp (Polar) [MPa½]²', isDynamic: false },
      { key: 'hsp_h', label: 'δh (H-Bond) [MPa½]²', isDynamic: false },
      { key: 'hsp_t', label: 'δt (Total) [MPa½]', isDynamic: false },
      { key: 'hsp_v', label: 'δv (Vetorial) [MPa½]', isDynamic: false },
      { key: 'hsp_vm', label: 'Vm (Vol. Molar) [cm³/mol]', isDynamic: false },
      { key: 'hsp_ra', label: 'Ra (Distância) [MPa½]', isDynamic: false },
    ];
    const dynamicCols = allPropertyNames.map(name => ({ key: name, label: name, isDynamic: true }));
    return [...staticCols, ...dynamicCols];
  }, [allPropertyNames]);

  // 4. Filter Data (Rows and Cols)
  const visibleColumns = useMemo(() => columns.filter(c => !hiddenProperties.includes(c.key)), [columns, hiddenProperties]);
  
  const visibleMolecules = useMemo(() => {
    let filtered = projectMolecules.filter(m => !hiddenMolecules.includes(m.id));

    if (targetHSPMoleculeId) {
        const targetMol = projectMolecules.find(m => m.id === targetHSPMoleculeId);
        if (targetMol && targetMol.hsp) {
             filtered = filtered.map(mol => mol); // Trigger re-render
        }
    }

    // Sort Logic
    if (sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (['name', 'formula', 'molecularWeight'].includes(sortConfig.key)) {
          valA = a[sortConfig.key as keyof Molecule];
          valB = b[sortConfig.key as keyof Molecule];
        } else if (sortConfig.key === 'hsp_method') {
           valA = a.hsp?.method || 'Auto';
           valB = b.hsp?.method || 'Auto';
        } else if (sortConfig.key.startsWith('hsp_')) {
            const suffix = sortConfig.key.split('_')[1];
            if (suffix === 'ra' && targetHSPMoleculeId) {
                const target = projectMolecules.find(m => m.id === targetHSPMoleculeId)?.hsp;
                if (target && a.hsp) valA = HansenCalculator.calculateDistance(a.hsp, target); else valA = 9999;
                if (target && b.hsp) valB = HansenCalculator.calculateDistance(b.hsp, target); else valB = 9999;
            } else {
                // Map suffixes to proper keys
                const map: any = { d: 'deltaD', p: 'deltaP', h: 'deltaH', t: 'deltaT', v: 'deltaV', vm: 'molarVolume' };
                valA = a.hsp ? a.hsp[map[suffix] as keyof HansenParameters] || 0 : -1;
                valB = b.hsp ? b.hsp[map[suffix] as keyof HansenParameters] || 0 : -1;
            }
        } else {
          const propA = a.properties.find(p => p.name === sortConfig.key);
          const propB = b.properties.find(p => p.name === sortConfig.key);
          valA = propA ? propA.value : '';
          valB = propB ? propB.value : '';
        }

        const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));
        const isNumA = !isNaN(numA) && String(valA).trim() !== '';
        const isNumB = !isNaN(numB) && String(valB).trim() !== '';

        if (isNumA && isNumB) return sortConfig.direction === 'asc' ? numA - numB : numB - numA;

        return sortConfig.direction === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return filtered;
  }, [projectMolecules, hiddenMolecules, sortConfig, targetHSPMoleculeId]);

  // --- Handlers ---

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const openHspEditor = (mol: Molecule) => {
      setHspEditId(mol.id);
      if (mol.hsp) setHspEditValues(mol.hsp);
      else setHspEditValues({ deltaD: 0, deltaP: 0, deltaH: 0, method: 'Manual' });
  };

  const saveHspManual = () => {
      if (hspEditId) {
          const mol = projectMolecules.find(m => m.id === hspEditId);
          if (mol) onUpdateMolecule({ ...mol, hsp: { ...hspEditValues, method: 'Manual' } });
      }
      setHspEditId(null);
  };

  const handleMethodChange = async (mol: Molecule, newMethod: string) => {
      // Explicitly check for Experimental (Ref) here or in SDK
      const hsp = await HansenCalculator.calculate(mol, newMethod as any);
      
      // IMPORTANT: Replace the entire HSP object to avoid accumulation/merging bugs
      if (hsp) {
          onUpdateMolecule({ ...mol, hsp: hsp });
      } else {
          // Fallback if calculation fails (rare)
           onUpdateMolecule({ ...mol, hsp: { ...(mol.hsp || {deltaD:0, deltaP:0, deltaH:0}), method: newMethod as any }});
      }
  };

  const setTargetMolecule = (id: string | null) => {
      setTargetHSPMoleculeId(id === targetHSPMoleculeId ? null : id);
  };

  const exportToCSV = () => {
    const headerRow = visibleColumns.map(c => `"${c.label}"`).join(',');
    const rows = visibleMolecules.map(mol => {
        return visibleColumns.map(col => {
            let val = '';
            if (col.key === 'hsp_method') val = mol.hsp?.method || 'Auto';
            else if (col.key.startsWith('hsp_')) {
                if (mol.hsp) {
                    const suffix = col.key.split('_')[1];
                    const map: any = { d: 'deltaD', p: 'deltaP', h: 'deltaH', t: 'deltaT', v: 'deltaV', vm: 'molarVolume' };
                    
                    if (suffix === 'ra' && targetHSPMoleculeId) {
                         const target = projectMolecules.find(m => m.id === targetHSPMoleculeId)?.hsp;
                         if (target) val = HansenCalculator.calculateDistance(mol.hsp, target).toString();
                    } else {
                         val = String(mol.hsp[map[suffix] as keyof HansenParameters] || '');
                    }
                } else val = '-';
            } else if (col.isDynamic) {
                val = mol.properties.find(p => p.name === col.key)?.value.toString() || '';
            } else {
                val = mol[col.key as keyof Molecule]?.toString() || '';
            }
            return `"${val.replace(/"/g, '""')}"`;
        }).join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "hspmol_data_table.csv");
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

  // --- RENDER VALIDATION VIEW ---
  const renderValidationView = () => (
    <div className="min-w-max border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5"/>
            <span>Esta tabela compara os valores calculados pelo aplicativo com os valores experimentais do <strong>Hansen Handbook (2007)</strong> para validação científica.</span>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
                <tr>
                    <th className="p-4 border-b border-r border-gray-200 dark:border-slate-800">Substância</th>
                    <th className="p-4 border-b border-r border-gray-200 dark:border-slate-800 text-center bg-blue-50 dark:bg-blue-900/10">Calculado (App)</th>
                    <th className="p-4 border-b border-r border-gray-200 dark:border-slate-800 text-center bg-green-50 dark:bg-green-900/10">Handbook (Ref)</th>
                    <th className="p-4 border-b border-gray-200 dark:border-slate-800 text-center">Desvio (Erro)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {visibleMolecules.map(mol => {
                    const refData = HansenCalculator.getReferenceData(mol.englishName || mol.name);
                    
                    if (!refData) return null; // Only show validated molecules

                    const calc = mol.hsp;
                    const errorRa = calc ? HansenCalculator.calculateDistance(calc, refData) : 99;
                    const deltaD = calc ? (calc.deltaD - refData.deltaD).toFixed(1) : '-';
                    const deltaP = calc ? (calc.deltaP - refData.deltaP).toFixed(1) : '-';
                    const deltaH = calc ? (calc.deltaH - refData.deltaH).toFixed(1) : '-';
                    
                    const statusColor = errorRa < 3.0 ? 'text-green-600 dark:text-green-400' : (errorRa < 8.0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400');
                    const statusBadge = errorRa < 3.0 ? 'Aprovado' : (errorRa < 8.0 ? 'Atenção' : 'Reprovado');

                    return (
                        <tr key={mol.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                            <td className="p-4 border-r border-gray-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200">
                                {mol.name}
                                <div className="text-xs font-normal text-slate-400">{mol.englishName}</div>
                            </td>
                            <td className="p-4 border-r border-gray-200 dark:border-slate-800 text-center bg-blue-50/30 dark:bg-blue-900/5">
                                {calc ? (
                                    <div className="font-mono text-xs space-y-1">
                                        <div>D: {calc.deltaD}</div>
                                        <div>P: {calc.deltaP}</div>
                                        <div>H: {calc.deltaH}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">({calc.method})</div>
                                    </div>
                                ) : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="p-4 border-r border-gray-200 dark:border-slate-800 text-center bg-green-50/30 dark:bg-green-900/5">
                                <div className="font-mono text-xs space-y-1 text-slate-600 dark:text-slate-300">
                                    <div>D: {refData.deltaD}</div>
                                    <div>P: {refData.deltaP}</div>
                                    <div>H: {refData.deltaH}</div>
                                </div>
                            </td>
                            <td className="p-4 border-r border-gray-200 dark:border-slate-800 text-center">
                                <div className={`font-bold ${statusColor} text-lg`}>Ra: {errorRa}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1 space-x-2">
                                    <span>ΔD: {deltaD}</span>
                                    <span>ΔP: {deltaP}</span>
                                    <span>ΔH: {deltaH}</span>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border mt-2 inline-block ${errorRa < 3.0 ? 'bg-green-100 border-green-200 text-green-700' : (errorRa < 8.0 ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-red-100 border-red-200 text-red-700')}`}>
                                    {statusBadge}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        {visibleMolecules.filter(mol => HansenCalculator.getReferenceData(mol.englishName || mol.name)).length === 0 && (
            <div className="p-8 text-center text-slate-500">
                Nenhuma substância padrão (ex: Acetona, Tolueno, Etanol) encontrada na lista para validação.
            </div>
        )}
    </div>
  );

  if (projectMolecules.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
          <Beaker className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">Projeto Vazio</h3>
          <p className="max-w-md text-center">Adicione substâncias através da Busca para construir tabelas comparativas.</p>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Top Bar */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex justify-between items-center shrink-0 z-20 transition-colors duration-300">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Comparativo & Solubilidade
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Organize, filtre e calcule Parâmetros de Hansen.</p>
        </div>
        <div className="flex items-center gap-3">
            
            {/* View Toggles */}
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700 h-10">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <TableIcon className="w-4 h-4" /> Tabela
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Comparativo
                </button>
                <button 
                    onClick={() => setViewMode('validation')}
                    className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium transition-all ${viewMode === 'validation' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <BadgeCheck className="w-4 h-4" /> Validação
                </button>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg border transition-colors h-10 w-10 flex items-center justify-center ${showSettings ? 'bg-brand-50 dark:bg-brand-900/50 border-brand-500 text-brand-600 dark:text-brand-200' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                title="Configurar Colunas e Linhas"
            >
                <Settings2 className="w-5 h-5" />
            </button>
            
            {viewMode === 'table' && (
                <button 
                    onClick={exportToCSV}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-500/50 transition-colors h-10 w-10 flex items-center justify-center"
                    title="Exportar Tabela (CSV)"
                >
                    <Download className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent p-6">
            
            {viewMode === 'validation' ? renderValidationView() : (
            viewMode === 'table' ? (
                // --- TABLE VIEW ---
                <div className="flex flex-col gap-4">
                <div className="min-w-max border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl bg-white dark:bg-slate-900 transition-colors duration-300">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
                            <tr>
                                <th className="p-4 w-12 text-center border-b border-r border-gray-200 dark:border-slate-800">#</th>
                                <th className="p-4 w-24 text-center border-b border-r border-gray-200 dark:border-slate-800">Ações</th>
                                <th className="p-4 w-12 text-center border-b border-r border-gray-200 dark:border-slate-800" title="Definir como Alvo para cálculo de Raio">Alvo</th>
                                {visibleColumns.map(col => (
                                    <th 
                                        key={col.key} 
                                        className="p-4 border-b border-r border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group select-none whitespace-nowrap"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            {col.label}
                                            <div className="flex flex-col text-slate-400 dark:text-slate-700 group-hover:text-brand-500">
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
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                            {visibleMolecules.map((mol, index) => {
                                // Calculate distance on fly if target is set
                                let raValue = '-';
                                let isTarget = targetHSPMoleculeId === mol.id;
                                if (targetHSPMoleculeId && !isTarget && mol.hsp) {
                                    const targetMol = projectMolecules.find(m => m.id === targetHSPMoleculeId);
                                    if (targetMol?.hsp) {
                                        raValue = HansenCalculator.calculateDistance(mol.hsp, targetMol.hsp).toString();
                                    }
                                }

                                return (
                                <tr key={mol.id} className={`transition-colors group ${isTarget ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                                    <td className="p-4 text-slate-600 dark:text-slate-600 text-center border-r border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">{index + 1}</td>
                                    <td className="p-2 border-r border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => onView3D(mol)} className="p-1.5 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors" title="Ver 3D">
                                                <Box className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onRemoveMolecule(mol.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors" title="Remover">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-2 border-r border-gray-200 dark:border-slate-800 text-center">
                                        <button 
                                            onClick={() => setTargetMolecule(mol.id)}
                                            className={`p-1.5 rounded-full transition-all ${isTarget ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50' : 'text-slate-400 hover:text-indigo-500'}`}
                                            title={isTarget ? "Remover alvo" : "Definir como centro da esfera (Alvo)"}
                                        >
                                            <Target className="w-4 h-4" />
                                        </button>
                                    </td>
                                    {visibleColumns.map(col => {
                                        // HSP METHOD COLUMN
                                        if (col.key === 'hsp_method') {
                                            return (
                                                <td key={`${mol.id}-method`} className="p-2 border-r border-gray-200 dark:border-slate-800/50">
                                                    <select 
                                                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs rounded p-1 w-full outline-none focus:border-brand-500"
                                                        value={mol.hsp?.method || 'Auto'}
                                                        onChange={(e) => handleMethodChange(mol, e.target.value)}
                                                    >
                                                        <option value="Experimental (Ref)">Ref. Handbook</option>
                                                        <option value="VanKrevelen">Van Krevelen</option>
                                                        <option value="Stefanis">Stefanis-Panayiotou</option>
                                                        <option value="Costas">Costas</option>
                                                        <option value="Marcus">Marcus</option>
                                                        <option value="Manual">Manual</option>
                                                    </select>
                                                </td>
                                            )
                                        }

                                        // HSP COLUMNS LOGIC
                                        if (col.key.startsWith('hsp_')) {
                                            if (col.key === 'hsp_ra') {
                                                return (
                                                    <td key={`${mol.id}-ra`} className="p-4 border-r border-gray-200 dark:border-slate-800/50">
                                                        {raValue !== '-' ? <span className={`font-mono font-bold ${parseFloat(raValue) < 8 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{raValue}</span> : '-'}
                                                    </td>
                                                );
                                            }
                                            const suffix = col.key.split('_')[1];
                                            const map: any = { d: 'deltaD', p: 'deltaP', h: 'deltaH', t: 'deltaT', v: 'deltaV', vm: 'molarVolume' };
                                            
                                            const val = mol.hsp ? mol.hsp[map[suffix] as keyof HansenParameters] : null;
                                            
                                            // Add manual edit button on first HSP column (hsp_d)
                                            if (col.key === 'hsp_d') {
                                                return (
                                                    <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-600 dark:text-slate-300 border-r border-gray-200 dark:border-slate-800/50 font-mono relative group/cell">
                                                        {val !== null && val !== undefined ? val : '-'}
                                                        <button 
                                                            onClick={() => openHspEditor(mol)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 p-1 bg-gray-200 dark:bg-slate-800 hover:bg-brand-500 rounded text-slate-500 hover:text-white transition-all"
                                                            title="Editar Manualmente"
                                                        >
                                                            <Pencil className="w-3 h-3"/>
                                                        </button>
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-600 dark:text-slate-300 border-r border-gray-200 dark:border-slate-800/50 font-mono">
                                                    {val !== null && val !== undefined ? val : '-'}
                                                </td>
                                            );
                                        }

                                        if (col.isDynamic) {
                                            const prop = mol.properties.find(p => p.name === col.key);
                                            return (
                                                <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-600 dark:text-slate-300 border-r border-gray-200 dark:border-slate-800/50">
                                                    {prop ? <span className="font-mono text-xs">{prop.value} <span className="text-slate-400 text-[10px]">{prop.unit}</span></span> : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                            );
                                        }
                                        // Static Fields
                                        if (col.key === 'name') {
                                            const url = getSourceUrl(mol);
                                            return (
                                                <td key={`${mol.id}-name`} className="p-4 font-bold border-r border-gray-200 dark:border-slate-800/50">
                                                    <a href={url} target="_blank" rel="noreferrer" className="text-slate-800 dark:text-brand-100 hover:text-brand-600 dark:hover:text-brand-400 hover:underline flex items-center gap-2 group/link">
                                                        {mol.name}
                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-50 transition-opacity" />
                                                    </a>
                                                </td>
                                            );
                                        }
                                        if (col.key === 'formula') {
                                            return <td key={`${mol.id}-formula`} className="p-4 text-brand-600 dark:text-brand-400 font-mono text-xs border-r border-gray-200 dark:border-slate-800/50">{mol.formula}</td>;
                                        }
                                        
                                        return <td key={`${mol.id}-${col.key}`} className="p-4 text-slate-600 dark:text-slate-300 border-r border-gray-200 dark:border-slate-800/50">{String(mol[col.key as keyof Molecule] || '-')}</td>;
                                    })}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* References Footer */}
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <h5 className="font-bold mb-2 uppercase text-[10px] tracking-wider">Referências & Unidades:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="list-none space-y-1">
                            <li><strong>¹ [MPa½]:</strong> Unidade do Parâmetro de Solubilidade (Raiz quadrada de Megapascal). Equivalente a (J/cm³)½.</li>
                            <li><strong>² Grupo de Contribuição:</strong> Valores calculados baseados na fragmentação molecular e soma das contribuições.</li>
                        </ul>
                        <ul className="list-none space-y-1">
                            <li><strong>[Ref]:</strong> Hansen, C. M. (2007). <em>Hansen Solubility Parameters: A User's Handbook</em>.</li>
                            <li><strong>[VKH]:</strong> Van Krevelen, D.W. (2009). <em>Properties of Polymers</em>.</li>
                            <li><strong>[SP]:</strong> Stefanis, E. & Panayiotou, C. (2008). <em>Int. J. Thermophys.</em></li>
                        </ul>
                    </div>
                </div>
                </div>
            ) : (
                // --- GRID VIEW ---
                <div className="min-w-max">
                     {/* Simplified Grid view for HSP just shows badges */}
                    <table className="w-full border-collapse text-sm">
                         {/* ... Existing Grid Logic (headers) ... */}
                        <thead>
                            <tr>
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium bg-gray-50 dark:bg-slate-900 sticky left-0 z-10 w-64 border-b border-r border-gray-200 dark:border-slate-800">Propriedade</th>
                                {visibleMolecules.map(mol => (
                                    <th key={mol.id} className="p-4 min-w-[240px] text-left bg-gray-100 dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700/50 relative group">
                                         <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-lg font-bold text-slate-900 dark:text-white">{mol.name}</div>
                                                <div className="font-mono text-xs text-brand-600 dark:text-brand-400">{mol.formula}</div>
                                            </div>
                                             {/* ... buttons ... */}
                                        </div>
                                         {/* ... image ... */}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* HSP Row */}
                             <tr>
                                <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold sticky left-0 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 border-b border-gray-200 dark:border-slate-800/50">Hansen (d/p/h)</td>
                                {visibleMolecules.map(mol => (
                                    <td key={mol.id} className="p-3 text-slate-800 dark:text-slate-200 border-b border-r border-gray-200 dark:border-slate-800/50">
                                        {mol.hsp ? (
                                            <div className="flex gap-2 items-center flex-wrap">
                                                <span className="bg-white dark:bg-slate-800 px-2 rounded border border-gray-200 dark:border-slate-700 text-xs" title="Dispersão">d:{mol.hsp.deltaD}</span>
                                                <span className="bg-white dark:bg-slate-800 px-2 rounded border border-gray-200 dark:border-slate-700 text-xs" title="Polaridade">p:{mol.hsp.deltaP}</span>
                                                <span className="bg-white dark:bg-slate-800 px-2 rounded border border-gray-200 dark:border-slate-700 text-xs" title="H-Bond">h:{mol.hsp.deltaH}</span>
                                                <span className="text-[10px] text-slate-400">({mol.hsp.method})</span>
                                                <button onClick={() => openHspEditor(mol)} className="text-slate-500 hover:text-brand-500 p-1"><Pencil className="w-3 h-3"/></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => openHspEditor(mol)} className="text-slate-500 hover:text-brand-500 text-xs flex items-center gap-1">
                                                <Pencil className="w-3 h-3"/> Definir Manualmente
                                            </button>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            {/* ... Rest of existing rows ... */}
                             <tr>
                                <td className="p-3 text-slate-500 dark:text-slate-400 sticky left-0 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 border-b border-gray-200 dark:border-slate-800/50">Peso Molecular</td>
                                {visibleMolecules.map(mol => <td key={mol.id} className="p-3 text-slate-800 dark:text-slate-200 border-b border-r border-gray-200 dark:border-slate-800/50 font-mono">{mol.molecularWeight} g/mol</td>)}
                            </tr>
                            
                             {visibleColumns.filter(c => c.isDynamic).map(col => (
                                <tr key={col.key} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-slate-500 dark:text-slate-400 sticky left-0 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 border-b border-gray-200 dark:border-slate-800/50">{col.label}</td>
                                    {visibleMolecules.map(mol => {
                                        const prop = mol.properties.find(p => p.name === col.key);
                                        return (
                                            <td key={mol.id} className="p-3 text-slate-800 dark:text-slate-200 border-b border-r border-gray-200 dark:border-slate-800/50 font-mono">
                                                {prop ? <span>{prop.value} <span className="text-slate-400 text-xs">{prop.unit}</span></span> : <span className="text-slate-400 italic">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
            <div className="w-72 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-4 overflow-y-auto animate-in slide-in-from-right-5 absolute right-0 top-0 bottom-0 z-30 shadow-2xl h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Settings2 className="w-4 h-4"/> Configuração</h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-4 h-4"/></button>
                </div>

                <div className="space-y-6">
                    {/* Column Visibility */}
                    <div>
                        <h4 className="text-xs font-bold text-brand-600 dark:text-brand-500 uppercase tracking-wider mb-2">Colunas Visíveis</h4>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                            {columns.map(col => (
                                <div 
                                    key={col.key} 
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-all ${!hiddenProperties.includes(col.key) ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-200' : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600'}`}
                                    onClick={() => toggleColumnVisibility(col.key)}
                                >
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${!hiddenProperties.includes(col.key) ? 'bg-brand-500 border-brand-500' : 'border-slate-400 dark:border-slate-600'}`}>
                                        {!hiddenProperties.includes(col.key) && <Check className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className="truncate">{col.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row Visibility */}
                    <div>
                        <h4 className="text-xs font-bold text-brand-600 dark:text-brand-500 uppercase tracking-wider mb-2">Materiais Visíveis</h4>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                            {projectMolecules.map(mol => (
                                <div 
                                    key={mol.id} 
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-all ${!hiddenMolecules.includes(mol.id) ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-slate-800 dark:text-slate-200' : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600'}`}
                                    onClick={() => toggleRowVisibility(mol.id)}
                                >
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${!hiddenMolecules.includes(mol.id) ? 'bg-brand-500 border-brand-500' : 'border-slate-400 dark:border-slate-600'}`}>
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

        {/* Manual HSP Edit Modal */}
        {hspEditId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl w-full max-w-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-brand-500"/> Editor HSP Manual
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">δD (Dispersão)</label>
                            <input 
                                type="number" step="0.1" 
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-slate-200 focus:border-brand-500 outline-none"
                                value={hspEditValues.deltaD}
                                onChange={e => setHspEditValues({...hspEditValues, deltaD: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">δP (Polaridade)</label>
                            <input 
                                type="number" step="0.1" 
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-slate-200 focus:border-brand-500 outline-none"
                                value={hspEditValues.deltaP}
                                onChange={e => setHspEditValues({...hspEditValues, deltaP: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">δH (Ponte de Hidrogênio)</label>
                            <input 
                                type="number" step="0.1" 
                                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-slate-200 focus:border-brand-500 outline-none"
                                value={hspEditValues.deltaH}
                                onChange={e => setHspEditValues({...hspEditValues, deltaH: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setHspEditId(null)} className="px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm">Cancelar</button>
                        <button onClick={saveHspManual} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded font-medium text-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Salvar
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};