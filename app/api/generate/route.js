import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as xlsx from "xlsx";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // 1. Read the Excel File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the Excel file
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Take the first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to CSV format for the LLM to understand easily
    const csvData = xlsx.utils.sheet_to_csv(worksheet);

    if (!csvData || csvData.trim() === "") {
      return NextResponse.json(
        { error: "The uploaded Excel file appears to be empty." },
        { status: 400 }
      );
    }

    // 2. Setup Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Mock mode for local testing if no API key is provided
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

    // 3. Prompt for the AI
    const prompt = `
You are an expert QA Engineer specialized in API testing with the Karate framework.
I am providing you with a Decision Requirements Graph (DRG) represented as CSV data extracted from an Excel sheet. 
Your task is to analyze the columns, branching rules, and conditions in this DRG, and generate all possible Positive and Negative test scenarios.

Here is the CSV data:
\`\`\`csv
${csvData}
\`\`\`

Generate a comprehensive list of test scenarios.
Return the result strictly as a valid JSON array of objects. 
Each object in the array MUST have the following structure:
{
  "type": "positive" | "negative",
  "scenario": "A descriptive name of the test scenario",
  "payload": { ... JSON object representing the API request body based on the rules ... },
  "expectedStatus": 200 | 400 | etc,
  "expectedError": "Optional error message if it is a negative scenario"
}

Do NOT include markdown formatting like \`\`\`json. Return ONLY the raw JSON array.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // 4. Clean up response text (in case LLM adds markdown anyway)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("\`\`\`json")) {
      cleanedText = cleanedText.replace(/^\`\`\`json/, "");
    }
    if (cleanedText.startsWith("\`\`\`")) {
      cleanedText = cleanedText.replace(/^\`\`\`/, "");
    }
    if (cleanedText.endsWith("\`\`\`")) {
      cleanedText = cleanedText.replace(/\`\`\`$/, "");
    }
    cleanedText = cleanedText.trim();

    const jsonResult = JSON.parse(cleanedText);

    return NextResponse.json({ scenarios: jsonResult });

  } catch (error) {
    console.error("Error generating scenarios:", error);
    return NextResponse.json(
      { error: "Failed to generate scenarios. Ensure your Excel file is formatted correctly or check the API logs." },
      { status: 500 }
    );
  }
}
