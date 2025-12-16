import React, { useState, useRef } from 'react';
import { Search as SearchIcon, Plus, Check, Loader2, Info, SlidersHorizontal, Box, Dna, Upload, FileText, X } from 'lucide-react';
import { Molecule, SearchFilters } from '../types';
import { searchSubstances, extractChemicalNamesFromText } from '../services/geminiService';

// Global declarations for external libraries loaded via index.html
declare const XLSX: any;
declare const pdfjsLib: any;

interface SearchProps {
  onAddToProject: (mol: Molecule) => void;
  projectMolecules: Molecule[];
  onView3D: (mol: Molecule) => void;
}

export const Search: React.FC<SearchProps> = ({ onAddToProject, projectMolecules, onView3D }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Molecule[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'extracting' | 'review' | 'fetching'>('upload');
  const [extractedNames, setExtractedNames] = useState<string[]>([]);
  const [selectedImportNames, setSelectedImportNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    minMeltingPoint: '',
    maxMeltingPoint: '',
    solubility: 'any',
    bondType: '',
    databaseSource: '',
    includeProteins: false
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const data = await searchSubstances(query, filters);
    setResults(data);
    setLoading(false);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const isSelected = (mol: Molecule) => projectMolecules.some(m => m.name === mol.name);

  // --- File Import Logic ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStep('extracting');
    let text = '';

    try {
      if (file.name.endsWith('.pdf')) {
        // PDF Parsing
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
           const page = await pdf.getPage(i);
           const content = await page.getTextContent();
           text += content.items.map((item: any) => item.str).join(' ') + ' ';
        }
      } else if (file.name.match(/\.(xlsx|xls|csv)$/)) {
        // Excel/CSV Parsing
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        workbook.SheetNames.forEach((sheetName: string) => {
           const worksheet = workbook.Sheets[sheetName];
           text += XLSX.utils.sheet_to_txt(worksheet) + ' ';
        });
      } else {
        // Plain Text
        text = await file.text();
      }

      if (text.trim().length === 0) throw new Error("Arquivo vazio ou não foi possível ler o texto.");

      // Send to AI for extraction
      const names = await extractChemicalNamesFromText(text);
      setExtractedNames(names);
      setSelectedImportNames(names); // Select all by default
      setImportStep('review');

    } catch (error) {
      console.error("Import error:", error);
      alert("Erro ao ler arquivo. Certifique-se de que é um PDF, Excel, CSV ou Texto válido.");
      setImportStep('upload');
    }
    
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleImportConfirm = async (addToProject: boolean) => {
    if (selectedImportNames.length === 0) return;

    setImportStep('fetching');
    
    // Batch Fetch
    const molecules = await searchSubstances("", filters, selectedImportNames);
    
    if (addToProject) {
      molecules.forEach(mol => onAddToProject(mol));
    }
    
    setResults(prev => [...molecules, ...prev]); // Add to top of results
    setShowImportModal(false);
    setImportStep('upload');
    setExtractedNames([]);
  };

  const toggleImportName = (name: string) => {
    if (selectedImportNames.includes(name)) {
      setSelectedImportNames(prev => prev.filter(n => n !== name));
    } else {
      setSelectedImportNames(prev => [...prev, name]);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-20 relative">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Explorador de Materiais & Biomoléculas</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">Busque em múltiplas bases de dados públicas (PubChem, MatWeb, PDB e outras) simultaneamente utilizando IA.</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-2xl border border-gray-200 dark:border-slate-700 p-2 mb-12 shadow-2xl transition-colors duration-300">
            <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <input
                type="text"
                className="block w-full pl-12 pr-32 py-4 bg-transparent border-none text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 outline-none transition-colors duration-300"
                placeholder="Ex: Grafeno, Hemoglobina, Polímeros..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                 <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-3 rounded-xl font-medium transition-colors flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700"
                    title="Importar lista de arquivo"
                >
                    <Upload className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 rounded-xl font-medium transition-colors flex items-center gap-2 ${showFilters ? 'bg-slate-200 dark:bg-slate-700 text-brand-600 dark:text-brand-400' : 'bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtros</span>
                </button>
                <button 
                    type="submit"
                    disabled={loading}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pesquisar'}
                </button>
            </div>
            </form>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="border-t border-gray-200 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">Tipo de Estrutura</label>
                        <div 
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${filters.includeProteins ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500/50' : 'bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-700'}`}
                            onClick={() => handleFilterChange('includeProteins', !filters.includeProteins)}
                        >
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.includeProteins ? 'bg-purple-500 border-purple-500' : 'border-slate-400 dark:border-slate-500'}`}>
                                {filters.includeProteins && <Check className="w-3 h-3 text-white" />}
                             </div>
                             <span className="text-sm text-slate-700 dark:text-slate-300">Incluir Proteínas/Enzimas</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">Solubilidade (Água)</label>
                        <select 
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            value={filters.solubility}
                            onChange={e => handleFilterChange('solubility', e.target.value)}
                        >
                            <option value="any">Qualquer</option>
                            <option value="soluble">Solúvel</option>
                            <option value="insoluble">Insolúvel</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">Tipo de Ligação</label>
                        <select 
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            value={filters.bondType}
                            onChange={e => handleFilterChange('bondType', e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="Covalent">Covalente</option>
                            <option value="Ionic">Iônica</option>
                            <option value="Metallic">Metálica</option>
                            <option value="Peptide">Peptídica (Proteínas)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">Fonte de Dados</label>
                        <select 
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            value={filters.databaseSource}
                            onChange={e => handleFilterChange('databaseSource', e.target.value)}
                        >
                            <option value="">Automático</option>
                            <option value="PubChem">PubChem</option>
                            <option value="PDB">PDB (Proteínas)</option>
                            <option value="MatWeb">MatWeb</option>
                            <option value="GenBank">GenBank</option>
                        </select>
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4">
          {results.map((mol) => {
             const selected = isSelected(mol);
             const isProtein = mol.structureType === 'protein';

             return (
              <div key={mol.id} className={`bg-white dark:bg-slate-800 border rounded-xl p-6 hover:border-opacity-100 transition-all group relative overflow-hidden ${isProtein ? 'border-purple-200 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-500' : 'border-gray-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${isProtein ? 'bg-purple-500' : 'bg-brand-500'}`} />
                
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{mol.name}</h3>
                        {isProtein ? (
                             <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1"><Dna className="w-3 h-3"/> PDB: {mol.pdbId}</span>
                        ) : (
                             <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-brand-400 text-xs px-2 py-0.5 rounded font-mono">{mol.formula}</span>
                        )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">{mol.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                        {mol.properties.slice(0, 3).map((prop, i) => (
                            <div key={i} className="flex flex-col bg-gray-50 dark:bg-slate-900/50 px-3 py-1.5 rounded border border-gray-200 dark:border-slate-700/50">
                                <span className="text-[10px] uppercase text-slate-500 font-bold">{prop.name}</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-mono">{prop.value} <span className="text-slate-500 text-xs">{prop.unit}</span></span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded border border-gray-200 dark:border-slate-700">
                           <Info className="w-3 h-3 text-slate-500" />
                           <span className="text-xs text-slate-500 dark:text-slate-400">{mol.source}</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                        onClick={() => !selected && onAddToProject(mol)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            selected 
                            ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/20 cursor-default'
                            : isProtein 
                                ? 'bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/25'
                                : 'bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-brand-500 hover:text-white hover:shadow-lg hover:shadow-brand-500/25'
                        }`}
                        title={selected ? "Já no projeto" : "Adicionar ao Projeto"}
                    >
                        {selected ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </button>
                    <button
                        onClick={() => onView3D(mol)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-400 ${isProtein ? 'hover:text-purple-500 hover:border-purple-500' : 'hover:text-brand-500 hover:border-brand-500'}`}
                        title="Visualizar em 3D"
                    >
                        <Box className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {results.length === 0 && !loading && query && !showImportModal && (
             <div className="text-center py-12 text-slate-500 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                 <p>Nenhum resultado encontrado para "{query}". Tente ajustar os filtros ou importar uma lista.</p>
             </div>
          )}
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-500" /> Importação de Substâncias
                    </h3>
                    <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900/50">
                    {importStep === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/30 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-brand-500 mb-4" />
                            <p className="text-lg text-slate-700 dark:text-slate-200 font-medium">Clique para selecionar arquivo</p>
                            <p className="text-sm text-slate-500 mt-2">Suporta .xlsx, .csv, .pdf, .txt</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".xlsx,.xls,.csv,.pdf,.txt" />
                        </div>
                    )}

                    {importStep === 'extracting' && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
                            <p className="text-slate-600 dark:text-slate-300">Lendo arquivo e identificando substâncias com IA...</p>
                        </div>
                    )}

                    {importStep === 'review' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-slate-600 dark:text-slate-400">Substâncias identificadas: {selectedImportNames.length} de {extractedNames.length}</p>
                                <div className="flex gap-2 text-xs">
                                    <button onClick={() => setSelectedImportNames(extractedNames)} className="text-brand-600 dark:text-brand-400 hover:text-brand-500">Marcar Todas</button>
                                    <button onClick={() => setSelectedImportNames([])} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">Desmarcar</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {extractedNames.map((name, idx) => (
                                    <div key={idx} onClick={() => toggleImportName(name)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 text-sm ${selectedImportNames.includes(name) ? 'bg-brand-100 dark:bg-brand-900/30 border-brand-500/50 text-slate-900 dark:text-slate-200' : 'bg-white dark:bg-slate-800 border-transparent text-slate-500'}`}>
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedImportNames.includes(name) ? 'bg-brand-500 border-brand-500' : 'border-slate-400 dark:border-slate-600'}`}>
                                            {selectedImportNames.includes(name) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="truncate">{name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {importStep === 'fetching' && (
                         <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
                            <p className="text-slate-600 dark:text-slate-300">Obtendo propriedades científicas nas bases de dados...</p>
                            <p className="text-xs text-slate-500 mt-2">Isso pode levar alguns segundos.</p>
                        </div>
                    )}
                </div>

                {importStep === 'review' && (
                    <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                        <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm">Cancelar</button>
                        <button 
                            onClick={() => handleImportConfirm(false)} 
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-sm"
                            disabled={selectedImportNames.length === 0}
                        >
                            Apenas Buscar
                        </button>
                        <button 
                            onClick={() => handleImportConfirm(true)} 
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-brand-900/50"
                            disabled={selectedImportNames.length === 0}
                        >
                            Buscar & Adicionar ao Projeto
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};