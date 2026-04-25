import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    const { excelData, jsonPreferences, templateContent, templateFileName } = await request.json();

    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return NextResponse.json(
        { error: "No valid Excel data provided" },
        { status: 400 }
      );
    }

    // 1. Convert 2D array to CSV format
    const csvData = excelData.map(row =>
      row.map(cell => {
        let cellStr = String(cell || "");
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          cellStr = `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    if (!csvData || csvData.trim() === "") {
      return NextResponse.json(
        { error: "The provided Excel data appears to be empty." },
        { status: 400 }
      );
    }

    // 2. Setup Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found. Returning mock data.");
      return NextResponse.json({
        scenarios: [
          {
            type: "positive",
            scenario: "Valid user input with standard parameters",
            payload: { age: 30, income: 50000, creditScore: 700 },
            expectedStatus: 200
          },
          {
            type: "negative",
            scenario: "Missing required age parameter",
            payload: { income: 50000, creditScore: 700 },
            expectedStatus: 400,
            expectedError: "Age is required"
          }
        ]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. Build optional prompt sections
    let preferencesSection = "";
    if (jsonPreferences && jsonPreferences.trim() !== "") {
      preferencesSection = `
User's Output Structure Preferences:
\`\`\`
${jsonPreferences}
\`\`\`
Please ensure the "payload" objects strictly follow these preferences.
`;
    }

    let templateSection = "";
    if (templateContent && templateContent.trim() !== "") {
      templateSection = `
The user has provided a Template Datasheet file named "${templateFileName}".
Your generated "payload" objects MUST EXACTLY match the structure, format, and keys/columns present in this template.
Analyze the DRG conditions and map the resulting scenario values to the corresponding columns/keys defined in this template file.

Template File Content:
\`\`\`
${templateContent}
\`\`\`
`;
    }

    const prompt = `You are an expert QA Engineer specialized in API testing with the Karate framework.
I am providing you with a Decision Requirements Graph (DRG) represented as CSV data extracted from an Excel sheet.
Your task is to analyze the columns, branching rules, and conditions in this DRG, and create ALL possible positive, negative, and branching scenarios. Do not omit any branch or edge case.

Here is the DRG CSV data:
\`\`\`csv
${csvData}
\`\`\`
${preferencesSection}
${templateSection}

Generate a comprehensive list of test scenarios. Consider every branch and edge case indicated by the DRG.
Return the result strictly as a valid JSON array of objects.
Each object in the array MUST have the following structure:
{
  "type": "positive" | "negative",
  "scenario": "A descriptive name of the test scenario",
  "payload": { ... JSON object representing the API request body based on the DRG rules and mapped to the Template keys ... },
  "expectedStatus": 200 | 400 | etc,
  "expectedError": "Optional error message if it is a negative scenario"
}

Do NOT include markdown formatting like \`\`\`json. Return ONLY the raw JSON array.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. Clean up response text
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    const jsonResult = JSON.parse(cleanedText);

    return NextResponse.json({ scenarios: jsonResult });

  } catch (error) {
    console.error("Error generating scenarios:", error);
    return NextResponse.json(
      { error: "Failed to generate scenarios. Ensure your data is formatted correctly or check the API logs." },
      { status: 500 }
    );
  }
}
