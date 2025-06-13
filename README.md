# 🎯 InterviewAce

**InterviewAce** is a full-stack MERN application designed to streamline job interview preparation and execution. It supports one-to-one, written, and profile-based interviews, leveraging AI for question generation, speech processing, and advanced analytics for answer evaluation, sentiment, and emotion analysis.

---

## ✨ Features

### 🔐 Authentication
- Secure user authentication with **JWT (JSON Web Tokens)**

### 📋 Interview Types
- One-to-One Interviews  
- Written Interviews  
- Profile-Based Interviews (includes resume and skills analysis via PDF parsing)

### 🤖 Question Generation
- Powered by **Groq API** (`llama3-70b-8192` model)
- Tailored questions based on:
  - Job role
  - Job type (Full-Time / Intern)
  - Interview mode
- Additionally, Profile-based interviews utilize parsed resume and skills

### 🎙️ Speech Processing
- Speech-to-text and text-to-speech with **Web Speech API**

### 👤 Profile Management
- Dedicated page for user profile updates and career goals

### 📜 History and Analysis
- Review past interview answers
- Detailed performance breakdown and analytics

### ✅ Answer Evaluation
- Similarity scoring using **Hugging Face** `sentence-transformers/all-MiniLM-L6-v2`

### 📊 Text Analysis
- Clarity scoring
- Sentiment analysis of responses

### 😊 Emotion Analysis
- Facial emotion detection via `dima806/facial_emotions_image_detection`
- Provides:
  - Primary emotion
  - Confidence score
  - Emotional context

### 🕵️ Proctoring Insights
- Movement detection
- Audio volume monitoring
- Speech clarity evaluation
- Background noise detection
- Lighting quality assessment

### 📈 Visualizations
- Metrics bar plots and emotion pie charts using **Plotly.js**

---

## 🛠️ Prerequisites

Make sure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **API Keys**:
  - Groq API Key from [Groq](https://console.groq.com/keys)
  - Hugging Face API Key from [Hugging Face](https://huggingface.co/)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/interviewace.git
cd interviewace
```

### 2. Install Dependencies
**Backend:**
```bash
cd backend
npm install
```
**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables
Create a .env file in the backend directory with the following:
```env
PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
GROK_API_KEY=<your-grok-api-key>
HF_API_KEY=<your-huggingface-api-key>
```

### 4. Start MongoDB
Ensure your MongoDB instance is running locally or accessible via MONGO_URI.

### 5. Run the Application
**Backend:**
```bash
cd backend
node server.js
```
Runs at http://localhost:5000

**Frontend:**
```bash
cd ../frontend
npm start
```
Runs at http://localhost:3000

## 🌐 Access the App
Visit http://localhost:3000 to use InterviewAce
