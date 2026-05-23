import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { logError } from "@/shared/services/logger";

// Static initialization removed to support dynamic configuration

export const fetchAvailableModels = async (apiKey: string): Promise<string[]> => {
  if (!apiKey) return [];
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (data && data.models) {
      // Filter for 'generateContent' capable models. 
      // Do not restrict to "gemini" name only, as "imagen" or others might also use generateContent now or in future.
      return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace("models/", ""))
        .sort((a: string, b: string) => b.localeCompare(a)); // Sort latest first roughly (higher numbers)
    }
  } catch (error) {
    console.error("Failed to fetch models", error);
  }
  return [];
};

const getSystemInstruction = (permissions: { read: boolean; write: boolean; update: boolean; delete: boolean } = { read: true, write: false, update: false, delete: false }) => {
  const permissionText = permissions.write || permissions.update || permissions.delete
    ? "You have WRITE/UPDATE/DELETE access to the database. You can modify records as requested."
    : "You CANNOT modify the database. If asked to add/update records, politely explain that you are in read-only mode (ask user to enable Write access in settings).";

  return {
    role: "system",
    parts: [{ text: `You are a helpful personal finance assistant integrated into a PWA. 
    You have access to a clean, summarized financial profile of the user's local database.
    
    Your capabilities:
    1. **Analyze**: Answer questions about net worth, spending, assets, etc. based on the provided summarized JSON context.
    
    The provided data context profile contains:
    - holders: Family members / owners of the accounts and assets.
    - accounts: Active bank accounts and wallets.
    - holdings: Current asset holdings (investments like stocks, mutual funds, gold, etc.) mapped to classes/subclasses.
    - liabilities: Active loans with interest rates, amounts, and durations.
    - incomes: Active monthly income sources.
    - cashFlows: Categorized monthly cashflow items (incomes, needs, wants, savings).
    - goals: Target goals and requirements.
    - upcomingExpenses: Outstanding upcoming bills and obligations.
    - insurances: Active insurance policies.
    
    ${permissionText}

    Current Date: ${new Date().toLocaleDateString()}
    ` }]
  };
};

export interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
}

export const sendMessageToAI = async (
  history: ChatMessage[],
  newMessage: string,
  dataContext: any,
  apiKey: string,
  modelName: string,
  permissions: { read: boolean; write: boolean; update: boolean; delete: boolean }
): Promise<{ text: string; images?: string[]; toolCalls?: any[] }> => {
  if (!apiKey) {
    return { text: "Error: API Key is missing. Please configure it in settings." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName || "gemini-2.0-flash-exp",
        systemInstruction: getSystemInstruction(permissions)
        // Tools removed as requested
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Here is my current financial data context: " + JSON.stringify(dataContext) }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I have loaded your financial data. How can I help you today?" }],
        },
        ...history
      ],
    });

    const result = await chat.sendMessage(newMessage);
    const response = await result.response;
    
    // Check for tool calls
    const toolCalls = response.functionCalls();
    const text = response.text();
    
    // Extract inline images from ALL candidates and ALL parts
    const images: string[] = [];
    if (response.candidates) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
              images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }
      }
    }

    // Log response for debugging versatility
    console.log("AI Response:", response);

    return {
      text,
      images: images.length > 0 ? images : undefined,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined
    };
  } catch (error) {
    logError("AI Processing Error", { error });
    return { text: "Sorry, I encountered an error while processing your request." };
  }
};
