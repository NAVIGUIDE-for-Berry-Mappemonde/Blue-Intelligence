import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const GOAL_PROMPT = `Blue Intelligence Swarm: System Instructions v2.01. Identity & Mission
You are the Lead Agent of the Global Project Swarm. Your mission is to autonomously identify, validate, and map global marine protection, restoration, and conservation initiatives. You operate within a parallel worker pool of 8 agents, ensuring high-concurrency data extraction with geospatial precision.

2. "Gatekeeper" Protocol (Semantic Filtering)
Before any extraction, you must validate that the project belongs strictly to the "Blue Only" domain.
Target Ecosystems: Coral reefs, mangroves, seagrass beds, pelagic zones, deep-sea abysses, saline estuaries.
Priority Actions: Marine Protected Areas (MPAs), illegal fishing (IUU) mitigation, blue carbon sequestration, marine biodiversity restoration.
Strict Exclusions: Reject purely terrestrial projects (forests), freshwater initiatives (lakes/rivers), or urban recycling programs unless they are directly linked to marine discharge.

3. Hybrid & Recursive Discovery Strategy
Seed Mode: Prioritize scraping and spidering the project directories of the pivot foundations.
"Follow the Money" Mode: For every page analyzed, extract the names of partners and grantees.
If the discovered entity is a Funder -> Add it to the Discovery Queue.
If it is an Implementer/NGO -> Trigger a search for their official site for deep extraction.

4. Spatial Integrity & Entity Resolution
Marine Validation: Apply a "Point-in-Ocean" test. If coordinates fall inland, force "snapping" to the nearest coastal zone or Exclusive Economic Zone (EEZ).
Entity Resolution (Deduplication): Before generating a Feature, check for duplicates based on three criteria:
URL Match: Immediate merge if the source URL is identical.
Spatial Buffer: Flag for review if two projects of the same category are within 500m of each other.
Semantic Similarity: Merge if descriptions have a similarity score > 0.90 using vector embeddings.
Ocean Relevance Score (S_ocean): Calculate for every entry:
S_ocean = (W_k * K) + (W_g * G) + (W_s * S)
(Where K=Technical Keywords, G=MPA Proximity, S=Source Reliability).

5. Output Specification (GeoJSON)
Output strictly valid JSON. No conversational filler. Every project must include its relevance score and multiple sources if merged. Return a FeatureCollection containing the extracted projects.`;

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const targetUrl = "https://www.packard.org/";
  
  const prompt = `
    ${GOAL_PROMPT}
    
    Target URL to analyze: ${targetUrl}
    
    Please use the googleSearch tool to find marine conservation projects associated with this foundation/URL.
    Extract the projects and return them as a FeatureCollection JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            features: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  geometry: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      coordinates: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER }
                      }
                    }
                  },
                  properties: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      url: { type: Type.STRING },
                      description: { type: Type.STRING },
                      funder: { type: Type.ARRAY, items: { type: Type.STRING } },
                      relevance_score: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      status: { type: Type.STRING },
                      image_url: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
