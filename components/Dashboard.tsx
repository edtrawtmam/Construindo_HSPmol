import React, { useState, useMemo } from 'react';
import { Molecule, DashboardChart } from '../types';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Settings2, Plus, Trash2, Download, Sliders, Check, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  projectMolecules: Molecule[];
  charts: DashboardChart[];
  setCharts: (charts: DashboardChart[]) => void;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ projectMolecules, charts, setCharts, isDarkMode }) => {
  
  // Initial helper to get available numerical properties + HSP
  const availableProperties = useMemo(() => {
    const props = new Set<string>();
    props.add('Molecular Weight'); 
    props.add('HSP δD');
    props.add('HSP δP');
    props.add('HSP δH');

    projectMolecules.forEach(mol => {
      mol.properties.forEach(p => {
        const val = parseFloat(p.value.toString());
        if (!isNaN(val)) props.add(p.name);
      });
    });
    return Array.from(props).sort();
  }, [projectMolecules]);

  const createNewChart = () => {
    const newChart: DashboardChart = {
      id: `chart-${Date.now()}`,
      title: `Análise ${charts.length + 1}`,
      type: 'scatter',
      xAxisKey: 'HSP δP', // Default interesting comparison
      yAxisKey: 'HSP δH',
      // By default, select all molecules
      selectedMoleculeIds: projectMolecules.map(m => m.id)
    };
    setCharts([...charts, newChart]);
  };

  const removeChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const updateChart = (id: string, updates: Partial<DashboardChart>) => {
    setCharts(charts.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const exportToImage = async (chartId: string, title: string) => {
    const element = document.getElementById(chartId);
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', // Match card bg dynamic
          scale: 2, // High res
          logging: false
        });
        const link = document.createElement('a');
        link.download = `chemselect_chart_${title.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Export failed", err);
        alert("Falha ao exportar imagem.");
      }
    }
  };

  if (projectMolecules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Settings2 className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl mb-2">Projeto Vazio</h3>
        <p>Selecione moléculas na Busca para começar suas análises.</p>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Analítico</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Crie múltiplos gráficos comparativos e exporte figuras científicas.</p>
        </div>
        <button 
          onClick={createNewChart}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-brand-900/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Gráfico
        </button>
      </div>

      {charts.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-4">
           <p>Nenhum gráfico criado.</p>
           <button onClick={createNewChart} className="text-brand-600 dark:text-brand-400 hover:underline">Criar primeiro gráfico</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
          {charts.map(chart => (
            <ChartCard 
              key={chart.id} 
              chart={chart} 
              allMolecules={projectMolecules}
              availableProperties={availableProperties}
              onUpdate={(updates) => updateChart(chart.id, updates)}
              onRemove={() => removeChart(chart.id)}
              onExport={() => exportToImage(chart.id, chart.title)}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Sub-component for Individual Chart Card ---

interface ChartCardProps {
  chart: DashboardChart;
  allMolecules: Molecule[];
  availableProperties: string[];
  onUpdate: (updates: Partial<DashboardChart>) => void;
  onRemove: () => void;
  onExport: () => void;
  isDarkMode: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ chart, allMolecules, availableProperties, onUpdate, onRemove, onExport, isDarkMode }) => {
  const [showSettings, setShowSettings] = useState(false);

  // Helper to extract value
  const getValue = (mol: Molecule, key: string): number => {
      if (key === 'Molecular Weight') return mol.molecularWeight;
      if (key === 'HSP δD') return mol.hsp?.deltaD || 0;
      if (key === 'HSP δP') return mol.hsp?.deltaP || 0;
      if (key === 'HSP δH') return mol.hsp?.deltaH || 0;

      const prop = mol.properties.find(p => p.name === key);
      return prop ? parseFloat(prop.value.toString()) : 0;
  };

  // Filter data based on selection
  const chartData = useMemo(() => {
    return allMolecules
      .filter(mol => chart.selectedMoleculeIds.includes(mol.id))
      .map(mol => {
        return {
          name: mol.name,
          x: getValue(mol, chart.xAxisKey),
          y: getValue(mol, chart.yAxisKey),
          formula: mol.formula,
          source: mol.source
        };
      });
  }, [allMolecules, chart]);

  const toggleMolecule = (id: string) => {
    if (chart.selectedMoleculeIds.includes(id)) {
      onUpdate({ selectedMoleculeIds: chart.selectedMoleculeIds.filter(mid => mid !== id) });
    } else {
      onUpdate({ selectedMoleculeIds: [...chart.selectedMoleculeIds, id] });
    }
  };

  // Theme Constants
  const themeColors = {
      bg: isDarkMode ? '#1e293b' : '#ffffff',
      border: isDarkMode ? '#334155' : '#e2e8f0', // slate-700 : gray-200
      text: isDarkMode ? '#e2e8f0' : '#1e293b', // slate-200 : slate-800
      textMuted: isDarkMode ? '#94a3b8' : '#64748b', // slate-400 : slate-500
      grid: isDarkMode ? '#334155' : '#cbd5e1', // slate-700 : slate-300
      axis: isDarkMode ? '#475569' : '#94a3b8', // slate-600 : slate-400
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 border rounded shadow-xl backdrop-blur text-xs z-50 ${isDarkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'}`}>
          <p className={`font-bold mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{data.name}</p>
          <p className="text-[10px] text-brand-500 mb-2 font-mono">{data.formula}</p>
          <div className={`space-y-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
             <p>{chart.xAxisKey}: <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.x}</span></p>
             {chart.type === 'scatter' && (
               <p>{chart.yAxisKey}: <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{data.y}</span></p>
             )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id={chart.id} className={`rounded-xl border shadow-xl flex flex-col h-[500px] relative group overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-scientific-card border-slate-800' : 'bg-white border-gray-200'}`}>
      {/* Header Controls */}
      <div className={`p-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
        <input 
          value={chart.title} 
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={`bg-transparent font-bold text-sm border border-transparent focus:border-brand-500 rounded px-2 py-1 outline-none transition-all w-1/2 ${isDarkMode ? 'text-slate-200 hover:border-slate-700' : 'text-slate-800 hover:border-gray-300'}`}
        />
        <div className="flex gap-2">
           <button onClick={onExport} className={`p-1.5 rounded border transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700' : 'text-slate-500 hover:text-slate-900 bg-white hover:bg-gray-100 border-gray-300'}`} title="Exportar Imagem">
             <ImageIcon className="w-4 h-4" />
           </button>
           <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded border ${showSettings ? 'bg-brand-600 text-white' : (isDarkMode ? 'text-slate-400 bg-slate-800 hover:bg-slate-700 border-slate-700' : 'text-slate-500 bg-white hover:bg-gray-100 border-gray-300')}`} title="Configurações">
             <Sliders className="w-4 h-4" />
           </button>
           <button onClick={onRemove} className={`p-1.5 rounded border transition-colors ${isDarkMode ? 'text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 border-slate-700' : 'text-slate-500 hover:text-red-600 bg-white hover:bg-gray-100 border-gray-300'}`} title="Excluir Gráfico">
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 p-4 min-w-0 relative z-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chart.type === 'scatter' ? (
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={chart.xAxisKey} 
                    stroke={themeColors.textMuted}
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{stroke: themeColors.axis}} 
                    label={{ value: chart.xAxisKey, position: 'bottom', fill: themeColors.textMuted, offset: 0, fontSize: 11 }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={chart.yAxisKey} 
                    stroke={themeColors.textMuted}
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{stroke: themeColors.axis}} 
                    label={{ value: chart.yAxisKey, angle: -90, position: 'left', fill: themeColors.textMuted, fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: themeColors.axis }} />
                  <Scatter name="Molecules" data={chartData} fill="#38bdf8">
                      {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} stroke={isDarkMode ? 'none' : '#fff'} />
                      ))}
                  </Scatter>
                </ScatterChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" stroke={themeColors.textMuted} fontSize={10} tickLine={false} angle={-15} textAnchor="end" interval={0} height={60} />
                    <YAxis stroke={themeColors.textMuted} fontSize={10} tickLine={false} label={{ value: chart.xAxisKey, angle: -90, position: 'left', fill: themeColors.textMuted, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}} />
                    <Bar dataKey="x" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} />
                        ))}
                    </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className={`h-full flex items-center justify-center text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
               Nenhuma substância selecionada.
            </div>
          )}
          
          {/* Legend Overlay (Baked into image export) */}
          <div className={`absolute bottom-2 right-2 text-[10px] p-1 rounded pointer-events-none ${isDarkMode ? 'text-slate-500 bg-slate-900/50' : 'text-slate-400 bg-white/50'}`}>
              ChemSelect Analysis
          </div>
        </div>

        {/* Settings Sidebar (Collapsible) */}
        {showSettings && (
            <div className={`w-64 border-l p-4 overflow-y-auto flex flex-col gap-4 animate-in slide-in-from-right-5 duration-200 absolute right-0 top-0 bottom-0 z-20 h-full shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold uppercase text-brand-500 tracking-wider">Configuração</h4>
                    <button onClick={() => setShowSettings(false)} className={isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-800'}><Sliders className="w-3 h-3"/></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className={`text-[10px] block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tipo de Gráfico</label>
                        <select 
                            value={chart.type} 
                            onChange={(e) => onUpdate({ type: e.target.value as any })}
                            className={`w-full text-xs p-2 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-gray-300'}`}
                        >
                            <option value="scatter">Dispersão (XY)</option>
                            <option value="bar">Barras (Comparação)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className={`text-[10px] block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Eixo X (Valor Principal)</label>
                        <select 
                            value={chart.xAxisKey} 
                            onChange={(e) => onUpdate({ xAxisKey: e.target.value })}
                            className={`w-full text-xs p-2 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-gray-300'}`}
                        >
                             {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {chart.type === 'scatter' && (
                        <div>
                            <label className={`text-[10px] block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Eixo Y</label>
                            <select 
                                value={chart.yAxisKey} 
                                onChange={(e) => onUpdate({ yAxisKey: e.target.value })}
                                className={`w-full text-xs p-2 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-gray-300'}`}
                            >
                                {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className={`border-t my-2 pt-4 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                    <h4 className="text-xs font-bold uppercase text-brand-500 tracking-wider mb-3">Substâncias ({chart.selectedMoleculeIds.length}/{allMolecules.length})</h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {allMolecules.map(mol => (
                            <div 
                                key={mol.id} 
                                onClick={() => toggleMolecule(mol.id)}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-colors ${
                                    chart.selectedMoleculeIds.includes(mol.id) 
                                    ? (isDarkMode ? 'bg-brand-900/20 border-brand-500/30 text-slate-200' : 'bg-brand-50 border-brand-200 text-brand-800')
                                    : (isDarkMode ? 'bg-slate-800/50 border-transparent text-slate-500 hover:bg-slate-800' : 'bg-gray-50 border-transparent text-slate-500 hover:bg-gray-100')
                                }`}
                            >
                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${chart.selectedMoleculeIds.includes(mol.id) ? 'bg-brand-500 border-brand-500' : (isDarkMode ? 'border-slate-600' : 'border-slate-300')}`}>
                                    {chart.selectedMoleculeIds.includes(mol.id) && <Check className="w-2 h-2 text-white" />}
                                </div>
                                <span className="truncate">{mol.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};