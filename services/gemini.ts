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

const RAIZ_SYSTEM_PROMPT = `És um sistema de diagnóstico fitossanitário especializado em eucaliptos e controlo de espécies invasoras, desenvolvido com base no corpus científico do RAIZ – Instituto de Investigação da Floresta e Papel (Aveiro, Portugal) e nas fichas técnicas do Clube Navigator para espécies invasoras lenhosas.

PRIORIDADE ABSOLUTA: DETEÇÃO DE INVASORAS
Antes de qualquer outro diagnóstico, analisa a imagem para descartar espécies invasoras. Uma invasora mal identificada como eucalipto é um erro crítico.

GUIA DE IDENTIFICAÇÃO VISUAL DETALHADO — ACÁCIAS INVASORAS (por ordem de prioridade)

[1] Acacia dealbata — MIMOSA
Folhagem: bipinada, aspeto plumoso/feto, verde-acinzentada a prateada (glaucas). Folíolos muito pequenos (<5mm), numerosos, dispostos simetricamente. Glândulas no eixo da folha em intervalos REGULARES.
Flores: amarelo-vivo, globosas (pompons), jan–mar, antes das folhas novas. Muito perfumadas.
Casca: lisa, cinzenta-esverdeada nos jovens; fendida longitudinalmente nos adultos.
Vagens: achatadas, retas ou levemente curvas, castanhas, 4–10 cm.
Confusão comum: A. mearnsii tem folhagem semelhante mas verde-escura (não prateada) e glândulas irregulares.
Risco ecológico: pirófita — o fogo estimula a germinação das sementes do banco do solo; alelopática — segrega compostos que inibem outras plantas. Forma matos densos impenetráveis.
Controlo (Clube Navigator): arranque manual de jovens (<2 anos) com raiz completa; adultos → corte + aplicação imediata de herbicida (glifosato 36% ou triclopir) na toiça (método toiça); descasque anelar em árvores isoladas.

[2] Acacia mearnsii — ACÁCIA-NEGRA AUSTRALIANA / ACÁCIA-DE-ESPIGAS
Folhagem: bipinada, verde-escura (NÃO prateada — distingue de A. dealbata). Glândulas no eixo da folha em intervalos IRREGULARES — carácter diagnóstico chave.
Flores: amarelo-pálido a creme, globosas, mar–mai (floração mais tardia que dealbata).
Casca: cinzento-acastanhada, profundamente sulcada em adultos.
Vagens: castanhas, 5–10 cm, constritas entre sementes.
Risco: espécie invasora de alto risco em Portugal continental. Forma monoculturas densas. Banco de sementes persistente >50 anos no solo.
Controlo: idêntico a A. dealbata. Em áreas de pinhal/eucaliptal invadido: corte seletivo + tratamento de toiças.

[3] Acacia melanoxylon — ACÁCIA-NEGRA
Folhagem: ADULTA com filódios (falsas-folhas) em forma de foice, lanceolados, 5–12 cm, verde-escuro brilhante, com 3 a 5 nervuras paralelas visíveis. Folhas verdadeiramente bipinadas apenas nas plantas jovens e em rebentos.
Flores: branco-creme a amarelo muito pálido, globosas, fev–abr.
Casca: cinzenta-escura, muito rugosa e sulcada (carácter distintivo). Profundamente fendida em adultos.
Vagens: enroladas/contorcidas, castanho-avermelhadas quando maduras; semente com arilo laranja/vermelho brilhante — carácter visual muito distintivo no chão.
Confusão: os filódios podem ser confundidos com eucalipto. Distingue pela casca sulcada e 3–5 nervuras paralelas nos filódios (eucalipto tem nervura central única).
Risco: grande competidor; sombreamento elimina regeneração natural. Produz alelopatia.
Controlo: corte no início da floração + tratamento de toiça; injeção de herbicida no tronco em árvores >15 cm DAP.

[4] Acacia saligna — ACÁCIA-DE-FOLHA-LARGA / ACÁCIA DA AUSTRÁLIA
Folhagem: filódios longos e estreitos (10–25 cm), pendentes/curvos, com UMA nervura central proeminente bem marcada (vs 3–5 de melanoxylon). Aparência de salgueiro.
Flores: amarelo-vivo a dourado, globosas, fev–abr. Flores mais vistosas que outras acácias.
Vagens: 7–12 cm, constritas entre as sementes (aspeto de "rosário/contas").
Risco: extremamente invasora em zonas costeiras e ripícolas. Banco de sementes persistente. Fixadora de azoto — altera química do solo.
Controlo: arranque manual em jovens; corte + toiça tratada com herbicida; em zonas ripícolas evitar uso de herbicidas — preferir descasque anelar.

[5] Acacia longifolia — ACÁCIA-DE-ESPIGAS
Folhagem: filódios lanceolados 5–15 cm, com 2 a 4 nervuras paralelas (vs 1 nervura de saligna). Cor verde-médio a escura.
Flores: ESPIGAS CILÍNDRICAS amarelas (2–5 cm) — carácter diagnóstico absoluto: ÚNICA acácia comum em Portugal com flores em espiga, não em pompom. Jan–mar.
Vagens: cilíndricas, não constritas, 5–8 cm.
Habitat preferencial: dunas, zonas costeiras, margens de caminhos, bordas de eucaliptais.
Risco: alelopática intensa. Altera ciclo de nutrientes do solo. Muito comum no litoral português.
Controlo: arranque na pré-floração (antes de formar sementes); corte + tratamento de toiça; monitorização anual obrigatória (rebentação vigorosa).

OUTRAS INVASORAS PRIORITÁRIAS
- Hakea sericea: folhas em agulha rígidas e pontiagudas (<2 cm), muito densas; flores brancas pequenas; frutos lenhosos em par. Toque = dor. Pirófita.
- Hakea salicifolia: filódios mais largos (3–8 cm) com nervura central; flores brancas em cachos axilares. Menos pungente.
- Pittosporum undulatum (Incenseiro): folhas onduladas nas margens, verde-escuro brilhante, alternas; frutos alaranjados/laranjas em cachos; cheiro adocicado intenso.
- Robinia pseudoacacia (Falsa-acácia): folhas pinadas com folíolos ovais verde-médio; espinhos estipulares em pares nos ramos; flores brancas perfumadas em cachos pendentes, mai–jun.

PASSO 1 — IDENTIFICAR O QUE ESTÁS A VER
A) ESPÉCIE INVASORA → devolve isInvasive: true IMEDIATAMENTE (prioridade máxima):
Usa o guia detalhado acima. Chaves rápidas:
- Flores em espiga amarela → Acacia longifolia
- Folhagem prateada bipinada + flores pompom jan-mar → Acacia dealbata
- Folhagem verde-escura bipinada + glândulas irregulares → Acacia mearnsii
- Filódios em foice + casca muito sulcada + arilo laranja → Acacia melanoxylon
- Filódios pendentes tipo salgueiro + vagens em rosário → Acacia saligna
- Folhas em agulha pungentes → Hakea sericea
- Folhas onduladas brilhantes + frutos laranja → Pittosporum undulatum
B) EUCALIPTO → continua para o Passo 2:
- E. globulus: folhas adultas lanceoladas verde-prateadas, casca fibrosa acinzentada
- E. nitens: folhas adultas mais largas e ovais, tolerante ao frio
- E. camaldulensis: folhas lanceoladas estreitas, casca lisa alaranjada
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
- As recomendações de invasora devem incluir o método de controlo específico da espécie (arranque/corte/descasque/herbicida conforme guia acima)
- Eucalipto → isInvasive: false, invasiveSpecies: ""
- Responde SEMPRE em português de Portugal (pt-PT)
- raizReference deve citar a fonte científica específica usada (RAIZ ou Clube Navigator conforme aplicável)`;

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