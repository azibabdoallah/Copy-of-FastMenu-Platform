import { GoogleGenAI } from "@google/genai";

// Helper to safely get API key from defined process.env
const getApiKey = () => {
  try {
    return (process.env as any).API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();

export const generateDishDescription = async (dishName: string, categoryName: string): Promise<string> => {
  try {
    if (!apiKey) {
      console.warn("API Key is missing for Gemini.");
      return "وصف تلقائي: طبق مميز ومحضر بعناية من أجود المكونات الطازجة.";
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';
    const prompt = `
      اكتب وصفاً قصيراً وشهياً باللغة العربية لطبق طعام في قائمة مطعم.
      اسم الطبق: ${dishName}
      التصنيف: ${categoryName}
      
      اجعل الوصف جذاباً للزبون، لا يتجاوز 25 كلمة.
      الجواب يجب أن يكون نص الوصف فقط بدون أي مقدمات.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text?.trim() || "طبق لذيذ ومميز من قائمتنا.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "وصف تلقائي: طبق مميز ومحضر بعناية من أجود المكونات.";
  }
};