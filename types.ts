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
  tags: string[];
  notes?: string; // User annotations
  source?: string;
}

export interface Project {
  id: string;
  name: string;
  molecules: Molecule[];
  createdAt: Date;
}

export interface ChartConfig {
  xAxis: string;
  yAxis: string;
  zAxis?: string; // For bubble size or 3rd dimension simulation
  type: 'scatter' | 'bar' | 'line' | 'radar';
}

export interface SearchFilters {
  minMeltingPoint?: string;
  maxMeltingPoint?: string;
  solubility?: string; // 'soluble', 'insoluble', 'any'
  bondType?: string; // 'covalent', 'ionic', 'metallic', etc.
  databaseSource?: string; // 'PubChem', 'MatWeb', 'NIST', 'PDB'
  includeProteins?: boolean;
}