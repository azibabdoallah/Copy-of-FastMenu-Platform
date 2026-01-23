import { GoogleGenAI } from "@google/genai";

// Helper to safely get API key without crashing on missing process/env
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const generateDishDescription = async (dishName: string, categoryName: string): Promise<string> => {
  try {
    if (!apiKey) {
      console.warn("API Key is missing. Returning mock response.");
      return "وصف تجريبي: هذا الطبق شهي جداً ومحضر من مكونات طازجة. (يرجى إضافة مفتاح API للحصول على وصف ذكي).";
    }

    const model = 'gemini-3-flash-preview';
    const prompt = `
      اكتب وصفاً قصيراً وشهياً باللغة العربية لطبق طعام في قائمة مطعم.
      اسم الطبق: ${dishName}
      التصنيف: ${categoryName}
      
      اجعل الوصف جذاباً للزبون، لا يتجاوز 25 كلمة.
      الجواب يجب أن يكون نص الوصف فقط بدون أي مقدمات.
    `;

    // Add a timeout to prevent "The request was aborted" or hanging requests if network is flaky
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 8000)
    );
    
    const apiCall = ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    // Race against timeout
    const response: any = await Promise.race([apiCall, timeoutPromise]);

    return response.text?.trim() || "تعذر توليد الوصف حالياً.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return a fallback description instead of throwing
    return "وصف تلقائي: طبق مميز ومحضر بعناية من أجود المكونات.";
  }
};
