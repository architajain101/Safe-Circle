import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";


async function executeAI(modelName: string, parameters: any) {
  const primaryKey = process.env.GEMINI_API_KEY;
  
  try {
    if (!primaryKey) throw new Error("No primary Gemini API key found");
    const ai = new GoogleGenAI({ apiKey: primaryKey });
    return await ai.models.generateContent({
      model: modelName,
      ...parameters
    });
  } catch (error: any) {
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
      console.warn("AI Quota exhausted on primary key. Attempting fallback...");
      try {
        const aiFallback = new GoogleGenAI({ apiKey: FALLBACK_KEY });
        return await aiFallback.models.generateContent({
          model: modelName,
          ...parameters
        });
      } catch (fallbackError: any) {
        console.error("Fallback AI failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function analyzeReport(userText: string, imageUrl?: string, audioUrl?: string): Promise<AIAnalysis> {
  try {
    const prompt = `Analyze abuse report. 
    Description: "${userText}"
    Actions: OCR image if provided, transcribe audio if provided.
    Output: JSON only.`;

    const parts: any[] = [{ text: prompt }];

    if (imageUrl && imageUrl.startsWith('data:')) {
      const [meta, data] = imageUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      parts.push({ inlineData: { mimeType, data } });
    }

    if (audioUrl && audioUrl.startsWith('data:')) {
      const [meta, data] = audioUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      parts.push({ inlineData: { mimeType, data } });
    }

    const response = await executeAI("gemini-3-flash-preview", {
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            severity: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            extractedText: { type: Type.STRING },
            sttResult: { type: Type.STRING },
            consistencyFlag: { type: Type.STRING },
          },
          required: ["type", "severity", "confidence"],
        }
      }
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    
    // Normalize data
    if (!['low', 'medium', 'high'].includes(result.severity)) result.severity = 'medium';
    if (!['consistent', 'inconsistent', 'verified'].includes(result.consistencyFlag)) result.consistencyFlag = 'consistent';
    
    return result as AIAnalysis;
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    if (error?.message?.includes('429')) throw new Error("AI_QUOTA_EXCEEDED");
    throw error;
  }
}

export async function analyzeReportAdvanced(userText: string, category: string, imageUrl?: string, audioUrl?: string): Promise<AIAnalysis> {
  try {
    const prompt = `Advanced Abuse Report Analysis.
    Category: ${category}
    User Description: "${userText}"
    
    Analyze context and sentiment. Determine threat level. Perform OCR and transcription if media exists.`;

    const parts: any[] = [{ text: prompt }];

    if (imageUrl && imageUrl.startsWith('data:')) {
      const [meta, data] = imageUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      parts.push({ inlineData: { mimeType, data } });
    }

    if (audioUrl && audioUrl.startsWith('data:')) {
      const [meta, data] = audioUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      parts.push({ inlineData: { mimeType, data } });
    }

    const response = await executeAI("gemini-3.1-pro-preview", {
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            severity: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            extractedText: { type: Type.STRING },
            sttResult: { type: Type.STRING },
            consistencyFlag: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            intent: { type: Type.STRING },
            threatLevel: { type: Type.STRING },
          },
          required: ["type", "severity", "confidence", "sentiment", "intent", "threatLevel"],
        }
      }
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    
    // Normalize data
    if (!['low', 'medium', 'high'].includes(result.severity)) result.severity = 'medium';
    if (!['low', 'medium', 'high', 'critical'].includes(result.threatLevel)) result.threatLevel = 'medium';
    if (!['consistent', 'inconsistent', 'verified'].includes(result.consistencyFlag)) result.consistencyFlag = 'consistent';
    
    return result as AIAnalysis;
  } catch (error: any) {
    console.error("Advanced AI Analysis failed:", error);
    if (error?.message?.includes('429')) throw new Error("AI_QUOTA_EXCEEDED");
    throw error;
  }
}
