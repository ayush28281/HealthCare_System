# backend/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal, Any, Dict
from groq import Client  # ← IMPORTANT FIX

from dotenv import load_dotenv
from bson import ObjectId
import os
import json
import datetime
import logging

# Optional MongoDB
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except:
    AsyncIOMotorClient = None

load_dotenv()
LOG = logging.getLogger("uvicorn.error")

app = FastAPI(title="Healthcare Symptom Checker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------- Data Models ----------------------------

class SymptomInput(BaseModel):
    symptoms: str
    age: Optional[int] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    duration: Optional[str] = None

class Condition(BaseModel):
    name: str
    probability: Literal["High", "Medium", "Low"]
    description: str

class SymptomAnalysis(BaseModel):
    summary: str
    conditions: List[Condition]
    recommendations: List[str]
    urgency: Literal["emergency", "urgent", "routine", "self-care"]
    disclaimer: str


# ---------------------------- Groq Setup ----------------------------

GROQ_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_KEY:
    LOG.warning("Groq key missing; LLM will not function.")

client = Client(api_key=GROQ_KEY)  # FIXED


SYSTEM_PROMPT = """
You are a medical symptom analysis assistant.
Return ONLY JSON.

Start with:
"Based on these symptoms, here are possible conditions and next steps (educational only)."

{
  "summary": "string",
  "conditions": [
    {"name": "string", "probability": "High | Medium | Low", "description": "string"}
  ],
  "recommendations": ["string"],
  "urgency": "emergency | urgent | routine | self-care",
  "disclaimer": "string"
}

No markdown, no extra text.
"""


# ---------------------------- MongoDB ----------------------------

mongo_client = None
collection = None

MONGO_URI = os.getenv("MONGODB_URI")

if MONGO_URI and AsyncIOMotorClient:
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db = mongo_client.get_default_database()
        collection = db.get_collection("history")
        LOG.info("MongoDB connected.")
    except Exception as e:
        LOG.error(f"MongoDB connection failed: {e}")
        collection = None
else:
    LOG.warning("MongoDB disabled.")


def normalize_probability(p: str) -> str:
    if not p:
        return "Low"
    p = p.lower()
    if p.startswith("h"): return "High"
    if p.startswith("m"): return "Medium"
    return "Low"


async def save_history(record: Dict[str, Any]):
    if collection is None:
        return None
    try:
        record["_created_at"] = datetime.datetime.utcnow()
        res = await collection.insert_one(record)
        return str(res.inserted_id)
    except Exception as e:
        LOG.exception("History save failed: %s", e)
        return None


# ---------------------------- Analyze API ----------------------------

@app.post("/api/analyze", response_model=SymptomAnalysis)
async def analyze_symptoms(input: SymptomInput):
    if not input.symptoms.strip():
        raise HTTPException(status_code=400, detail="Symptoms cannot be empty.")

    user_msg = (
        f"Symptoms: {input.symptoms}\n"
        f"Age: {input.age}\n"
        f"Gender: {input.gender}\n"
        f"Duration: {input.duration}"
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ]
        )
        raw = response.choices[0].message.content
    except Exception as e:
        LOG.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="AI request failed.")

    try:
        data = json.loads(raw)
    except Exception:
        LOG.error(f"Invalid JSON received:\n{raw}")
        raise HTTPException(status_code=500, detail="Bad JSON from AI.")

    # cleanup
    data["summary"] = data.get("summary") or "Based on these symptoms..."
    data["conditions"] = [
        {
            "name": c.get("name", "Unknown"),
            "probability": normalize_probability(c.get("probability")),
            "description": c.get("description", "")
        }
        for c in data.get("conditions", [])
    ]

    recs = data.get("recommendations", [])
    data["recommendations"] = recs if isinstance(recs, list) else [str(recs)]

    urgency = str(data.get("urgency", "routine")).lower()
    data["urgency"] = urgency if urgency in ("emergency", "urgent", "routine", "self-care") else "routine"

    data["disclaimer"] = data.get("disclaimer") or "Educational only."

    # store in DB
    await save_history({"input": input.dict(), "result": data})

    return SymptomAnalysis(**data)


# ---------------------------- History APIs ----------------------------

@app.get("/api/history")
async def get_history(limit: int = Query(20, ge=1, le=100), skip: int = 0):
    if collection is None:
        return {"count": 0, "items": [], "message": "MongoDB not active."}

    cursor = collection.find().sort("_created_at", -1).skip(skip).limit(limit)
    items = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        created = doc.get("_created_at")
        if created:
            doc["_created_at"] = created.isoformat() + "Z"
        items.append(doc)

    total = await collection.count_documents({})
    return {"count": total, "items": items}


@app.delete("/api/history/{item_id}")
async def delete_history(item_id: str):
    if collection is None:
        return {"deleted": False}

    try:
        result = await collection.delete_one({"_id": ObjectId(item_id)})
        return {"deleted": result.deleted_count == 1}
    except Exception as e:
        return {"deleted": False, "error": str(e)}


@app.get("/health")
async def health():
    return {"status": "ok"}
