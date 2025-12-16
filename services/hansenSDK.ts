import { Molecule, HansenParameters } from '../types';

/**
 * HANSEN SOLUBILITY PARAMETERS SDK
 * Método: Group Contribution Method (GCM) - Van Krevelen & Hoftyzer
 * Backend: RDKit (WASM) para Substructure Matching preciso.
 */

declare global {
  interface Window {
    initRDKitModule: () => Promise<any>;
    RDKitModule: any;
  }
}

// --- 1. DATA TABLES (Van Krevelen Standard) ---
// SMARTS strings reais para uso no RDKit

interface GroupContribution {
  smarts: string; // RDKit SMARTS
  name: string;
  Fd: number; // Molar Attraction Constant
  Fp: number; // Molar Polar Attraction Constant
  Eh: number; // Hydrogen Bonding Energy
  V: number;  // Molar Volume Contribution
  priority: number; // Maior número = processado primeiro
}

const VKH_TABLE: GroupContribution[] = [
  // --- Priority 100+: Acids & Esters (Contain C=O and O) ---
  { smarts: '[CX3](=O)[OX2H1]', name: '-COOH (Acid)', Fd: 530, Fp: 420, Eh: 10000, V: 28.5, priority: 100 },
  { smarts: '[CX3](=O)[OX2H0]', name: '-COO- (Ester)', Fd: 390, Fp: 490, Eh: 7000, V: 18.0, priority: 90 }, // Generic Ester
  
  // --- Priority 80: Nitrogen containing Carbonyls ---
  { smarts: '[CX3](=O)[NX3]', name: '-CONH- (Amide)', Fd: 820, Fp: 1100, Eh: 8000, V: 25.0, priority: 85 },
  
  // --- Priority 70: Other Carbonyls ---
  // Ketone: Carbonyl bonded to two carbons
  { smarts: '[#6][CX3](=O)[#6]', name: '>C=O (Ketone)', Fd: 290, Fp: 770, Eh: 2000, V: 10.8, priority: 80 },
  // Aldehyde: Carbonyl bonded to at least one H
  { smarts: '[CX3H1](=O)', name: 'Aldehyde', Fd: 470, Fp: 800, Eh: 4500, V: 21.0, priority: 79 },

  // --- Priority 60: Alcohols & Nitriles ---
  { smarts: '[OX2H]', name: '-OH (Alcohol)', Fd: 280, Fp: 600, Eh: 20000, V: 10.0, priority: 75 },
  { smarts: 'C#N', name: '-CN (Nitrile)', Fd: 430, Fp: 1100, Eh: 2500, V: 24.0, priority: 65 },

  // --- Priority 50: Aromatics & Heteroatoms ---
  { smarts: 'c1ccccc1', name: 'Phenyl Ring', Fd: 1270, Fp: 110, Eh: 0, V: 52.4, priority: 70 },
  { smarts: '[OD2]([#6])[#6]', name: '-O- (Ether)', Fd: 100, Fp: 400, Eh: 3000, V: 3.8, priority: 60 },
  { smarts: '[NX3;H2,H1;!$(NC=O)]', name: '-N- (Amine)', Fd: 70, Fp: 300, Eh: 2000, V: 4.0, priority: 55 },
  
  { smarts: '[Cl]', name: '-Cl', Fd: 450, Fp: 550, Eh: 400, V: 24.0, priority: 50 },
  { smarts: '[F]', name: '-F', Fd: 180, Fp: 100, Eh: 400, V: 15.0, priority: 50 },

  // --- Priority 10: Carbon Backbone (Process last, lowest priority) ---
  // These are often overlapping, so the greedy consumption logic is crucial.
  { smarts: '[CH3]', name: '-CH3', Fd: 420, Fp: 0, Eh: 0, V: 33.5, priority: 10 },
  { smarts: '[CH2]', name: '-CH2-', Fd: 270, Fp: 0, Eh: 0, V: 16.1, priority: 9 },
  { smarts: '[CH1]', name: '>CH-', Fd: 80, Fp: 0, Eh: 0, V: -1.0, priority: 8 },
  { smarts: '[CH0]', name: '>C<', Fd: -70, Fp: 0, Eh: 0, V: -19.2, priority: 7 },
];

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
    throw new Error("RDKit library not found in window.");
  }

  /**
   * Calculates Hansen Solubility Parameters.
   * @param molecule The molecule data
   * @param preferredMethod The method to use
   */
  static async calculate(molecule: Molecule, preferredMethod: 'Auto' | 'VanKrevelen' | 'Stefanis' | 'Marcus' | 'Costas' | 'Manual' = 'Auto'): Promise<HansenParameters | null> {
    if (!molecule.smiles && preferredMethod !== 'Manual') return null;

    if (preferredMethod === 'Manual') {
        // Return existing if exists, or zeroed structure
        return molecule.hsp || { deltaD: 0, deltaP: 0, deltaH: 0, method: 'Manual' };
    }

    if (preferredMethod === 'VanKrevelen' || preferredMethod === 'Auto') {
        return await this.calculateVanKrevelen(molecule);
    }

    // Placeholders for future implementations
    if (preferredMethod === 'Costas' || preferredMethod === 'Marcus') {
        console.warn(`Method ${preferredMethod} not implemented yet. Returning null.`);
        return null;
    }

    // Default Fallback
    return await this.calculateVanKrevelen(molecule);
  }

  /**
   * "The Greedy Fragmenter" - RDKit Edition (Van Krevelen & Hoftyzer)
   */
  private static async calculateVanKrevelen(molecule: Molecule): Promise<HansenParameters | null> {
    try {
      const RDKit = await this.init();
      // Ensure we have a valid smiles string
      if (!molecule.smiles || typeof molecule.smiles !== 'string') return null;

      const mol = RDKit.get_mol(molecule.smiles);
      if (!mol) return null;

      const consumedAtoms = new Set<number>();
      const fragments: { group: GroupContribution, count: number }[] = [];

      // Sort groups by priority (Complex first)
      const sortedGroups = [...VKH_TABLE].sort((a, b) => b.priority - a.priority);

      for (const group of sortedGroups) {
        const qmol = RDKit.get_qmol(group.smarts);
        if (!qmol) {
            console.warn(`Invalid SMARTS pattern: ${group.smarts}`);
            continue;
        }
        
        let matches: { atoms: number[], bonds: number[] }[] = [];
        
        try {
            const matchesRaw = mol.get_substruct_matches(qmol);
            if (typeof matchesRaw === 'string') {
                const parsed = JSON.parse(matchesRaw);
                if (Array.isArray(parsed)) {
                    matches = parsed;
                }
            } else if (Array.isArray(matchesRaw)) {
                matches = matchesRaw;
            }
        } catch(e) {
            matches = [];
        }
        
        let validMatchesCount = 0;

        // Iterate through parsed JSON matches
        if (Array.isArray(matches)) {
            for (const match of matches) {
              const indices = match.atoms || []; 
              
              let isOverlap = false;
              
              // Check for overlaps with already consumed atoms (Greedy approach)
              for (const idx of indices) {
                 if (consumedAtoms.has(idx)) {
                   isOverlap = true;
                   break;
                 }
              }

              if (!isOverlap) {
                validMatchesCount++;
                // Mark atoms as consumed
                indices.forEach(idx => consumedAtoms.add(idx));
              }
            }
        }

        if (validMatchesCount > 0) {
          fragments.push({ group, count: validMatchesCount });
        }

        // Cleanup QMol
        if (qmol && qmol.delete) qmol.delete();
      }

      // Cleanup Mol
      if (mol && mol.delete) mol.delete();

      if (fragments.length === 0) return null;

      // --- Mathematical Aggregation (Van Krevelen) ---
      let sumFd = 0;
      let sumFp2 = 0;
      let sumEhi = 0;
      let sumV = 0;

      fragments.forEach(f => {
        sumFd += f.group.Fd * f.count;
        sumFp2 += (f.group.Fp * f.group.Fp) * f.count;
        sumEhi += f.group.Eh * f.count;
        sumV += f.group.V * f.count;
      });

      // Avoid division by zero & Fallback Density if V is calculated as 0 (unlikely with groups)
      if (sumV <= 0) sumV = molecule.molecularWeight / 1.0; 

      const deltaD = sumFd / sumV;
      const deltaP = Math.sqrt(sumFp2) / sumV;
      const deltaH = Math.sqrt(sumEhi / sumV);

      return {
        deltaD: parseFloat(deltaD.toFixed(2)),
        deltaP: parseFloat(deltaP.toFixed(2)),
        deltaH: parseFloat(deltaH.toFixed(2)),
        method: 'VanKrevelen'
      };

    } catch (e) {
      console.error("RDKit HSP Calc Error", e);
      return null;
    }
  }

  static calculateDistance(mol1: HansenParameters, mol2: HansenParameters): number {
    const termD = 4 * Math.pow(mol1.deltaD - mol2.deltaD, 2);
    const termP = Math.pow(mol1.deltaP - mol2.deltaP, 2);
    const termH = Math.pow(mol1.deltaH - mol2.deltaH, 2);
    return parseFloat(Math.sqrt(termD + termP + termH).toFixed(2));
  }
}