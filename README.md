# InterviewAce 🎯
InterviewAce is a MERN stack application designed to streamline job interview preparation and execution. It supports one-to-one, written, and profile-based interviews, leveraging AI for question generation, speech processing, and advanced analytics for answer evaluation, sentiment, and emotion analysis. The app also includes proctoring insights and interactive visualizations for a comprehensive interview experience.

✨ Features

🔐 Authentication: Secure user authentication with JWT (JSON Web Tokens).
📋 Interview Types:
One-to-one interviews.
Written interviews.
Profile-based interviews with skills and resume analysis (via PDF parsing).


🤖 Question Generation:
Powered by Grok API (llama3-70b-8192 model).
Tailored questions based on role, job type (Full-time/Intern), and mode.
Profile-based interviews incorporate skills and resume data extracted from PDFs.


🎙️ Speech Processing:
Speech-to-text and text-to-speech using the Web Speech API.


👤 Profile Management:
Dedicated page for updating user profiles and personal details.


📜 History and Analysis:
Review past interview answers with detailed performance analysis.


✅ Answer Evaluation:
Uses Hugging Face's sentence-transformers/all-MiniLM-L6-v2 to compute similarity scores between user answers and correct answers.


📊 Text Analysis:
Clarity and sentiment scores for user responses.


😊 Emotion Analysis:
Powered by Hugging Face's dima806/facial_emotions_image_detection model.
Detects primary emotion, confidence score, and emotional context.


🕵️ Proctoring Insights:
Movement detection
Audio volume analysis
Speech clarity evaluation
Background noise detection
Lighting quality


📈 Visualizations:
Bar metric plots and emotion analysis pie charts using plotly.js-dist-min.




🛠️ Prerequisites
Before setting up InterviewAce, ensure you have the following:

Node.js: v14.x or higher
MongoDB: Local instance or cloud (e.g., MongoDB Atlas)
Grok API Key: Obtain from xAI API
Hugging Face API Key: Obtain from Hugging Face
Git: For cloning the repository


⚙️ Setup Instructions

Clone the Repository:
git clone https://github.com/your-username/interviewace.git
cd interviewace


Install Dependencies:

Backend:cd backend
npm install


Frontend:cd ../frontend
npm install




Configure Environment Variables:

Create a .env file in the backend directory with the following:PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
GROK_API_KEY=<your-grok-api-key>
HF_API_KEY=<your-huggingface-api-key>


Replace <your-mongodb-uri>, <your-jwt-secret>, <your-grok-api-key>, and <your-huggingface-api-key> with your actual values.


Start MongoDB:

Ensure your MongoDB instance is running locally or accessible via the MONGO_URI.


Run the Backend:
cd backend
npm start

The backend server will start at http://localhost:5000.

Run the Frontend:
cd frontend
npm start

The frontend will typically run at http://localhost:3000.

Access the Application:

Open your browser and navigate to http://localhost:3000 to start using InterviewAce.



.



