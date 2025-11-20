import React, { useState, useMemo } from 'react';
import { Molecule } from '../types';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Settings2, FileText } from 'lucide-react';

interface DashboardProps {
  projectMolecules: Molecule[];
}

export const Dashboard: React.FC<DashboardProps> = ({ projectMolecules }) => {
  const [xAxisKey, setXAxisKey] = useState<string>('Molecular Weight');
  const [yAxisKey, setYAxisKey] = useState<string>('Melting Point');
  const [chartType, setChartType] = useState<'scatter' | 'bar'>('scatter');

  // Extract all unique numerical property names from the dataset
  const availableProperties = useMemo(() => {
    const props = new Set<string>();
    props.add('Molecular Weight'); // Default field
    projectMolecules.forEach(mol => {
      mol.properties.forEach(p => {
        const val = parseFloat(p.value.toString());
        if (!isNaN(val)) {
          props.add(p.name);
        }
      });
    });
    return Array.from(props);
  }, [projectMolecules]);

  const chartData = useMemo(() => {
    return projectMolecules.map(mol => {
      const xProp = mol.properties.find(p => p.name === xAxisKey);
      const yProp = mol.properties.find(p => p.name === yAxisKey);
      
      // Handle explicit fields vs dynamic properties
      let xVal = xProp ? parseFloat(xProp.value.toString()) : 0;
      let yVal = yProp ? parseFloat(yProp.value.toString()) : 0;

      if (xAxisKey === 'Molecular Weight') xVal = mol.molecularWeight;
      if (yAxisKey === 'Molecular Weight') yVal = mol.molecularWeight;

      return {
        name: mol.name,
        x: xVal,
        y: yVal,
        formula: mol.formula,
        fill: '#38bdf8' // Default color
      };
    });
  }, [projectMolecules, xAxisKey, yAxisKey]);

  if (projectMolecules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Settings2 className="w-12 h-12 mb-4 opacity-20" />
        <p>Selecione moléculas no modo de Busca para visualizar a análise.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 p-3 border border-slate-700 rounded shadow-xl">
          <p className="font-bold text-slate-100">{data.name}</p>
          <p className="text-xs text-brand-400 mb-2">{data.formula}</p>
          <p className="text-sm text-slate-300">
            {xAxisKey}: <span className="font-mono text-white">{data.x}</span>
          </p>
          {chartType === 'scatter' && (
            <p className="text-sm text-slate-300">
              {yAxisKey}: <span className="font-mono text-white">{data.y}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard do Projeto</h2>
          <p className="text-slate-400 text-sm">Visualização multidimensional de propriedades físico-químicas.</p>
        </div>
        <div className="flex gap-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <div className="flex flex-col">
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1">Eixo X</label>
                <select 
                    value={xAxisKey} 
                    onChange={(e) => setXAxisKey(e.target.value)}
                    className="bg-slate-900 text-white text-xs p-2 rounded border border-slate-700 focus:border-brand-500 outline-none"
                >
                    {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            
            {chartType === 'scatter' && (
                <div className="flex flex-col">
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1">Eixo Y</label>
                    <select 
                        value={yAxisKey} 
                        onChange={(e) => setYAxisKey(e.target.value)}
                        className="bg-slate-900 text-white text-xs p-2 rounded border border-slate-700 focus:border-brand-500 outline-none"
                    >
                        {availableProperties.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            )}

            <div className="flex flex-col">
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1">Tipo de Gráfico</label>
                <select 
                    value={chartType} 
                    onChange={(e) => setChartType(e.target.value as any)}
                    className="bg-slate-900 text-white text-xs p-2 rounded border border-slate-700 focus:border-brand-500 outline-none"
                >
                    <option value="scatter">Dispersão (2D)</option>
                    <option value="bar">Barras (Comparativo)</option>
                </select>
            </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-800 p-4 relative backdrop-blur-sm">
         {/* Annotation Simulation Layer */}
        <div className="absolute top-4 right-4 z-10">
             <button className="flex items-center gap-2 text-xs text-slate-400 hover:text-brand-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 transition-colors">
                 <FileText className="w-3 h-3" />
                 Adicionar Anotação ao Gráfico
             </button>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'scatter' ? (
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" dataKey="x" name={xAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={{stroke: '#475569'}} label={{ value: xAxisKey, position: 'bottom', fill: '#94a3b8', offset: 0 }} />
              <YAxis type="number" dataKey="y" name={yAxisKey} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={{stroke: '#475569'}} label={{ value: yAxisKey, angle: -90, position: 'left', fill: '#94a3b8' }} />
              <ZAxis type="number" range={[60, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Molecules" data={chartData} fill="#38bdf8">
                  {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} />
                  ))}
              </Scatter>
            </ScatterChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} label={{ value: xAxisKey, angle: -90, position: 'left', fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="x" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#38bdf8', '#f472b6', '#a78bfa', '#34d399'][index % 4]} />
                    ))}
                </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};