import * as React from "react";
import { useState } from "react";
import {
  Heart,
  AlertTriangle,
  Clock,
  Leaf,
  Activity,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

// little helper types
type Urgency = "emergency" | "urgent" | "routine" | "self-care";
type Probability = "High" | "Medium" | "Low";

interface Condition {
  name: string;
  probability: Probability;
  description: string;
}

interface AnalysisResult {
  summary?: string;
  conditions: Condition[];
  recommendations: string[];
  urgency: Urgency;
  disclaimer: string;
}

// backend url (local fallback)
const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").trim();

// config for urgency UI
const urgencyConfig = {
  emergency: {
    label: "Emergency",
    icon: <AlertTriangle className="w-5 h-5" />,
    className: "bg-emergency text-white",
  },
  urgent: {
    label: "Urgent",
    icon: <Clock className="w-5 h-5" />,
    className: "bg-urgent text-white",
  },
  routine: {
    label: "Routine",
    icon: <Activity className="w-5 h-5" />,
    className: "bg-routine text-white",
  },
  "self-care": {
    label: "Self-Care",
    icon: <Leaf className="w-5 h-5" />,
    className: "bg-self-care text-white",
  },
} as const;

// styles for probability tags
const probabilityStyles: Record<Probability, string> = {
  High: "bg-probability-high/15 text-probability-high border-probability-high/30",
  Medium: "bg-probability-medium/15 text-probability-medium border-probability-medium/30",
  Low: "bg-probability-low/15 text-probability-low border-probability-low/30",
};

export default function Index(): JSX.Element {
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // submit handler (main logic)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          age: age ? parseInt(age) : undefined,
          gender: gender || undefined,
          duration: duration || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Analysis failed");
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.conditions) || !Array.isArray(data.recommendations)) {
        throw new Error("Unexpected response shape from API (mite be json issue)");
      }

      // normalize & keep things tidy
      data.conditions = data.conditions.map((c: any) => ({
        name: c.name || "Unknown",
        probability:
          (c.probability || "Low").toString().trim().charAt(0).toUpperCase() +
          (c.probability || "low").toString().trim().slice(1).toLowerCase(),
        description: c.description || "",
      }));

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Unable to analyze symptoms. Is backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* hero header */}
      <header className="gradient-hero py-16 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-6">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Symptom Checker</h1>
          <p className="text-white/90 text-lg max-w-xl mx-auto">
            Describe your symptoms for educational insights about possible conditions
          </p>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 -mt-8 pb-16">
        {/* form */}
        <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 mb-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Describe your symptoms *</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g., headache, fever for 2 days..."
                className="w-full min-h-[120px] px-4 py-3 rounded-xl border bg-background"
                required
              />
            </div>

            {/* form: age / gender / duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  className="w-full px-4 py-3 rounded-xl border bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border bg-background"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="3 days"
                  className="w-full px-4 py-3 rounded-xl border bg-background"
                />
              </div>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading || !symptoms.trim()}
              className="w-full gradient-hero text-white py-4 px-6 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  Analyze Symptoms <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* errors */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 mb-8">
            {error}
          </div>
        )}

        {/* little summary */}
        {result?.summary && (
          <div className="bg-card rounded-2xl shadow-card p-6 mb-6">
            <p className="text-md font-medium">{result.summary}</p>
          </div>
        )}

        {/* full results */}
        {result && (
          <div className="space-y-6">
            {/* urgency */}
            <div className="flex items-center justify-center">
              <div
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold ${urgencyConfig[result.urgency].className}`}
              >
                {urgencyConfig[result.urgency].icon}
                {urgencyConfig[result.urgency].label} Care Recommended
              </div>
            </div>

            {/* conditions */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Possible Conditions</h2>

              <div className="space-y-3">
                {result.conditions.map((condition, i) => {
                  const safeStyle = probabilityStyles[condition.probability] || probabilityStyles.Low;

                  return (
                    <div key={i} className="p-4 rounded-xl bg-muted/50 border">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{condition.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${safeStyle}`}>
                          {condition.probability}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{condition.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* recommendations */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-semibold mb-4">Recommendations</h2>

              <p className="text-xs text-muted-foreground mb-3 italic">
                These points are for educational purposess only (not a diagnosis).
              </p>

              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* disclaimer */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted border">
              <ShieldCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">{result.disclaimer}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
