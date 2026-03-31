import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
const ai = new GoogleGenAI({ apiKey });

export const evaluateResume = async (resumeText: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the following information from this resume in JSON format:
    - Skills (array of strings)
    - Experience (total years as a number)
    - Projects (number of significant projects)
    - Education (highest degree)
    - Summary (brief 2-sentence summary)
    - QualityScore (1-10 based on presentation and content)

    Resume Text:
    ${resumeText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.NUMBER },
          projects: { type: Type.NUMBER },
          education: { type: Type.STRING },
          summary: { type: Type.STRING },
          qualityScore: { type: Type.NUMBER }
        },
        required: ["skills", "experience", "projects", "qualityScore"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateInterviewQuestions = async (candidateData: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 3 specific technical interview questions for a candidate with the following profile:
    Skills: ${candidateData.skills?.join(", ")}
    Experience: ${candidateData.experience} years
    Summary: ${candidateData.summary}

    Return as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
};
