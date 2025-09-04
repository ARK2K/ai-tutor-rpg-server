# AI Tutor RPG – Backend

MERN stack backend for **AI Tutor RPG**, an educational RPG game where learning is disguised as quests.

---

## ⚙️ Tech Stack
- **Node.js + Express** – REST API
- **MongoDB Atlas** – persistent storage
- **Clerk** – authentication & user management
- **LLM Providers** – OpenAI, Gemini, OpenRouter
- **NodeCache** – in-memory caching (swap with Redis in prod)

---

## 📂 Project Structure

backend/
├─ package.json
├─ .env.example
├─ src/
│ ├─ index.js # Express app entry
│ ├─ config/db.js # MongoDB connection
│ ├─ middleware/clerkAuth.js
│ ├─ models/
│ │ ├─ User.js
│ │ └─ Quest.js
│ ├─ routes/
│ │ ├─ llmProxy.js # Server-side LLM proxy
│ │ └─ quests.js # Quest lifecycle routes
│ └─ utils/
│ ├─ cheatDetection.js
│ └─ cache.js
---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
cd backend
npm install