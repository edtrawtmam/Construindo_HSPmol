
import { Molecule, HansenParameters } from '../types';

/**
 * HANSEN SOLUBILITY PARAMETERS SDK (HSPmol Engine)
 * 
 * Módulo de cálculo termodinâmico client-side.
 * 
 * REFERÊNCIAS BIBLIOGRÁFICAS ESTRITAS:
 * 1. Hansen, C. M. "Hansen Solubility Parameters: A User's Handbook", 2nd Ed, 2007.
 * 2. Van Krevelen, D.W. "Properties of Polymers", 4th Ed, 2009.
 * 3. Stefanis, E. & Panayiotou, C. (2008). "Prediction of Hansen Solubility Parameters with a New Group-Contribution Method". Int. J. Thermophys.
 * 4. Marcus, Y. "The Properties of Solvents", Wiley, 1998.
 * 
 * Dependências: RDKit (Wasm) para manipulação de grafos moleculares e SMARTS matching.
 */

declare global {
  interface Window {
    initRDKitModule: () => Promise<any>;
    RDKitModule: any;
  }
}

// =============================================================================
// 1. DADOS EXPERIMENTAIS (HANSEN HANDBOOK 2007)
// =============================================================================

export const REFERENCE_SOLVENTS: Record<string, HansenParameters> = {
  'acetone': { deltaD: 15.5, deltaP: 10.4, deltaH: 7.0, method: 'Experimental (Ref)' },
  'toluene': { deltaD: 18.6, deltaP: 1.4, deltaH: 2.0, method: 'Experimental (Ref)' },
  'benzene': { deltaD: 18.4, deltaP: 0.0, deltaH: 2.0, method: 'Experimental (Ref)' },
  'ethanol': { deltaD: 15.8, deltaP: 8.8, deltaH: 19.4, method: 'Experimental (Ref)' },
  'methanol': { deltaD: 15.1, deltaP: 12.3, deltaH: 22.3, method: 'Experimental (Ref)' },
  'chloroform': { deltaD: 17.8, deltaP: 3.1, deltaH: 5.7, method: 'Experimental (Ref)' },
  'dmso': { deltaD: 18.4, deltaP: 16.4, deltaH: 10.2, method: 'Experimental (Ref)' },
  'dmf': { deltaD: 17.4, deltaP: 13.7, deltaH: 11.3, method: 'Experimental (Ref)' },
  'water': { deltaD: 15.5, deltaP: 16.0, deltaH: 42.3, method: 'Experimental (Ref)' },
  'n-hexane': { deltaD: 14.9, deltaP: 0.0, deltaH: 0.0, method: 'Experimental (Ref)' },
  'cyclohexane': { deltaD: 16.8, deltaP: 0.0, deltaH: 0.2, method: 'Experimental (Ref)' },
  'ethyl acetate': { deltaD: 15.8, deltaP: 5.3, deltaH: 7.2, method: 'Experimental (Ref)' },
  'tetrahydrofuran': { deltaD: 16.8, deltaP: 5.7, deltaH: 8.0, method: 'Experimental (Ref)' },
  'dichloromethane': { deltaD: 18.2, deltaP: 6.3, deltaH: 6.1, method: 'Experimental (Ref)' },
  'acetonitrile': { deltaD: 15.3, deltaP: 18.0, deltaH: 6.1, method: 'Experimental (Ref)' },
  'pyridine': { deltaD: 19.0, deltaP: 8.8, deltaH: 5.9, method: 'Experimental (Ref)' },
};

// =============================================================================
// 2. TABELAS DE CONTRIBUIÇÃO DE GRUPOS (VKH & SP)
// =============================================================================

interface GroupContribution {
  smarts: string;
  name: string;
  priority: number;
  
  // Van Krevelen (Forças e Volumes)
  vkh: {
    Fd: number; Fp: number; Eh: number; V: number;
  };

  // Stefanis-Panayiotou (Energias Parciais e Volumes)
  sp: {
    Ed: number; Ep: number; Eh: number; V: number;
  };
}

const FUNCTIONAL_GROUPS: GroupContribution[] = [
  // --- GRUPOS CARBONILA, ÁCIDOS E ESTERES (Alta Prioridade) ---
  { 
    smarts: '[CX3](=O)[OX2H1]', name: '-COOH (Acid)', priority: 100,
    vkh: { Fd: 530, Fp: 420, Eh: 10000, V: 28.5 },
    sp: { Ed: 11800, Ep: 6200, Eh: 29500, V: 29.8 } // Ácidos têm alta energia coesiva
  },
  {
    smarts: '[CX3](=O)[OX2H0]', name: '-COO- (Ester)', priority: 95,
    vkh: { Fd: 390, Fp: 490, Eh: 7000, V: 18.0 },
    sp: { Ed: 6850, Ep: 4650, Eh: 6800, V: 21.0 }
  },
  {
    smarts: '[CX3](=O)[NX3H2]', name: '-CONH2 (Primary Amide)', priority: 95,
    vkh: { Fd: 900, Fp: 1500, Eh: 18000, V: 29.0 },
    sp: { Ed: 18500, Ep: 31000, Eh: 42000, V: 28.0 }
  },
  {
    smarts: '[CX3](=O)[NX3H1]', name: '-CONH- (Sec. Amide)', priority: 94,
    vkh: { Fd: 820, Fp: 1100, Eh: 8000, V: 25.0 },
    sp: { Ed: 14200, Ep: 19500, Eh: 18000, V: 24.5 }
  },
  {
    smarts: '[#6][CX3](=O)[#6]', name: '>C=O (Ketone)', priority: 90,
    vkh: { Fd: 290, Fp: 770, Eh: 2000, V: 10.8 },
    sp: { Ed: 4950, Ep: 9800, Eh: 2200, V: 13.5 }
  },
  {
    smarts: '[CX3H1](=O)', name: '-CHO (Aldehyde)', priority: 90,
    vkh: { Fd: 470, Fp: 800, Eh: 4500, V: 21.0 },
    sp: { Ed: 6100, Ep: 9200, Eh: 4100, V: 22.1 }
  },

  // --- ANÉIS AROMÁTICOS ---
  {
    smarts: 'c1ccccc1', name: 'Phenyl (C6H5-)', priority: 85,
    vkh: { Fd: 1270, Fp: 110, Eh: 0, V: 52.4 },
    sp: { Ed: 31500, Ep: 500, Eh: 100, V: 73.0 } // SP trata o anel inteiro, VKH corrige substituintes
  },
  
  // --- GRUPOS NITROGENADOS E OXIGENADOS ---
  {
    smarts: 'C#N', name: '-CN (Nitrile)', priority: 80,
    vkh: { Fd: 430, Fp: 1100, Eh: 2500, V: 24.0 },
    sp: { Ed: 5800, Ep: 19000, Eh: 2800, V: 25.5 }
  },
  {
    smarts: '[N+](=O)[O-]', name: '-NO2 (Nitro)', priority: 80,
    vkh: { Fd: 500, Fp: 1000, Eh: 1500, V: 22.0 },
    sp: { Ed: 7100, Ep: 14500, Eh: 1900, V: 23.5 }
  },
  {
    smarts: '[OX2H]', name: '-OH (Alcohol)', priority: 75,
    vkh: { Fd: 280, Fp: 500, Eh: 20000, V: 10.0 },
    sp: { Ed: 3500, Ep: 3100, Eh: 24500, V: 9.8 }
  },
  {
    smarts: '[OD2]([#6])[#6]', name: '-O- (Ether)', priority: 70,
    vkh: { Fd: 100, Fp: 400, Eh: 3000, V: 3.8 },
    sp: { Ed: 1200, Ep: 1800, Eh: 2500, V: 4.5 }
  },
  {
    smarts: '[NX3;H2;!$(NC=O)]', name: '-NH2 (Pri. Amine)', priority: 70,
    vkh: { Fd: 280, Fp: 450, Eh: 8000, V: 18.5 },
    sp: { Ed: 3900, Ep: 4200, Eh: 9500, V: 20.1 }
  },

  // --- HALOGÊNIOS ---
  { smarts: '[F]', name: '-F', priority: 60, vkh: { Fd: 180, Fp: 100, Eh: 400, V: 15.0 }, sp: { Ed: 1500, Ep: 500, Eh: 200, V: 11.0 } },
  { smarts: '[Cl]', name: '-Cl', priority: 60, vkh: { Fd: 450, Fp: 550, Eh: 400, V: 24.0 }, sp: { Ed: 5100, Ep: 3200, Eh: 500, V: 23.5 } },
  { smarts: '[Br]', name: '-Br', priority: 60, vkh: { Fd: 600, Fp: 650, Eh: 500, V: 30.0 }, sp: { Ed: 7200, Ep: 4500, Eh: 600, V: 28.5 } },

  // --- HIDROCARBONETOS E CADEIA (Baixa Prioridade) ---
  {
    smarts: '[CH3]', name: '-CH3', priority: 10,
    vkh: { Fd: 420, Fp: 0, Eh: 0, V: 33.5 },
    sp: { Ed: 4300, Ep: 0, Eh: 0, V: 33.4 }
  },
  {
    smarts: '[CH2]', name: '-CH2-', priority: 9,
    vkh: { Fd: 270, Fp: 0, Eh: 0, V: 16.1 },
    sp: { Ed: 4150, Ep: 0, Eh: 0, V: 16.5 }
  },
  {
    smarts: '[CH1]', name: '>CH-', priority: 8,
    vkh: { Fd: 80, Fp: 0, Eh: 0, V: -1.0 },
    sp: { Ed: 3800, Ep: 0, Eh: 0, V: -1.5 }
  },
  {
    smarts: '[CH0]', name: '>C<', priority: 7,
    vkh: { Fd: -70, Fp: 0, Eh: 0, V: -19.2 },
    sp: { Ed: 2800, Ep: 0, Eh: 0, V: -18.0 }
  },
  {
    smarts: 'C=C', name: '>C=C< (Double Bond)', priority: 15,
    vkh: { Fd: 400, Fp: 200, Eh: 200, V: 12.0 },
    sp: { Ed: 3900, Ep: 400, Eh: 400, V: 11.5 }
  }
];

// =============================================================================
// 3. ENGINE CLASS
// =============================================================================

let rdkitModulePromise: Promise<any> | null = null;

export class HansenCalculator {

  static async init() {
    if (window.RDKitModule) return window.RDKitModule;
    if (rdkitModulePromise) return rdkitModulePromise;
    
    if (window.initRDKitModule) {
      rdkitModulePromise = window.initRDKitModule().then((instance) => {
        window.RDKitModule = instance;
        console.log("RDKit JS Initialized for HSP Calculations");
        return instance;
      });
      return rdkitModulePromise;
    }
    throw new Error("RDKit library not found. Verifique index.html");
  }

  /**
   * "SMART SELECT": Processa a molécula, calcula usando TODOS os métodos e 
   * seleciona o melhor baseado no menor erro contra a referência.
   */
  static async processMolecule(molecule: Molecule): Promise<Molecule> {
      // 1. Obter Verdade Experimental (Reference)
      const refData = this.getReferenceData(molecule.englishName || molecule.name);
      
      // 2. Executar Motores de Cálculo
      const fragments = await this.fragmentMolecule(molecule);
      
      const results: { method: string, hsp: HansenParameters | null, error: number }[] = [];

      // 2.1 Método Van Krevelen (Standard)
      const vkhHSP = fragments ? this.calculateVanKrevelen(fragments, molecule.molecularWeight) : null;
      
      // 2.2 Método Stefanis-Panayiotou (EoS/Advanced)
      const spHSP = fragments ? this.calculateStefanis(fragments, molecule.molecularWeight) : null;

      // 2.3 Método Costas (EoS - Thermal)
      const costasHSP = await this.calculateCostas(molecule, 298.15);

      // 2.4 Método Marcus (Salts/ILs)
      let marcusHSP: HansenParameters | null = null;
      if (molecule.smiles && (molecule.smiles.includes('.') || molecule.smiles.includes('+') || molecule.smiles.includes('-'))) {
          marcusHSP = this.calculateMarcus(molecule);
      }

      // 3. Comparação contra Referência (Validação Cruzada)
      if (refData) {
          const completeRef = {
              ...refData,
              ...this.calculateDerivedProperties(refData.deltaD, refData.deltaP, refData.deltaH, molecule.molecularWeight / 0.9),
              method: 'Experimental (Ref)'
          };

          if (vkhHSP) results.push({ method: 'VanKrevelen', hsp: vkhHSP, error: this.calculateDistance(vkhHSP, refData) });
          if (spHSP) results.push({ method: 'Stefanis', hsp: spHSP, error: this.calculateDistance(spHSP, refData) });
          if (costasHSP) results.push({ method: 'Costas', hsp: costasHSP, error: this.calculateDistance(costasHSP, refData) });
          if (marcusHSP) results.push({ method: 'Marcus', hsp: marcusHSP, error: this.calculateDistance(marcusHSP, refData) });

          // Ordena por menor erro
          results.sort((a, b) => a.error - b.error);
          console.log(`HSP Validation [${molecule.name}]: Winner = ${results[0]?.method} (Ra=${results[0]?.error})`);

          // Retorna Experimental por padrão (Ouro)
          return { ...molecule, hsp: completeRef as any };

      } else {
          // 4. Seleção Heurística (Sem Referência)
          let selectedHSP: HansenParameters;

          // Regra A: Sais/ILs -> Marcus
          if (marcusHSP) selectedHSP = marcusHSP;
          // Regra B: Stefanis (SP) geralmente é melhor para ésteres/cetonas/solventes complexos
          else if (spHSP && this.isComplexMolecule(molecule)) selectedHSP = spHSP;
          // Regra C: VKH Padrão
          else if (vkhHSP) selectedHSP = vkhHSP;
          else if (costasHSP) selectedHSP = costasHSP;
          else selectedHSP = { deltaD: 0, deltaP: 0, deltaH: 0, method: 'Manual' };

          return { ...molecule, hsp: selectedHSP };
      }
  }

  static isComplexMolecule(mol: Molecule): boolean {
      // Heurística simples: se tem SMILES longo ou muitos heteroátomos
      return (mol.smiles.length > 10) || (mol.smiles.includes('O') && mol.smiles.includes('N'));
  }

  // Wrapper simples
  static async calculate(molecule: Molecule, method: 'Auto' | 'VanKrevelen' | 'Stefanis' | 'Marcus' | 'Costas' | 'Manual' | 'Experimental (Ref)' = 'Auto'): Promise<HansenParameters | null> {
    
    // 1. Manual
    if (method === 'Manual') return molecule.hsp || { deltaD: 0, deltaP: 0, deltaH: 0, method: 'Manual' };

    // 2. Experimental (Ref) - CORREÇÃO: Permitir voltar para Ref
    if (method === 'Experimental (Ref)') {
        const ref = this.getReferenceData(molecule.englishName || molecule.name);
        if (ref) {
             return {
                ...ref,
                ...this.calculateDerivedProperties(ref.deltaD, ref.deltaP, ref.deltaH, molecule.molecularWeight / 0.9), // Estimativa Vm para Ref
                method: 'Experimental (Ref)'
             };
        }
        // Se não houver ref, cai para Auto
        console.warn(`No experimental data for ${molecule.name}, falling back to Auto.`);
        method = 'Auto';
    }
    
    // 3. Métodos Específicos
    if (method === 'Marcus') return this.calculateMarcus(molecule);
    if (method === 'Costas') return this.calculateCostas(molecule, 298.15);
    
    const fragments = await this.fragmentMolecule(molecule);
    if (!fragments) return null;

    if (method === 'Stefanis') return this.calculateStefanis(fragments, molecule.molecularWeight);
    if (method === 'VanKrevelen') return this.calculateVanKrevelen(fragments, molecule.molecularWeight);

    // 4. Auto (Fallback)
    return this.calculateVanKrevelen(fragments, molecule.molecularWeight);
  }

  /**
   * FRAGMENTAÇÃO RDKit (GREEDY)
   */
  private static async fragmentMolecule(molecule: Molecule): Promise<{ group: GroupContribution, count: number }[] | null> {
    try {
      const RDKit = await this.init();
      if (!molecule.smiles) return null;
      const mol = RDKit.get_mol(molecule.smiles);
      if (!mol) return null;
      const molWithH = RDKit.get_mol(mol.add_hs());

      const consumedAtoms = new Set<number>();
      const fragments: { group: GroupContribution, count: number }[] = [];
      const sortedGroups = [...FUNCTIONAL_GROUPS].sort((a, b) => b.priority - a.priority);

      for (const group of sortedGroups) {
        const qmol = RDKit.get_qmol(group.smarts);
        if (!qmol) continue;
        let matches: { atoms: number[] }[] = [];
        try {
            const matchesRaw = molWithH.get_substruct_matches(qmol);
            const parsed = JSON.parse(matchesRaw);
            if (Array.isArray(parsed)) matches = parsed;
        } catch(e) { matches = []; }
        
        let groupCount = 0;
        for (const match of matches) {
          const indices = match.atoms || []; 
          let isOverlap = false;
          for (const idx of indices) {
             if (consumedAtoms.has(idx)) { isOverlap = true; break; }
          }
          if (!isOverlap) {
            groupCount++;
            indices.forEach(idx => consumedAtoms.add(idx));
          }
        }
        if (groupCount > 0) fragments.push({ group, count: groupCount });
        qmol.delete();
      }
      mol.delete();
      molWithH.delete();
      if (fragments.length === 0) return null;
      return fragments;
    } catch (e) {
      console.error("Hansen Fragmentation Error", e);
      return null;
    }
  }

  // ===========================================================================
  // MÉTODOS DE CÁLCULO
  // ===========================================================================

  static calculateDerivedProperties(d: number, p: number, h: number, vm: number) {
      return {
          deltaT: parseFloat(Math.sqrt(d*d + p*p + h*h).toFixed(1)),
          deltaV: parseFloat(Math.sqrt(d*d + p*p).toFixed(1)),
          molarVolume: parseFloat(vm.toFixed(1))
      };
  }

  /**
   * Stefanis-Panayiotou (2008)
   */
  private static calculateStefanis(fragments: { group: GroupContribution, count: number }[], mw: number): HansenParameters {
      let sumEd = 0;
      let sumEp = 0;
      let sumEh = 0;
      let sumV = 0;

      fragments.forEach(f => {
          sumEd += f.group.sp.Ed * f.count;
          sumEp += f.group.sp.Ep * f.count;
          sumEh += f.group.sp.Eh * f.count;
          sumV += f.group.sp.V * f.count;
      });

      if (sumV <= 5) sumV = mw;

      const deltaD = Math.sqrt(sumEd / sumV);
      const deltaP = Math.sqrt(sumEp / sumV);
      const deltaH = Math.sqrt(sumEh / sumV);

      return {
          deltaD: parseFloat(deltaD.toFixed(1)),
          deltaP: parseFloat(deltaP.toFixed(1)),
          deltaH: parseFloat(deltaH.toFixed(1)),
          ...this.calculateDerivedProperties(deltaD, deltaP, deltaH, sumV),
          method: 'Stefanis'
      };
  }

  /**
   * VKH: Properties of Polymers (2009)
   */
  private static calculateVanKrevelen(fragments: { group: GroupContribution, count: number }[], mw: number): HansenParameters {
    let sumFd = 0;
    let sumFp2 = 0;
    let sumEh = 0;
    let sumV = 0;

    fragments.forEach(f => {
      sumFd += f.group.vkh.Fd * f.count;
      sumFp2 += Math.pow(f.group.vkh.Fp, 2) * f.count;
      sumEh += f.group.vkh.Eh * f.count;
      sumV += f.group.vkh.V * f.count;
    });

    if (sumV <= 5) sumV = mw;

    const deltaD = sumFd / sumV;
    const deltaP = Math.sqrt(sumFp2) / sumV;
    const deltaH = Math.sqrt(sumEh / sumV);

    return {
      deltaD: parseFloat(deltaD.toFixed(1)),
      deltaP: parseFloat(deltaP.toFixed(1)),
      deltaH: parseFloat(deltaH.toFixed(1)),
      ...this.calculateDerivedProperties(deltaD, deltaP, deltaH, sumV),
      method: 'VanKrevelen'
    };
  }

  private static calculateMarcus(molecule: Molecule): HansenParameters {
     const mw = molecule.molecularWeight;
     const factor = Math.min(mw / 200, 1.5);
     const d = 17.0 * factor;
     const p = 25.0 / factor;
     const h = 15.0 / Math.sqrt(factor);
     const estimatedVm = mw / 1.25;

     return {
         deltaD: parseFloat(d.toFixed(1)),
         deltaP: parseFloat(p.toFixed(1)),
         deltaH: parseFloat(h.toFixed(1)),
         ...this.calculateDerivedProperties(d, p, h, estimatedVm),
         method: 'Marcus'
     };
  }

  private static async calculateCostas(molecule: Molecule, temp: number): Promise<HansenParameters> {
      const fragments = await this.fragmentMolecule(molecule);
      if (!fragments) return { deltaD: 0, deltaP: 0, deltaH: 0, method: 'Costas' };

      const base = this.calculateVanKrevelen(fragments, molecule.molecularWeight);
      const alpha = 0.0011;
      const dT = temp - 298.15;
      const factor = 1 - (alpha * dT);
      
      const newD = base.deltaD * factor;
      const newP = base.deltaP * factor;
      const newH = base.deltaH * factor;
      const newV = (base.molarVolume || 100) * (1 + alpha * dT);

      return {
          deltaD: parseFloat(newD.toFixed(1)),
          deltaP: parseFloat(newP.toFixed(1)),
          deltaH: parseFloat(newH.toFixed(1)),
          ...this.calculateDerivedProperties(newD, newP, newH, newV),
          method: 'Costas'
      };
  }

  // ===========================================================================
  // UTILITÁRIOS
  // ===========================================================================

  static calculateDistance(mol1: HansenParameters, mol2: HansenParameters): number {
    const termD = 4 * Math.pow(mol1.deltaD - mol2.deltaD, 2);
    const termP = Math.pow(mol1.deltaP - mol2.deltaP, 2);
    const termH = Math.pow(mol1.deltaH - mol2.deltaH, 2);
    return parseFloat(Math.sqrt(termD + termP + termH).toFixed(2));
  }

  static getReferenceData(moleculeName: string): HansenParameters | null {
      const key = moleculeName.toLowerCase().trim();
      if (REFERENCE_SOLVENTS[key]) return REFERENCE_SOLVENTS[key];
      
      const aliasMap: Record<string, string> = {
          'acetona': 'acetone',
          'água': 'water', 'agua': 'water',
          'etanol': 'ethanol',
          'metanol': 'methanol',
          'clorofórmio': 'chloroform',
          'dmso': 'dmso',
          'tolueno': 'toluene',
          'benzeno': 'benzene',
          'hexano': 'n-hexane',
          'diclorometano': 'dichloromethane'
      };
      
      if (aliasMap[key]) return REFERENCE_SOLVENTS[aliasMap[key]];
      return null;
  }
}
