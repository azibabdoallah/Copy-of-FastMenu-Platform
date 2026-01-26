import { GoogleGenAI } from "@google/genai";

// Standard implementation for Gemini API description generation following strict @google/genai guidelines.
export const generateDishDescription = async (dishName: string, categoryName: string): Promise<string> => {
  try {
    // Initializing with the required named parameter and environment variable directly as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      اكتب وصفاً قصيراً وشهياً باللغة العربية لطبق طعام في قائمة مطعم.
      اسم الطبق: ${dishName}
      التصنيف: ${categoryName}
      
      اجعل الوصف جذاباً للزبون، لا يتجاوز 25 كلمة.
      الجواب يجب أن يكون نص الوصف فقط بدون أي مقدمات.
    `;

    // Using ai.models.generateContent directly with model name and contents.
    // gemini-3-flash-preview is chosen for basic text description tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Directly accessing .text property on GenerateContentResponse as per guidelines.
    return response.text?.trim() || "طبق لذيذ ومميز من قائمتنا.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "وصف تلقائي: طبق مميز ومحضر بعناية من أجود المكونات.";
  }
};