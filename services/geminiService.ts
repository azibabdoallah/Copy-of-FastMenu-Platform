import { GoogleGenAI } from "@google/genai";

/**
 * generateDishDescription uses the Google GenAI SDK to write catchy menu descriptions.
 */
export const generateDishDescription = async (dishName: string, categoryName: string): Promise<string> => {
  try {
    // Correct initialization strictly from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // gemini-3-flash-preview is ideal for basic text tasks like description generation
    const model = 'gemini-3-flash-preview';
    const prompt = `
      اكتب وصفاً قصيراً وشهياً باللغة العربية لطبق طعام في قائمة مطعم.
      اسم الطبق: ${dishName}
      التصنيف: ${categoryName}
      
      اجعل الوصف جذاباً للزبون، لا يتجاوز 25 كلمة.
      الجواب يجب أن يكون نص الوصف فقط بدون أي مقدمات.
    `;

    // generateContent call structure updated to match standard request parameters.
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    // response.text is a property, not a method.
    return response.text || "طبق لذيذ ومميز من قائمتنا.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "وصف تلقائي: طبق مميز ومحضر بعناية من أجود المكونات.";
  }
};