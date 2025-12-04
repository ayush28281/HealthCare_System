# backend/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal, Any, Dict
from groq import Groq
from dotenv import load_dotenv
from bson import ObjectId
import os, json, datetime, logging

# optional MongoDB (motor might not exist sometimes)
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except:
    AsyncIOMotorClient = None

load_dotenv()
LOG = logging.getLogger("uvicorn.error")

app = FastAPI(title="Healthcare Symptom Checker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all, easier for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Data models (simple pydantic ones) ----
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


# ---- Groq LLM setup ----
GROQ_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_KEY:
    LOG.warning("Groq key missing, llm wont work :/")

client = Groq(api_key=GROQ_KEY)

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

No markdown, no extra text, no diagnosis plz.
"""


# ---- MongoDB setup ----
mongo_client = None
collection = None

MONGO_URI = os.getenv("MONGODB_URI")

if MONGO_URI and AsyncIOMotorClient:
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db = mongo_client.get_default_database()
        collection = db.get_collection("history")
        LOG.info("MongoDB connected ok.")
    except Exception as e:
        LOG.error(f"MongoDB connection failed: {e}")
        collection = None
else:
    LOG.warning("MongoDB not enabled.")


# ---- small helper ----
def normalize_probability(p: str) -> str:
    if not p:
        return "Low"
    p = p.lower()
    if p.startswith("h"): return "High"
    if p.startswith("m"): return "Medium"
    return "Low"


async def save_history(record: Dict[str, Any]):
    """Just save one entry, simple helper (does nothing if db off)."""
    if collection is None:
        return None
    try:
        record["_created_at"] = datetime.datetime.utcnow()
        res = await collection.insert_one(record)
        return str(res.inserted_id)
    except Exception as e:
        LOG.exception("history save fail: %s", e)
        return None


# ---- Main API endpoint ----
@app.post("/api/analyze", response_model=SymptomAnalysis)
async def analyze_symptoms(input: SymptomInput):
    if not input.symptoms.strip():
        raise HTTPException(status_code=400, detail="Symptoms cannot be empty.")

    user_message = (
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
                {"role": "user", "content": user_message}
            ]
        )
        raw = response.choices[0].message.content
    except Exception as e:
        LOG.error(f"LLM err: {e}")
        raise HTTPException(status_code=500, detail="LLM request failed.")

    try:
        data = json.loads(raw)
    except Exception:
        LOG.error(f"Invalid JSON:\n{raw}")
        raise HTTPException(status_code=500, detail="Bad JSON from AI.")

    # basic safety cleanup
    data["summary"] = data.get("summary") or \
        "Based on these symptoms, here are possible conditions and next steps (educational only)."

    conds = []
    for c in data.get("conditions", []):
        conds.append({
            "name": c.get("name", "Unknown"),
            "probability": normalize_probability(c.get("probability")),
            "description": c.get("description", "")
        })
    data["conditions"] = conds

    recs = data.get("recommendations") or []
    if not isinstance(recs, list):
        recs = [str(recs)]
    data["recommendations"] = recs

    urgency = str(data.get("urgency", "routine")).lower()
    if urgency not in ("emergency", "urgent", "routine", "self-care"):
        urgency = "routine"
    data["urgency"] = urgency

    data["disclaimer"] = data.get("disclaimer") or \
        "This is educational info, not a diagnosis. Pls see a doctor if needed."

    # store record (if db exists)
    await save_history({"input": input.dict(), "result": data})

    return SymptomAnalysis(**data)


# ---- history list ----
@app.get("/api/history")
async def get_history(limit: int = Query(20, ge=1, le=100), skip: int = 0):
    if collection is None:
        return {"count": 0, "items": [], "message": "MongoDB not configured."}

    cursor = collection.find().sort("_created_at", -1).skip(skip).limit(limit)
    out = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        created = doc.get("_created_at")
        if created:
            try:
                doc["_created_at"] = created.isoformat() + "Z"
            except:
                doc["_created_at"] = str(created)
        out.append(doc)

    total = await collection.count_documents({})
    return {"count": total, "items": out}


# ---- delete one ----
@app.delete("/api/history/{item_id}")
async def delete_history(item_id: str):
    if collection is None:
        return {"deleted": False, "message": "MongoDB not configured"}

    try:
        oid = ObjectId(item_id)
        result = await collection.delete_one({"_id": oid})
        if result.deleted_count == 1:
            return {"deleted": True}
        return {"deleted": False, "message": "Not found"}
    except Exception as e:
        return {"deleted": False, "error": str(e)}


@app.get("/health")
async def health():
    return {"status": "ok"}
