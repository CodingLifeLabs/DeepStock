import { GoogleGenAI } from "@google/genai";
import { StockData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchStockAnalysis = async (ticker: string): Promise<StockData> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // We use a prompt that forces the model to output JSON within a code block 
    // after performing a Google Search.
    const prompt = `
      I need real-time market data for the stock ticker "${ticker}".
      
      Using Google Search, find the following information:
      1. The exact current stock price.
      2. The currency of the stock (e.g., USD, KRW).
      3. The company name.
      4. The 52-week high price (or All-Time High if 52-week is not clear, prefer 52-week).
      5. The current 14-day Relative Strength Index (RSI) value.
      6. A sequence of estimated 14-day RSI values for the last 7 trading days (including today) to visualize the trend. If exact daily historical RSI data is not found in search snippets, ESTIMATE these 7 values based on the stock's recent price action.
      7. A sequence of monthly closing prices for the last 12 months to visualize the 1-year trend. Provide roughly 12 data points with format { "date": "YYYY-MM", "price": Number }. If exact monthly data table is not found, estimate the points based on the general 1-year chart trend found in search results.
      
      Output the result strictly as a JSON object inside a markdown code block (\`\`\`json ... \`\`\`).
      The JSON structure must be:
      {
        "ticker": "${ticker}",
        "companyName": "String",
        "currentPrice": Number,
        "currency": "String",
        "highPrice": Number,
        "highType": "String (e.g., '52-Week' or 'ATH')",
        "rsi": NumberOrNull,
        "rsiHistory": [Number, Number, ...],
        "priceHistory": [{ "date": "YYYY-MM", "price": Number }, ...]
      }
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType and responseSchema are NOT allowed with googleSearch
      },
    });

    const text = response.text || "";
    
    // Extract sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: string[] = chunks
      .map((chunk: any) => chunk.web?.uri)
      .filter((uri: any): uri is string => typeof uri === 'string');

    // Parse JSON from the text response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error("Failed to parse structured data from AI response.");
    }

    const data = JSON.parse(jsonMatch[1]);

    return {
      ticker: data.ticker.toUpperCase(),
      companyName: data.companyName,
      currentPrice: Number(data.currentPrice),
      currency: data.currency,
      highPrice: Number(data.highPrice),
      highType: data.highType,
      rsi: data.rsi,
      rsiHistory: Array.isArray(data.rsiHistory) ? data.rsiHistory : [],
      priceHistory: Array.isArray(data.priceHistory) ? data.priceHistory : [],
      lastUpdated: new Date().toLocaleTimeString(),
      sources: [...new Set(sources)].slice(0, 5) // Unique sources, max 5
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};