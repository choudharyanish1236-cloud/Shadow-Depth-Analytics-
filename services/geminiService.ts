
import { GoogleGenAI } from "@google/genai";

// Always use the specified initialization format with process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiService {
  async getGeometricAnalysis(h: number, L: number, A_hand: number, A_shadow: number) {
    const prompt = `
      Analyze the following hand-shadow geometry configuration:
      - Distance from Light to Surface (L): ${L}cm
      - Actual Hand distance from surface (h): ${h}cm
      - Reference Hand Area (A_hand): ${A_hand} units
      - Projected Shadow Area (A_shadow): ${A_shadow.toFixed(2)} units

      Explain the geometric relationship using inverse square law principles and suggest how to improve depth estimation accuracy (e.g., handling penumbra effects or non-point light sources). Keep it concise and technical.
    `;

    try {
      // Using gemini-3-pro-preview for complex STEM analysis as per guidelines.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      // Extracting text directly from the text property.
      return response.text || "No analysis available.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Unable to generate AI analysis at this time.";
    }
  }
}

export const geminiService = new GeminiService();
