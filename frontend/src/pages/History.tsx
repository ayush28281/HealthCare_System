import React, { useEffect, useState } from "react";
import { fetchHistory, deleteHistory } from "@/lib/api";

interface Condition {
  name: string;
  probability: string;
  description: string;
}

interface ResultBlock {
  summary?: string;
  recommendations?: string[];
  conditions?: Condition[];
  urgency?: string;
  disclaimer?: string;
  _created_at?: any;
}

interface InputBlock {
  symptoms?: string;
  age?: number | string;
  gender?: string;
}

interface HistoryItem {
  _id?: string;
  input?: InputBlock;
  result?: ResultBlock;
  _created_at?: any;
  created_at?: any;
  createdAt?: any;
  [key: string]: any;
}

// tiny helper to parse dt (sometimes mongodb acts weird lol)
function safeDateFromDoc(doc: any): string {
  const vals = [
    doc?._created_at,
    doc?.created_at,
    doc?.createdAt,
    doc?.result?._created_at,
  ];

  for (const v of vals) {
    if (!v) continue;
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
    if (v?.$date) {
      const d = new Date(v.$date);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
  }

  return "Invalid Date";
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load hist on mount (basic stuff)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchHistory(50, 0);
        const arr = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : data?.items ?? [];
        setItems(arr);
      } catch (e: any) {
        setError(e.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteHistory(id);
      setItems((s) => s.filter((it) => String(it._id) !== String(id)));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-6 text-center">History</h1>

      {loading && <div className="text-center p-4">Loading...</div>}
      {error && <div className="text-center text-red-500 p-4">{error}</div>}

      <div className="space-y-6">
        {items.length === 0 && !loading && (
          <div className="text-center text-muted-foreground">No history found.</div>
        )}

        {items.map((it) => {
          const input = it?.input ?? {};
          const result: ResultBlock = it?.result ?? {};

          const createdAtStr = safeDateFromDoc(it);
          const symptoms = input.symptoms ?? "N/A";
          const age = input.age ?? "N/A";
          const gender = input.gender ?? "N/A";

          const summary = result.summary ?? "";
          const recs = Array.isArray(result.recommendations)
            ? result.recommendations
            : [];

          const id = it._id || "";

          return (
            <div
              key={id}
              className="bg-card rounded-2xl p-6 border border-border shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {createdAtStr}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Age: {age} • Gender: {gender}
                  </div>

                  <div className="font-semibold text-foreground mb-2">
                    {summary || symptoms}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(id)}
                  className="text-sm text-destructive hover:underline"
                >
                  Delete
                </button>
              </div>

              {recs.length > 0 && (
                <ul className="mt-4 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {recs.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}

              {Array.isArray(result.conditions) &&
                result.conditions.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium mb-2">Conditions</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {result.conditions.map((c, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{c.name}</span>
                          {c.probability && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full border">
                              {c.probability}
                            </span>
                          )}
                          <div>{c.description}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
