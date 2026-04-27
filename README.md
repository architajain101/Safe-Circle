🛡️ SafeCircle
AI-Powered Abuse Detection & Safety Assistant

📌 *Overview*

SafeCircle is an AI-powered web application designed to detect, analyze, and prevent online abuse, scams, and harmful interactions. The platform allows users to submit text, images, or audio evidence and receive real-time risk assessment along with intelligent safety guidance.

Additionally, SafeCircle includes an offline-capable chatbot assistant to provide instant safety advice even without internet connectivity.

*Key Highlights*

- 🧠 AI-driven abuse detection
- ⚡ Real-time analysis
- 📂 Multi-modal input (text, image, audio)
- 🤖 Offline-capable chatbot assistant
- 🔍 Explainable AI results

---

 *Features*

🧠 *AI-Powered Content Analysis*

- Detects:
  - Harassment
  - Threats
  - Scams / Fraud
- Outputs:
  - Abuse Type
  - Severity (Low / Medium / High)
  - Confidence Score

📂 *Multi-Modal Input Support*

- ✍️ Text messages
- 🖼️ Images (OCR + contextual understanding)
- 🔊 Audio (speech-to-text + intent analysis)

---

🤖 *Smart Chatbot (Offline + Online)*

- Provides:
  
  - Safety advice
  - Scam awareness tips
  - Guidance on suspicious situations

- Works in:
  
  - ✅ Online mode (AI-powered responses)
  - ✅ Offline mode (rule-based responses)

👉 Ensures continuous assistance even without internet

 *Explainable AI*

- Explains why content is flagged
- Highlights risky patterns and keywords
- Improves transparency and trust

 *Safety Recommendations*
- Suggests actions such as:
  - Block suspicious users
  - Avoid sharing sensitive data
  - Report incidents

 *Confidence Visualization*

- Displays AI certainty in an intuitive format
- Helps users interpret results effectively

 *System Architecture*

User (Browser)
   ↓
Frontend (React + TypeScript)
   ↓
Backend (Node.js)
   ↓
AI Processing (Gemini)
   ↓
Response (Risk + Explanation)
   
 *Tech Stack*

Frontend: React, TypeScript, Vite
Backend: Node.js
AI Engine:  Gemini API
Chatbot:  AI + Rule-based 
Authentication: Firebase 
Database: Firestore 

*Application Workflow*

1. User submits input (text/image/audio)
2. Data is processed and sent to AI
3. AI analyzes content contextually
4. System generates structured response
5. Results displayed with explanations
6. Chatbot provides additional guidance (online/offline)


 *Use Cases*
- 📱 Personal safety and awareness
- 🚫 Scam detection
- 👩‍🎓 Cyberbullying support
- 👨‍👩‍👧 Parental guidance
- 🌐 Digital literacy improvement

*Unique Selling Proposition (USP)*

«SafeCircle combines multi-modal AI analysis with an offline-capable chatbot, ensuring users receive safety guidance even without internet access.»

*Future Enhancements*

- Advanced offline AI chatbot
- Fake image / deepfake detection
- Community-based reporting system
- Real-time browser integration
- Mobile app version


🧪 Setup & Installation

1. Clone Repository

git clone <repository-url>
cd safecircle

2. Install Dependencies

npm install

3. Configure Environment Variables

Create a ".env" file:

VITE_GEMINI_API_KEY=your_api_key_here

4. Run the Application

npm run dev
