const xlsx = require('xlsx');

const drgData = [
  {
    'Sr Number': 1,
    'Section Name': 'Login Authentication',
    'Switching or Branching Rules': 'IF User Exists AND Password Correct THEN Grant Access; ELSE IF User Not Exists THEN Deny Access; ELSE IF Password Incorrect THEN Deny Access',
    'Validation Rules': 'Email must be in a valid format (e.g., user@domain.com); Password must not be empty.',
    'Error message if validation rules fails': 'Invalid username or password. Please try again.'
  },
  {
    'Sr Number': 2,
    'Section Name': 'User Registration',
    'Switching or Branching Rules': 'IF Age >= 13 AND Email is Unique THEN Create Account; ELSE IF Age < 13 THEN Reject Registration; ELSE IF Email Exists THEN Reject Registration',
    'Validation Rules': 'Date of Birth must indicate user is at least 13 years old; Email must not already exist in the database; Password must be >= 8 characters.',
    'Error message if validation rules fails': 'You must be at least 13 years old to create an account. / Email already in use. / Password is too short.'
  },
  {
    'Sr Number': 3,
    'Section Name': 'Create a Post (News Feed)',
    'Switching or Branching Rules': 'IF (Text Length > 0 OR Media is Attached) AND User is not Restricted THEN Publish Post; ELSE Reject Post Creation',
    'Validation Rules': 'Post content cannot be completely empty; Attached media size must be < 25MB; Text length must not exceed 63,206 characters.',
    'Error message if validation rules fails': 'Your post cannot be empty. / File size exceeds 25MB limit.'
  },
  {
    'Sr Number': 4,
    'Section Name': 'Send Friend Request',
    'Switching or Branching Rules': 'IF Users are NOT already friends AND NOT blocked by each other AND NO pending request exists THEN Send Request; ELSE Prevent Request',
    'Validation Rules': 'Target user ID must exist; Target user must not have max friends limit (5000); Cannot send request to yourself.',
    'Error message if validation rules fails': 'You are already friends. / This user has reached the friend limit. / Request already pending.'
  },
  {
    'Sr Number': 5,
    'Section Name': 'Direct Messaging (Messenger)',
    'Switching or Branching Rules': 'IF Sender and Receiver are friends OR Receiver allows public messages THEN Send Message; ELSE IF Blocked THEN Reject Message',
    'Validation Rules': 'Message text must not be empty; Message cannot contain malicious URLs; Max characters 20,000.',
    'Error message if validation rules fails': 'Message cannot be empty. / You cannot send messages to this user. / Message contains blocked links.'
  },
  {
    'Sr Number': 6,
    'Section Name': 'Update Profile Picture',
    'Switching or Branching Rules': 'IF Image Format is Supported (JPG/PNG) AND Size < Limit THEN Update Avatar; ELSE Reject Image',
    'Validation Rules': 'File must be a .jpg, .jpeg, or .png; File size must be less than 15MB; Image dimensions must be at least 180x180 pixels.',
    'Error message if validation rules fails': 'Unsupported file format. / Image must be at least 180x180 pixels. / File size too large.'
  }
];

const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(drgData);

const wscols = [
  {wch: 12}, // Sr Number
  {wch: 30}, // Section Name
  {wch: 80}, // Switching or Branching Rules
  {wch: 80}, // Validation Rules
  {wch: 50}  // Error message
];
worksheet['!cols'] = wscols;

xlsx.utils.book_append_sheet(workbook, worksheet, 'Facebook BA Requirements');

const fileName = 'Facebook_BA_DRG.xlsx';
xlsx.writeFile(workbook, fileName);

console.log(`Successfully generated ${fileName}`);
