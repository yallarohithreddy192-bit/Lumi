import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface VoiceChatResponse {
  text: string;
  audioBase64: string | null;
  audioMimeType: string | null;
}

export async function generateVoiceChatResponse(
  history: ChatMessage[], 
  prompt: string, 
  voiceName: string = "Kore",
  languageName: string = "English"
): Promise<VoiceChatResponse> {
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  const systemInstruction = `You are a conversational AI in a live voice call. 
  - ALWAYS respond in ${languageName}.
  - Keep responses extremely concise (1-2 sentences).
  - Be direct and helpful.`;

  contents.push({
    role: "user",
    parts: [{ text: systemInstruction + "\n\nUser: " + prompt }]
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-live-preview", // Correct multimodal model for voice chat
      contents,
      config: {
        responseModalities: ["AUDIO", "TEXT"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const aiText = response.text || "";
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const audioBase64 = part?.inlineData?.data || null;
    const audioMimeType = part?.inlineData?.mimeType || null;

    if (aiText && !audioBase64) {
      const tts = await generateVoiceOver(aiText, voiceName);
      return { text: aiText, audioBase64: tts.audioBase64, audioMimeType: tts.audioMimeType };
    }

    return { text: aiText, audioBase64, audioMimeType };
  } catch (error) {
    console.error("Voice chat error, falling back to sequential:", error);
    const textResponse = await generateChatResponse(history, prompt, languageName);
    const tts = await generateVoiceOver(textResponse, voiceName);
    return { text: textResponse, audioBase64: tts.audioBase64, audioMimeType: tts.audioMimeType };
  }
}

export async function* generateChatResponseStream(history: ChatMessage[], prompt: string, languageName: string = "English", currentImage?: string) {
  const contents = history.map(msg => {
    const parts: any[] = [{ text: msg.content }];
    if (msg.imageUrl && msg.imageUrl.startsWith('data:')) {
      const [mime, data] = msg.imageUrl.split(';base64,');
      parts.push({
        inlineData: {
          mimeType: mime.split(':')[1],
          data: data
        }
      });
    }
    return {
      role: msg.role,
      parts
    };
  });
  
  const userParts: any[] = [{ text: `Respond in ${languageName}. ${prompt}` }];
  if (currentImage && currentImage.startsWith('data:')) {
    const [mime, data] = currentImage.split(';base64,');
    userParts.push({
      inlineData: {
        mimeType: mime.split(':')[1],
        data: data
      }
    });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  const result = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents,
  });

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function generateChatResponse(history: ChatMessage[], prompt: string, languageName: string = "English") {
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  contents.push({
    role: "user",
    parts: [{ text: `Respond in ${languageName}. ${prompt}` }]
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
  });

  return response.text || "";
}

export function generateImage(prompt: string): string {
  // Using Pollinations for HD image generation based on prompt
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
}

export async function detectImageIntent(prompt: string): Promise<boolean> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ 
      parts: [{ text: `Answer with only "true" or "false". Does this prompt request creating, drawing, or generating an image? Prompt: "${prompt}"` }] 
    }],
  });
  return response.text?.trim().toLowerCase() === "true";
}

export interface VoiceOverResponse {
  audioBase64: string | null;
  audioMimeType: string | null;
}

export async function generateVoiceOver(text: string, voiceName: string = "Kore"): Promise<VoiceOverResponse> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview", 
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const audioBase64 = part?.inlineData?.data || null;
    const audioMimeType = part?.inlineData?.mimeType || null;
    return { audioBase64, audioMimeType };
  } catch (error) {
    console.error("TTS generation error:", error);
    return { audioBase64: null, audioMimeType: null };
  }
}
