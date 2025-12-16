export enum ViewState {
  SEARCH = 'SEARCH',
  DASHBOARD = 'DASHBOARD',
  COMPARISON = 'COMPARISON'
}

export interface ChemicalProperty {
  name: string;
  value: number | string;
  unit: string;
  category: 'Physical' | 'Thermodynamic' | 'Structural' | 'Safety' | 'Biological' | 'Custom';
}

export interface HansenParameters {
  deltaD: number; // Dispersão
  deltaP: number; // Polaridade
  deltaH: number; // Ponte de Hidrogênio
  radius?: number; // Raio de interação (opcional)
  method: 'VanKrevelen' | 'Stefanis' | 'Marcus' | 'Costas' | 'Manual';
}

export interface Molecule {
  id: string;
  name: string;
  englishName?: string; // Nome em inglês para melhor compatibilidade com APIs (PubChem)
  description: string;
  formula: string;
  smiles: string; // Simplified Molecular Input Line Entry System
  casNumber?: string;
  pdbId?: string; // Protein Data Bank ID for proteins
  structureType: 'small-molecule' | 'protein';
  molecularWeight: number;
  properties: ChemicalProperty[];
  hsp?: HansenParameters; // New Field
  tags: string[];
  notes?: string; // User annotations
  source?: string;
}

export interface DashboardChart {
  id: string;
  title: string;
  type: 'scatter' | 'bar';
  xAxisKey: string;
  yAxisKey: string;
  selectedMoleculeIds: string[]; // Control which molecules appear in this specific chart
}

export interface ProjectData {
  molecules: Molecule[];
  charts: DashboardChart[];
  lastModified: number;
}

export interface SearchFilters {
  minMeltingPoint?: string;
  maxMeltingPoint?: string;
  solubility?: string; // 'soluble', 'insoluble', 'any'
  bondType?: string; // 'covalent', 'ionic', 'metallic', etc.
  databaseSource?: string; // 'PubChem', 'MatWeb', 'NIST', 'PDB'
  includeProteins?: boolean;
}