import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, PlantStatus, LightLevel, ThreatType, SeverityLevel, ForestryRisk } from "../types";
import { keyManager } from "./keyManager";

export const getAI = (): GoogleGenAI => keyManager.getAI();
export { keyManager };

export const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decode = decodeBase64;

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

export const generateSpeech = async (text: string): Promise<string> => {
  return keyManager.withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

const RAIZ_SYSTEM_PROMPT = `És um sistema de diagnóstico fitossanitário especializado em eucaliptos e controlo de espécies invasoras, desenvolvido com base no corpus científico do RAIZ – Instituto de Investigação da Floresta e Papel (Aveiro, Portugal).
PASSO 1 — IDENTIFICAR O QUE ESTÁS A VER
A) EUCALIPTO → continua para o Passo 2:
- E. globulus: folhas adultas lanceoladas verde-prateadas, casca fibrosa acinzentada
- E. nitens: folhas adultas mais largas e ovais, tolerante ao frio
- E. camaldulensis: folhas lanceoladas estreitas, casca lisa alaranjada
B) ESPÉCIE INVASORA → devolve isInvasive: true imediatamente:
- Acacia dealbata (Mimosa): folhagem verde-azulada bipinada muito fina, flores amarelas em cachos
- Acacia melanoxylon: folhas lanceoladas largas, casca cinzenta muito rugosa e fendida
- Acacia longifolia: folhas lanceoladas estreitas brilhantes, flores em espigas amarelas
- Hakea sericea: folhas em agulha muito rígidas e pontiagudas, flores brancas
- Hakea salicifolia: folhas lanceoladas com nervura central, flores brancas em cachos
- Pittosporum undulatum (Incenseiro): folhas onduladas brilhantes verde-escuro, frutos laranja
- Robinia pseudoacacia (Falsa-acácia): folhas pinadas, flores brancas pendentes perfumadas
C) NÃO IDENTIFICÁVEL → species: "desconhecida", isInvasive: false, threatDetected: "nenhuma"
PASSO 2 — SE FOR EUCALIPTO: DIAGNÓSTICO FITOSSANITÁRIO
Foca o diagnóstico no TERÇO SUPERIOR DA COPA (zona de ataque preferencial).
1. GONIPTERUS PLATENSIS (gorgulho-do-eucalipto)
Escala RAIZ/BIOND: 0=sem sinais | 1=11-25% afetado | 2=26-50% | 3=>50% desfolha grave
2. PHORACANTHA SPP. (broca-do-eucalipto)
Sintomas: copa seca do topo para baixo, exsudações resinosas no tronco, orifícios com serrim na base.
3. MYCOSPHAERELLA (manchas foliares)
Sintomas: manchas castanhas/negras com halo amarelado; coalescência; queda prematura de folhas.
4. DEFICIÊNCIAS NUTRICIONAIS (Manual Nutrição RAIZ/Navigator):
- Deficiência N: avermelhamento uniforme do limbo das folhas velhas
- Deficiência K: clorose marginal → necrose nas margens; bordos secos castanhos
- Deficiência Mg: clorose internerval; nervuras verdes, tecido inter-nerval amarelo/necrótico
REGRAS ABSOLUTAS DE RESPOSTA
- Invasora → isInvasive: true, invasiveSpecies: nome científico exato, threatDetected: "invasora", healthStatus: "Crítico", forestryRisk: "Alto"
- A PRIMEIRA recomendação de invasora DEVE começar SEMPRE por "REMOVER IMEDIATAMENTE."
- Eucalipto → isInvasive: false, invasiveSpecies: ""
- Responde SEMPRE em português de Portugal (pt-PT)
- raizReference deve citar a fonte científica específica usada`;

export const analyzePlantImage = async (base64Image: string): Promise<AnalysisResult> => {
  return keyManager.withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: `Analisa esta imagem segundo os critérios RAIZ. Primeiro determina: é eucalipto, é uma espécie invasora, ou é desconhecido? Responde EXCLUSIVAMENTE com JSON válido.` }
        ]
      },
      config: {
        systemInstruction: RAIZ_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            species: { type: Type.STRING },
            healthStatus: { type: Type.STRING },
            threatDetected: { type: Type.STRING },
            severityLevel: { type: Type.NUMBER },
            forestryRisk: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            raizReference: { type: Type.STRING },
            summary: { type: Type.STRING },
            lightLevel: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            isInvasive: { type: Type.BOOLEAN },
            invasiveSpecies: { type: Type.STRING },
          },
          required: ["species", "healthStatus", "threatDetected", "severityLevel", "forestryRisk", "recommendations", "raizReference", "summary", "lightLevel", "confidence", "isInvasive", "invasiveSpecies"]
        }
      }
    });
    try {
      const data = JSON.parse(response.text || '{}');
      const recommendations: string[] = Array.isArray(data.recommendations) ? data.recommendations : [data.recommendations || "Consultar técnico florestal."];
      const isInvasive = Boolean(data.isInvasive);
      return {
        species: data.species || 'desconhecida',
        healthStatus: data.healthStatus || (isInvasive ? 'Crítico' : 'Saudável'),
        threatDetected: (data.threatDetected as ThreatType) || 'nenhuma',
        severityLevel: (data.severityLevel as SeverityLevel) ?? 0,
        forestryRisk: (data.forestryRisk as ForestryRisk) || 'Baixo',
        recommendations,
        raizReference: data.raizReference || 'Base científica RAIZ · raiz-iifp.pt',
        summary: data.summary || 'Não foi possível analisar em detalhe.',
        lightLevel: (data.lightLevel as LightLevel) || LightLevel.UNKNOWN,
        confidence: data.confidence ?? 0,
        isInvasive,
        invasiveSpecies: data.invasiveSpecies || null,
        status: healthStatusToPlantStatus(data.healthStatus, isInvasive),
        recommendation: recommendations[0] || 'Consultar técnico florestal.',
      } as AnalysisResult;
    } catch { throw new Error("Erro ao interpretar a resposta da IA."); }
  });
};

function healthStatusToPlantStatus(healthStatus: string, isInvasive = false): PlantStatus {
  if (isInvasive) return PlantStatus.SICK;
  switch (healthStatus) {
    case 'Saudável':  return PlantStatus.HEALTHY;
    case 'Em Stress': return PlantStatus.THIRSTY;
    case 'Doente':
    case 'Crítico':   return PlantStatus.SICK;
    default:          return PlantStatus.UNKNOWN;
  }
}