import { GoogleGenAI } from "@google/genai";

const FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];

export async function callGeminiAI(prompt: string, apiKey: string, model?: string, fallbackIndex = 0): Promise<string | null> {
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key trong phần cài đặt!');
  }

  const modelName = model || FALLBACK_MODELS[fallbackIndex] || FALLBACK_MODELS[0];

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    return response.text || '';
  } catch (error: any) {
    console.error(`Error with model ${modelName}:`, error);
    
    // Check for rate limit or other errors that might warrant a fallback
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('quota');
    const isModelError = error?.message?.includes('not found') || error?.message?.includes('500');

    if ((isRateLimit || isModelError) && fallbackIndex < FALLBACK_MODELS.length - 1) {
      console.log(`Falling back to next model: ${FALLBACK_MODELS[fallbackIndex + 1]}...`);
      return callGeminiAI(prompt, apiKey, FALLBACK_MODELS[fallbackIndex + 1], fallbackIndex + 1);
    }
    
    throw error;
  }
}

export const generateMathHintPrompt = (question: string) => `
Bạn là Trạng Nguyên, một chú bạch tuộc thông minh và thân thiện, chuyên gia dạy toán cho học sinh lớp 6-9.
Học sinh đang gặp khó khăn với câu hỏi sau: "${question}"

Hãy cung cấp một GỢI Ý TƯ DUY (không giải trực tiếp ngay lập tức) để giúp học sinh tự tìm ra câu trả lời.
Phong cách: Vui vẻ, khích lệ, sử dụng các thuật ngữ toán học chính xác nhưng dễ hiểu.
Sử dụng LaTeX cho công thức toán học (ví dụ: $x^2$).
Trả lời bằng tiếng Việt.
`;

export const generateMathSolutionPrompt = (question: string) => `
Bạn là Trạng Nguyên, chú bạch tuộc giỏi toán. Hãy giải chi tiết bài toán sau: "${question}"

Yêu cầu:
1. Giải thích từng bước một cách logic.
2. Nêu rõ các kiến thức/công thức đã sử dụng.
3. Trình bày đẹp mắt, dễ đọc.
4. Sử dụng LaTeX cho tất cả công thức toán học.
5. Kết thúc bằng một lời khen ngợi hoặc khích lệ học sinh.
Trả lời bằng tiếng Việt.
`;
