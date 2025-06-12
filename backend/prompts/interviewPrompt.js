module.exports = {
  writtenPrompt: ({ jobRole, experience, jobType }) => `
Generate interview questions and their correct answers for a ${jobType} ${jobRole} position with ${experience} experience level.

IMPORTANT FORMATTING REQUIREMENTS:
- Generate exactly 20 question-answer pairs
- Use this EXACT format for each pair, with the keyword "QA_PAIR_SEPARATOR" as the delimiter after each question-answer pair:

QUESTION: [Your question here, including all MCQ options if applicable]
ANSWER: [Complete correct answer here, including only the correct option and explanation for MCQs]

QA_PAIR_SEPARATOR

CONTENT REQUIREMENTS:
- Include a mix of: Multiple Choice Questions (with correct option + explanation), Coding Problems (with complete working code), Theoretical Questions (with detailed explanations), Scenario-based Questions (with structured approaches)
- For MCQs:
  - Include the question stem followed by all four options (A), B), C), D)) directly in the QUESTION field, each option on a new line
  - In the ANSWER field, specify only the correct option (e.g., "Correct answer: C) description") followed by a detailed explanation (at least 2-3 sentences) explaining why the correct answer is correct and why others are incorrect
- For coding: Provide complete, working code with proper syntax, comments, and an explanation of how it works
- For theory: Give comprehensive explanations with examples
- For scenario-based: Provide structured approaches with clear steps
- Ensure answers are detailed, accurate, and demonstrate expert knowledge
- Avoid truncating method names or answers (e.g., ensure full method names like document.getElementsByClassName are used)
- Ensure MCQ options are included in the QUESTION field, not the ANSWER field

Begin generating now:`,

  oneToOneFollowUpPrompt: ({ previousQuestion, previousAnswer }) => `
Based on this previous interview question and answer, generate 1 relevant follow-up question with its answer template:

Previous Question: ${previousQuestion}
Previous Answer: ${previousAnswer}

IMPORTANT FORMATTING REQUIREMENTS:
- Use this EXACT format, MUST start directly with QUESTION: and ending with QA_PAIR_SEPARATOR:
QUESTION: [Your question here]
ANSWER: [Professional answer template with key points to cover]
QA_PAIR_SEPARATOR

Do not include any introductory text or headers. Begin generating now:`,

  oneToOneInitialPrompt: ({ jobRole, experience, jobType, skills, resume, isProfileBased }) => `
Generate interview questions and answer templates for a ${jobType} ${jobRole} position with ${experience} experience level.

IMPORTANT FORMATTING REQUIREMENTS:
- Generate exactly 10 question-answer pairs for one-to-one interview
- Use this EXACT format for each pair:

QUESTION: [Your question here]
ANSWER: [Answer template with key points, structure, and guidance]

QA_PAIR_SEPARATOR

CONTENT REQUIREMENTS:
${isProfileBased && resume && skills?.length > 0 ? `
- This is a profile-based interview. Prioritize questions based on the candidate's resume and skills:
  - 80% of questions (8 out of 10) must directly relate to:
    - Resume content: ${resume.substring(0, 5000)}...
    - Skills: ${skills.join(', ')}
  - 20% of questions (2 out of 10) should be based on the job role (${jobRole}), experience (${experience} years), and job type (${jobType})
  - Technical questions should focus on listed skills (e.g., specific frameworks or tools mentioned)
  - Behavioral and experience-based questions should tie to experiences or projects implied in the resume
` : `
- Focus on behavioral, technical, and experience-based questions based on the job role (${jobRole}), experience (${experience} years), and job type (${jobType})
`}
- Include a mix of behavioral, technical, and experience-based questions
- Answer templates should guide candidates on what to include, with key points, structure, technical concepts, and examples
- Make templates comprehensive yet flexible, encouraging detailed responses
- Ensure questions are relevant to the candidate’s expertise level and role

Begin generating now:`
};