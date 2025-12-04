 Healthcare Symptom Checker (FastAPI + React + MongoDB + Groq)

A full-stack **educational symptom analysis tool** built using:

- **FastAPI** (Python backend)
- **React + TailwindCSS** (frontend)
- **Groq LLM API** (symptom interpretation)
- **MongoDB Atlas** (history storage)

This project provides structured, educational symptom insights including possible conditions, recommendations, urgency level, and disclaimers.  
It is **not a medical diagnostic tool**.


##  Features

 **Backend (FastAPI)**
- Accepts symptom inputs (symptoms, age, gender, duration)
- Calls Groq's `llama-3.1-8b-instant` model with strict JSON instructions
- Normalizes and validates LLM responses safely
- Saves each analysis in MongoDB (`history` collection)
- Provides `/api/history` + delete routes
- Includes CORS support and environment variable loading



 **Frontend (React + Vite + Tailwind)**
- Clean UI for symptom entry
- Loading state + robust error handling
- Displays:
  - Summary
  - Possible conditions with probability tags
  - Recommendations with educational disclaimer
  - Urgency badge
  - Full disclaimer notice
- Dark / Light theme toggle
- History page:
  - Shows past entries with date/time metadata
  - Allows item deletion
  - Handles inconsistent history shapes safely



### **Database (MongoDB Atlas)**
Stored documents follow this structure:

```json
{
  "_id": "...",
  "input": { "symptoms": "...", "age": 25, "gender": "male" },
  "result": { "summary": "...", "conditions": [...], ... },
  "_created_at": "UTC timestamp"
}
```

---

##  Folder Structure

```
Healthcare_System/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env (not committed)
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.tsx
│   │   │   └── History.tsx
│   │   ├── lib/api.ts
│   │   └── components/...
│   ├── index.html
│   └── ...
│
└── README.md
```

---

##  Environment Variables

Backend `.env` :

env
GROQ_API_KEY=your_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/HealthCare
MONGODB_DB=HealthCare


Frontend `.env`:

env
VITE_API_URL=http://localhost:8000


---

## ▶️ Running Locally

Backend**
bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000


Frontend
bash
cd frontend
npm install
npm run dev


Frontend runs on **http://localhost:5173**  
Backend runs on **http://localhost:8000**



##  API Endpoints

| Method | Route              | Description |
|--------|---------------------|-------------|
| POST   | `/api/analyze`      | Run symptom analysis |
| GET    | `/api/history`      | List history |
| DELETE | `/api/history/{id}` | Remove one entry |
| GET    | `/health`           | Health check |



##  Deployment

### Backend
Can be deployed on:
- Render
- Railway
- Fly.io
- Deta Space
- AWS EC2 (manual)

### Frontend
Deploy on:
- Vercel
- Netlify
- Render

Ensure frontend `VITE_API_URL` points to your deployed FastAPI URL.


This system is intended for **educational and informational purposes only**.  
It **must not** be used for professional medical diagnosis or treatment.  
Always consult a licensed healthcare professional for real medical advice.





