import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, PlantStatus, LightLevel } from "../types";

/**
 * Inicialização global do cliente GoogleGenAI.
 * O SDK consome a chave diretamente de process.env.API_KEY injetada pelo ambiente.
 */
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utilitários de codificação e decodificação para processamento de áudio PCM e Base64
export const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decode = decodeBase64;

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

/**
 * Gera feedback de voz (TTS) utilizando o modelo gemini-2.5-flash-preview-tts.
 * Retorna os bytes de áudio em formato base64.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

/**
 * Analisa a saúde da planta via imagem.
 */
export const analyzePlantImage = async (base64Image: string): Promise<AnalysisResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', // 🚀 AQUI ESTÁ A CORREÇÃO! Modelo estável e super rápido.
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: "Identifique a planta e forneça um diagnóstico de saúde (HEALTHY, THIRSTY, SICK) e luz (LOW, ADEQUATE, HIGH). Responda em português." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          species: { type: Type.STRING },
          status: { type: Type.STRING, description: "HEALTHY, THIRSTY, ou SICK" },
          lightLevel: { type: Type.STRING, description: "LOW, ADEQUATE, ou HIGH" },
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["species", "status", "lightLevel", "summary", "recommendation", "confidence"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      species: data.species || "Planta não identificada",
      status: (data.status as PlantStatus) || PlantStatus.UNKNOWN,
      lightLevel: (data.lightLevel as LightLevel) || LightLevel.UNKNOWN,
      summary: data.summary || "Não foi possível analisar detalhadamente.",
      recommendation: data.recommendation || "Tente capturar de outro ângulo.",
      confidence: data.confidence || 0
    };
  } catch (e) {
    throw new Error("Erro ao interpretar resposta da IA.");
  }
};