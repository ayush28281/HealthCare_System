#Mongo Connection
mongo_client = None
collection = None

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "HealtheCare")

if MONGO_URI and AsyncIOMotorClient:
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db = mongo_client[DB_NAME]         
        collection = db["history"]         
        LOG.info(f" MONGOB connected: DB = {DB_NAME}, collection = history")
    except Exception as e:
        LOG.error(f" MongoDB connection failed: {e}")
        mongo_client = None
        collection = None
else:
    LOG.warning("⚠ MongoDB disabled. Set MONGODB_URI to enable history saving.")
