const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchHistory(limit = 20, skip = 0) {
  const res = await fetch(`${API_URL}/api/history?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function deleteHistory(id: string) {
  const res = await fetch(`${API_URL}/api/history/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}
