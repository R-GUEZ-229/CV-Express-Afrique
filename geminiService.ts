
import { GoogleGenAI, Type } from "@google/genai";
import { UserData } from "./types";

export const generateProfessionalDocuments = async (data: UserData): Promise<{ cv: string; letter: string }> => {
  // Always use process.env.API_KEY directly for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    En tant qu'expert en recrutement pour le marché africain (particulièrement en ${data.country}), génère un CV professionnel et une lettre de motivation d'exception pour ce profil :
    
    Nom Complet : ${data.fullName}
    Métier visé : ${data.job}
    Ville : ${data.city}, ${data.country}
    Email : ${data.email} | Téléphone : ${data.phone}
    ${data.linkedin ? `LinkedIn : ${data.linkedin}` : ''}
    
    Parcours Académique : ${data.education}
    Expériences Professionnelles : ${data.experience}
    Compétences Clés : ${data.skills}
    Langues : ${data.languages || 'Non spécifié'}
    Centres d'intérêt : ${data.hobbies || 'Non spécifié'}
    Bio/Objectif : ${data.bio}
    Ton souhaité : ${data.tone || 'professional'}

    CONSIGNES ET EXIGENCES DE HAUTE QUALITÉ :
    1. Le ton doit correspondre au choix du candidat ("${data.tone || 'professional'}"), être très impactant et adapté aux meilleurs standards locaux de : ${data.country}.
    2. Pour le CV, structure-le de manière moderne et très aérée avec du vrai code Markdown (utiliser # pour les grands titres, des bullets, des mots en gras). Inclure les sections : Profil Executif, Expériences Professionnelles, Parcours Académique, Compétences Techniques & Transversales, Langues & Atouts.
    3. Pour la lettre de motivation, elle ne doit pas être bateau. Elle doit être très persuasive, percutante, montrer la valeur ajoutée du profil pour une entreprise locale, bien structurée, prête à l'envoi.
    4. Retourne le résultat UNIQUEMENT sous forme de JSON valide avec EXACTEMENT DEUX clés : "cv" (le code Markdown du CV) et "letter" (le code Markdown de la lettre). Ne rajoute pas d'autres clés ni de texte hors du JSON.
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
      cv: result.cv || "Le CV n'a pas pu être généré. Veuillez réessayer.",
      letter: result.letter || "La lettre n'a pas pu être générée. Veuillez réessayer."
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Désolé, une erreur est survenue lors de la génération avec notre IA avancée. Veuillez réessayer dans quelques instants.");
  }
};
