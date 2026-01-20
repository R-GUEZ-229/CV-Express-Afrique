
import { GoogleGenAI, Type } from "@google/genai";
import { UserData } from "./types";

export const generateProfessionalDocuments = async (data: UserData): Promise<{ cv: string; letter: string }> => {
  // Always use process.env.API_KEY directly for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    En tant qu'expert en recrutement pour le marché africain (particulièrement en ${data.country}), génère un CV professionnel et une lettre de motivation pour le profil suivant :
    
    Nom Complet : ${data.fullName}
    Métier visé : ${data.job}
    Ville : ${data.city}, ${data.country}
    Email : ${data.email} | Téléphone : ${data.phone}
    
    Parcours : ${data.education}
    Expérience : ${data.experience}
    Compétences : ${data.skills}
    Bio/Objectif : ${data.bio}

    CONSIGNES :
    1. Le ton doit être extrêmement professionnel, clair et adapté aux standards locaux du ${data.country}.
    2. Pour le CV, utilise une structure claire (Profil, Expériences, Études, Compétences).
    3. Pour la lettre de motivation, elle doit être personnalisée et persuasive.
    4. Retourne le résultat UNIQUEMENT sous forme de JSON avec deux clés : "cv" (en Markdown) et "letter" (en Markdown).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cv: { type: Type.STRING },
            letter: { type: Type.STRING }
          },
          required: ["cv", "letter"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      cv: result.cv || "Erreur de génération du CV",
      letter: result.letter || "Erreur de génération de la lettre"
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Désolé, une erreur est survenue lors de la génération. Veuillez réessayer.");
  }
};
