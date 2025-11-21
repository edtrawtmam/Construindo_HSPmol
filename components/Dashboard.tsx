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
}

export const Dashboard: React.FC<DashboardProps> = ({ projectMolecules, charts, setCharts }) => {
  
  // Initial helper to get available numerical properties
  const availableProperties = useMemo(() => {
    const props = new Set<string>();
    props.add('Molecular Weight'); 
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
      xAxisKey: 'Molecular Weight',
      yAxisKey: 'Molecular Weight',
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
          backgroundColor: '#1e293b', // Match card bg
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
    <div className="p-8 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard Analítico</h2>
          <p className="text-slate-400 text-sm">Crie múltiplos gráficos comparativos e exporte figuras científicas.</p>
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
        <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-4">
           <p>Nenhum gráfico criado.</p>
           <button onClick={createNewChart} className="text-brand-400 hover:text-brand-300 underline">Criar primeiro gráfico</button>
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
}

const ChartCard: React.FC<ChartCardProps> = ({ chart, allMolecules, availableProperties, onUpdate, onRemove, onExport }) => {
  const [showSettings, setShowSettings] = useState(false);

  // Filter data based on selection
  const chartData = useMemo(() => {
    return allMolecules
      .filter(mol => chart.selectedMoleculeIds.includes(mol.id))
      .map(mol => {
        const xProp = mol.properties.find(p => p.name === chart.xAxisKey);
        const yProp = mol.properties.find(p => p.name === chart.yAxisKey);
        
        let xVal = xProp ? parseFloat(xProp.value.toString()) : 0;
        let yVal = yProp ? parseFloat(yProp.value.toString()) : 0;

        if (chart.xAxisKey === 'Molecular Weight') xVal = mol.molecularWeight;
        if (chart.yAxisKey === 'Molecular Weight') yVal = mol.molecularWeight;

        return {
          name: mol.name,
          x: xVal,
          y: yVal,
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 p-3 border border-slate-700 rounded shadow-xl backdrop-blur text-xs z-50">
          <p className="font-bold text-slate-100 mb-1">{data.name}</p>
          <p className="text-[10px] text-brand-400 mb-2">{data.formula}</p>
          <div className="space-y-1 text-slate-300">
             <p>{chart.xAxisKey}: <span className="font-mono text-white">{data.x}</span></p>
             {chart.type === 'scatter' && (
               <p>{chart.yAxisKey}: <span className="font-mono text-white">{data.y}</span></p>
             )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id={chart.id} className="bg-scientific-card rounded-xl border border-slate-800 shadow-xl flex flex-col h-[500px] relative group overflow-hidden">
      {/* Header Controls */}
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <input 
          value={chart.title} 
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-transparent font-bold text-slate-200 text-sm border border-transparent hover:border-slate-700 focus:border-brand-500 rounded px-2 py-1 outline-none transition-all w-1/2"
        />
        <div className="flex gap-2">
           <button onClick={onExport} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700" title="Exportar Imagem">
             <ImageIcon className="w-4 h-4" />
           </button>
           <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded border border-slate-700 ${showSettings ? 'bg-brand-600 text-white' : 'text-slate-400 bg-slate-800 hover:bg-slate-700'}`} title="Configurações">
             <Sliders className="w-4 h-4" />
           </button>
           <button onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700" title="Excluir Gráfico">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={chart.xAxisKey} 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{stroke: '#475569'}} 
                    label={{ value: chart.xAxisKey, position: 'bottom', fill: '#94a3b8', offset: 0, fontSize: 11 }} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={chart.yAxisKey} 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{stroke: '#475569'}} 
                    label={{ value: chart.yAxisKey, angle: -90, position: 'left', fill: '#94a3b8', fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Molecules" data={chartData} fill="#38bdf8">
                      {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} />
                      ))}
                  </Scatter>
                </ScatterChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} angle={-15} textAnchor="end" interval={0} height={60} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: chart.xAxisKey, angle: -90, position: 'left', fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="x" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} />
                        ))}
                    </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs">
               Nenhuma substância selecionada.
            </div>
          )}
          
          {/* Legend Overlay (Baked into image export) */}
          <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 bg-slate-900/50 p-1 rounded pointer-events-none">
              ChemSelect Analysis
          </div>
        </div>

        {/* Settings Sidebar (Collapsible) */}
        {showSettings && (
            <div className="w-64 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto flex flex-col gap-4 animate-in slide-in-from-right-5 duration-200 absolute right-0 top-0 bottom-0 z-20 h-full shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold uppercase text-brand-500 tracking-wider">Configuração</h4>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><Sliders className="w-3 h-3"/></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Tipo de Gráfico</label>
                        <select 
                            value={chart.type} 
                            onChange={(e) => onUpdate({ type: e.target.value as any })}
                            className="w-full bg-slate-800 text-slate-200 text-xs p-2 rounded border border-slate-700"
                        >
                            <option value="scatter">Dispersão (XY)</option>
                            <option value="bar">Barras (Comparação)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Eixo X (Valor Principal)</label>
                        <select 
                            value={chart.xAxisKey} 
                            onChange={(e) => onUpdate({ xAxisKey: e.target.value })}
                            className="w-full bg-slate-800 text-slate-200 text-xs p-2 rounded border border-slate-700"
                        >
                             {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {chart.type === 'scatter' && (
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Eixo Y</label>
                            <select 
                                value={chart.yAxisKey} 
                                onChange={(e) => onUpdate({ yAxisKey: e.target.value })}
                                className="w-full bg-slate-800 text-slate-200 text-xs p-2 rounded border border-slate-700"
                            >
                                {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-800 my-2 pt-4">
                    <h4 className="text-xs font-bold uppercase text-brand-500 tracking-wider mb-3">Substâncias ({chart.selectedMoleculeIds.length}/{allMolecules.length})</h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {allMolecules.map(mol => (
                            <div 
                                key={mol.id} 
                                onClick={() => toggleMolecule(mol.id)}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border transition-colors ${
                                    chart.selectedMoleculeIds.includes(mol.id) 
                                    ? 'bg-brand-900/20 border-brand-500/30 text-slate-200' 
                                    : 'bg-slate-800/50 border-transparent text-slate-500 hover:bg-slate-800'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${chart.selectedMoleculeIds.includes(mol.id) ? 'bg-brand-500 border-brand-500' : 'border-slate-600'}`}>
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