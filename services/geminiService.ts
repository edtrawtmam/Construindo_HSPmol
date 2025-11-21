import { GoogleGenAI, Type } from "@google/genai";
import { Molecule, ChemicalProperty, SearchFilters } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractChemicalNamesFromText = async (text: string): Promise<string[]> => {
  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Analise o texto abaixo, extraído de um documento técnico/científico.
    Identifique e extraia uma lista de substâncias químicas, compostos, materiais ou proteínas mencionados.
    
    Regras:
    - Ignore termos genéricos (ex: "solução", "amostra", "gás").
    - Ignore quantidades ou unidades.
    - Retorne APENAS um array JSON de strings com os nomes.
    - Limite a no máximo 30 itens mais relevantes se houver muitos.
    
    Texto:
    "${text.substring(0, 15000)}" 
  `;
  // Truncate text to avoid token limits

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to extract chemical names:", error);
    return [];
  }
};

export const searchSubstances = async (query: string, filters?: SearchFilters, batchList?: string[]): Promise<Molecule[]> => {
  const modelId = 'gemini-2.5-flash';

  let filterInstructions = "";
  if (filters) {
    filterInstructions = `
    APLIQUE OS SEGUINTES FILTROS ESTRITAMENTE:
    ${filters.minMeltingPoint ? `- Ponto de Fusão Mínimo: ${filters.minMeltingPoint}°C` : ''}
    ${filters.maxMeltingPoint ? `- Ponto de Fusão Máximo: ${filters.maxMeltingPoint}°C` : ''}
    ${filters.solubility && filters.solubility !== 'any' ? `- Solubilidade em Água: Deve ser ${filters.solubility}` : ''}
    ${filters.bondType ? `- Tipo de Ligação Predominante: ${filters.bondType}` : ''}
    ${filters.databaseSource ? `- Priorize dados da fonte: ${filters.databaseSource}` : ''}
    ${filters.includeProteins ? `- O usuário tem interesse explícito em PROTEÍNAS e ENZIMAS relacionadas à busca.` : ''}
    
    Se uma substância não atender aos critérios numéricos ou de propriedade, NÃO a inclua na lista.
    `;
  }

  const isBatchMode = batchList && batchList.length > 0;

  let prompt = "";

  if (isBatchMode) {
     prompt = `
      Você é um assistente de pesquisa científica.
      O usuário forneceu uma lista específica de substâncias para importação:
      ${JSON.stringify(batchList)}

      Tarefa:
      Retorne os dados científicos detalhados para CADA uma dessas substâncias.
      Ignore a limitação usual de quantidade de itens, processe todos da lista (ou o máximo possível).
      
      IMPORTANTE SOBRE ESTRUTURA 3D:
      - Se for uma proteína/enzima, VOCÊ DEVE fornecer o 'pdbId' (Código de 4 caracteres do Protein Data Bank, ex: '1CRN').
      - Se for uma pequena molécula, forneça o 'smiles' e o 'englishName' (Nome oficial em inglês para busca no PubChem).
      
      Inclua propriedades numéricas na lista de 'properties':
      - Para Químicos: Peso Molecular, Ponto de Fusão, Ponto de Ebulição, Densidade, LogP.
      - Para Proteínas: Peso Molecular (kDa), Ponto Isoelétrico (pI), Número de Resíduos, Organismo de Origem.
     `;
  } else {
     prompt = `
      Você é um assistente de pesquisa em química, biologia molecular e ciência dos materiais.
      O usuário está buscando: "${query}".
      
      ${filterInstructions}
      
      Retorne uma lista mista de 3 a 6 itens que podem incluir:
      1. Pequenas moléculas/compostos químicos (Ex: Grafeno, Aspirina).
      2. Proteínas ou Enzimas relevantes (Se aplicável ao termo de busca e filtros).
      
      Para cada item, forneça dados científicos precisos.
      
      IMPORTANTE SOBRE ESTRUTURA 3D:
      - Se for uma proteína/enzima, VOCÊ DEVE fornecer o 'pdbId' (Código de 4 caracteres do Protein Data Bank, ex: '1CRN', '4HHB').
      - Se for uma pequena molécula, forneça o 'smiles' e o 'englishName' (Nome oficial em inglês para busca no PubChem).
      
      Inclua propriedades numéricas na lista de 'properties':
      - Para Químicos: Peso Molecular, Ponto de Fusão, Ponto de Ebulição, Densidade, LogP.
      - Para Proteínas: Peso Molecular (kDa), Ponto Isoelétrico (pI), Número de Resíduos, Organismo de Origem.
      
      Se o valor for desconhecido, estime com base em ciência sólida ou use -1.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome comum (pode ser em PT-BR)" },
              englishName: { type: Type.STRING, description: "Nome técnico em inglês para busca em banco de dados (PubChem)" },
              description: { type: Type.STRING },
              formula: { type: Type.STRING },
              smiles: { type: Type.STRING, description: "Apenas para pequenas moléculas" },
              pdbId: { type: Type.STRING, description: "Código de 4 letras do PDB (apenas para proteínas)" },
              structureType: { type: Type.STRING, enum: ["small-molecule", "protein"] },
              casNumber: { type: Type.STRING },
              molecularWeight: { type: Type.NUMBER },
              source: { type: Type.STRING, description: "Fonte principal (PubChem, PDB, UniProt)" },
              properties: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.STRING }, 
                    unit: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['Physical', 'Thermodynamic', 'Structural', 'Safety', 'Biological'] }
                  }
                }
              }
            },
            required: ['name', 'formula', 'molecularWeight', 'properties', 'structureType']
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Map and generate IDs
    return rawData.map((item: any, index: number) => ({
      ...item,
      id: `${item.pdbId || item.formula}-${index}-${Date.now()}`,
      tags: ['Search Result', item.structureType, isBatchMode ? 'Imported' : 'Search'],
      notes: ''
    }));

  } catch (error) {
    console.error("Error fetching chemical data:", error);
    return [];
  }
};

export const enrichMoleculeData = async (molecule: Molecule, context: string): Promise<Molecule> => {
  const modelId = 'gemini-2.5-flash';
  const prompt = `
    Analise a substância: ${molecule.name} (${molecule.structureType === 'protein' ? 'Proteína PDB:' + molecule.pdbId : molecule.formula}).
    Contexto do usuário: "${context}".
    Adicione 2 novas propriedades relevantes a este contexto na lista de propriedades.
    Retorne o objeto JSON da molécula atualizado.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const updatedData = JSON.parse(response.text || "{}");
    if (updatedData.properties) {
        return { ...molecule, properties: [...molecule.properties, ...updatedData.properties] };
    }
    return molecule;
  } catch (e) {
    console.error("Enrichment failed", e);
    return molecule;
  }
};