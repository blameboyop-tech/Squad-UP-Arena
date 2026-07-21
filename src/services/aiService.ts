import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const chatWithAI = async (message: string, history: any[] = []) => {
  try {
    const ai = getAI();
    
    // Map history to the new format
    const contents = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: Array.isArray(h.parts) ? h.parts : [{ text: String(h.parts) }]
    }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents
    });

    return response.text || "AI is temporarily busy, please try again later";
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return "AI is temporarily busy, please try again later";
  }
};

export const analyzeReports = async (reports: any[]) => {
  try {
    const ai = getAI();
    
    const prompt = `
      You are an AI Moderator Assistant for Squad UP Arena, an esports platform.
      Analyze the following behavior reports and provide a concise summary for the admin in JSON format.
      Focus on identifying patterns of toxic behavior or coordinated flooding.
      
      Reports Data:
      ${JSON.stringify(reports.slice(0, 50))}
      
      Response Format (JSON):
      {
        "flaggedUsers": [
          { "userId": "...", "reason": "...", "severity": "low|medium|high", "summary": "..." }
        ],
        "trends": ["...", "..."]
      }
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flaggedUsers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  userId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  summary: { type: Type.STRING }
                },
                required: ["userId", "reason", "severity", "summary"]
              }
            },
            trends: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["flaggedUsers", "trends"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
};
