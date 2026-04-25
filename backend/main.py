import os
import json
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(title="DRG Scenario Generator API")

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    excelData: List[List[str]]
    jsonPreferences: Optional[str] = ""
    templateContent: Optional[str] = None
    templateFileName: Optional[str] = None


def rows_to_csv(excel_data: List[List[str]]) -> str:
    """Convert a 2D list of rows/cells to a CSV string."""
    lines = []
    for row in excel_data:
        csv_cells = []
        for cell in row:
            cell_str = str(cell) if cell is not None else ""
            if "," in cell_str or '"' in cell_str or "\n" in cell_str:
                cell_str = '"' + cell_str.replace('"', '""') + '"'
            csv_cells.append(cell_str)
        lines.append(",".join(csv_cells))
    return "\n".join(lines)


def clean_llm_response(text: str) -> str:
    """Strip markdown code fences the LLM may add around JSON."""
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


MOCK_SCENARIOS = [
    {
        "type": "positive",
        "scenario": "Valid user input with standard parameters",
        "payload": {"age": 30, "income": 50000, "creditScore": 700},
        "expectedStatus": 200,
    },
    {
        "type": "negative",
        "scenario": "Missing required age parameter",
        "payload": {"income": 50000, "creditScore": 700},
        "expectedStatus": 400,
        "expectedError": "Age is required",
    },
]


@app.post("/generate")
async def generate_scenarios(req: GenerateRequest):
    # Validate input
    if not req.excelData or len(req.excelData) == 0:
        raise HTTPException(status_code=400, detail="No valid Excel data provided")

    csv_data = rows_to_csv(req.excelData)

    if not csv_data.strip():
        raise HTTPException(status_code=400, detail="The provided Excel data appears to be empty.")

    # Use mock if no API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: No GEMINI_API_KEY found. Returning mock data.")
        return {"scenarios": MOCK_SCENARIOS}

    # Build optional prompt sections
    preferences_section = ""
    if req.jsonPreferences and req.jsonPreferences.strip():
        preferences_section = f"""
User's Output Structure Preferences:
```
{req.jsonPreferences}
```
Please ensure the "payload" objects strictly follow these preferences.
"""

    template_section = ""
    if req.templateContent and req.templateContent.strip():
        template_section = f"""
The user has provided a Template Datasheet file named "{req.templateFileName}".
Your generated "payload" objects MUST EXACTLY match the structure, format, and keys/columns present in this template.
Analyze the DRG conditions and map the resulting scenario values to the corresponding columns/keys defined in this template file.

Template File Content:
```
{req.templateContent}
```
"""

    prompt = f"""You are an expert QA Engineer specialized in API testing with the Karate framework.
I am providing you with a Decision Requirements Graph (DRG) represented as CSV data extracted from an Excel sheet.
Your task is to analyze the columns, branching rules, and conditions in this DRG, and create ALL possible positive, negative, and branching scenarios. Do not omit any branch or edge case.

Here is the DRG CSV data:
```csv
{csv_data}
```
{preferences_section}
{template_section}

Generate a comprehensive list of test scenarios. Consider every branch and edge case indicated by the DRG.
Return the result strictly as a valid JSON array of objects.
Each object in the array MUST have the following structure:
{{
  "type": "positive" | "negative",
  "scenario": "A descriptive name of the test scenario",
  "payload": {{ ... JSON object representing the API request body based on the DRG rules and mapped to the Template keys ... }},
  "expectedStatus": 200 | 400 | etc,
  "expectedError": "Optional error message if it is a negative scenario"
}}

Do NOT include markdown formatting like ```json. Return ONLY the raw JSON array.
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        cleaned = clean_llm_response(response.text)
        scenarios = json.loads(cleaned)
        return {"scenarios": scenarios}
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON. Please try again. Error: {str(e)}",
        )
    except Exception as e:
        print(f"Error generating scenarios: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate scenarios. Error: {str(e)}",
        )


@app.get("/health")
async def health_check():
    return {"status": "ok"}
