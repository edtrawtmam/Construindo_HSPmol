import React, { useState } from 'react';
import { Search as SearchIcon, Plus, Check, Loader2, Info, SlidersHorizontal, Box, Dna } from 'lucide-react';
import { Molecule, SearchFilters } from '../types';
import { searchSubstances } from '../services/geminiService';

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

  return (
    <div className="p-8 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Explorador de Materiais & Biomoléculas</h2>
          <p className="text-slate-400 max-w-lg mx-auto">Busque em múltiplas bases de dados públicas (PubChem, MatWeb, PDB) simultaneamente utilizando IA.</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-2 mb-12 shadow-2xl">
            <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon className="h-6 w-6 text-slate-500" />
            </div>
            <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 bg-transparent border-none text-lg text-white placeholder-slate-500 focus:ring-0 outline-none"
                placeholder="Ex: Grafeno, Hemoglobina, Polímeros, Insulina..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 rounded-xl font-medium transition-colors flex items-center gap-2 ${showFilters ? 'bg-slate-700 text-brand-400' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
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
                <div className="border-t border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Estrutura</label>
                        <div 
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${filters.includeProteins ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-800 border-slate-700'}`}
                            onClick={() => handleFilterChange('includeProteins', !filters.includeProteins)}
                        >
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.includeProteins ? 'bg-purple-500 border-purple-500' : 'border-slate-500'}`}>
                                {filters.includeProteins && <Check className="w-3 h-3 text-white" />}
                             </div>
                             <span className="text-sm text-slate-300">Incluir Proteínas/Enzimas</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Solubilidade (Água)</label>
                        <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-brand-500"
                            value={filters.solubility}
                            onChange={e => handleFilterChange('solubility', e.target.value)}
                        >
                            <option value="any">Qualquer</option>
                            <option value="soluble">Solúvel</option>
                            <option value="insoluble">Insolúvel</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Ligação</label>
                        <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-brand-500"
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
                        <label className="text-xs font-bold text-slate-500 uppercase">Fonte de Dados</label>
                        <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-brand-500"
                            value={filters.databaseSource}
                            onChange={e => handleFilterChange('databaseSource', e.target.value)}
                        >
                            <option value="">Automático</option>
                            <option value="PubChem">PubChem</option>
                            <option value="PDB">PDB (Proteínas)</option>
                            <option value="MatWeb">MatWeb</option>
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
              <div key={mol.id} className={`bg-slate-800 border rounded-xl p-6 hover:border-opacity-100 transition-all group relative overflow-hidden ${isProtein ? 'border-purple-900/50 hover:border-purple-500' : 'border-slate-700 hover:border-brand-500'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${isProtein ? 'bg-purple-500' : 'bg-brand-500'}`} />
                
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{mol.name}</h3>
                        {isProtein ? (
                             <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1"><Dna className="w-3 h-3"/> PDB: {mol.pdbId}</span>
                        ) : (
                             <span className="bg-slate-700 text-brand-400 text-xs px-2 py-0.5 rounded font-mono">{mol.formula}</span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{mol.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                        {mol.properties.slice(0, 3).map((prop, i) => (
                            <div key={i} className="flex flex-col bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700/50">
                                <span className="text-[10px] uppercase text-slate-500 font-bold">{prop.name}</span>
                                <span className="text-sm text-slate-200 font-mono">{prop.value} <span className="text-slate-500 text-xs">{prop.unit}</span></span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                           <Info className="w-3 h-3 text-slate-500" />
                           <span className="text-xs text-slate-400">{mol.source}</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                        onClick={() => !selected && onAddToProject(mol)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            selected 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                            : isProtein 
                                ? 'bg-slate-700 text-slate-300 hover:bg-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/25'
                                : 'bg-slate-700 text-slate-300 hover:bg-brand-500 hover:text-white hover:shadow-lg hover:shadow-brand-500/25'
                        }`}
                        title={selected ? "Já no projeto" : "Adicionar ao Projeto"}
                    >
                        {selected ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </button>
                    <button
                        onClick={() => onView3D(mol)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-slate-900 border border-slate-700 text-slate-400 ${isProtein ? 'hover:text-purple-400 hover:border-purple-500' : 'hover:text-brand-400 hover:border-brand-500'}`}
                        title="Visualizar em 3D"
                    >
                        <Box className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {results.length === 0 && !loading && query && (
             <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                 <p>Nenhum resultado encontrado para "{query}". Tente ajustar os filtros ou incluir proteínas.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};