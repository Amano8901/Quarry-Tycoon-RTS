
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getMissionBriefing(situation: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are the Quarry Operations Chief. Provide a short, grit-filled mission briefing for the foreman (player) based on this situation: ${situation}. Keep it under 60 words.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini briefing failed", error);
    return "The rocks won't mine themselves. Get to work, Foreman.";
  }
}
