const xlsx = require('xlsx');
const fs = require('fs');

// Define the DRG rules for a Facebook Login API
const drgData = [
  {
    Rule_ID: 'R1',
    Condition_Email: 'valid.user@facebook.com',
    Condition_Password: 'ValidPassword123!',
    Outcome_Status: 200,
    Outcome_Message: 'Login Successful',
    Expected_Scenario_Type: 'positive'
  },
  {
    Rule_ID: 'R2',
    Condition_Email: 'invalid-email-format',
    Condition_Password: 'ValidPassword123!',
    Outcome_Status: 400,
    Outcome_Message: 'Invalid email format',
    Expected_Scenario_Type: 'negative'
  },
  {
    Rule_ID: 'R3',
    Condition_Email: 'valid.user@facebook.com',
    Condition_Password: 'wrong_password',
    Outcome_Status: 401,
    Outcome_Message: 'Incorrect password',
    Expected_Scenario_Type: 'negative'
  },
  {
    Rule_ID: 'R4',
    Condition_Email: '',
    Condition_Password: 'ValidPassword123!',
    Outcome_Status: 400,
    Outcome_Message: 'Email is required',
    Expected_Scenario_Type: 'negative'
  },
  {
    Rule_ID: 'R5',
    Condition_Email: 'valid.user@facebook.com',
    Condition_Password: '',
    Outcome_Status: 400,
    Outcome_Message: 'Password is required',
    Expected_Scenario_Type: 'negative'
  }
];

// Create a new workbook and worksheet
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(drgData);

// Set column widths for better readability in Excel
const wscols = [
  {wch: 10}, // Rule_ID
  {wch: 30}, // Condition_Email
  {wch: 25}, // Condition_Password
  {wch: 15}, // Outcome_Status
  {wch: 25}, // Outcome_Message
  {wch: 25}  // Expected_Scenario_Type
];
worksheet['!cols'] = wscols;

// Append worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Facebook Login DRG');

// Write the Excel file
const fileName = 'Facebook_Login_DRG.xlsx';
xlsx.writeFile(workbook, fileName);

console.log(`Successfully generated ${fileName}`);
