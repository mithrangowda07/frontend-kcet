import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { branchService, reviewService, meetingService } from "../services/api";
import StarRating from "../components/StarRating";
import CustomTooltip from "../components/charts/CustomTooltip";
import type { Branch, Review, BranchInsightsResponse } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import BranchInsightsModal from "../components/BranchInsightsModal";

type BranchCutoffResponse = {
  categories?: Record<
    string,
    Record<
      string,
      { r1?: number | string; r2?: number | string; r3?: number | string }
    >
  >;
  // Optional fallback chain returned by backend
  fall_back?: Record<string, string[]>;
};

type RoundKey = "r1" | "r2" | "r3";

type RoundStat = {
  round: RoundKey;
  avg: number;
  latest: number;
  trend: number;
  coverage: number;
};

type SeatPrediction = {
  probability: number;
  level: "High" | "Medium" | "Low";
  round: string;
  effectiveCategory: string;
  explanation: string;
  usedCutoff: number;
};

// Fallback chains
const FALLBACK_ORDER: Record<string, string[]> = {
  "1R": ["1R", "1G", "GM"],
  "1K": ["1K", "1G", "GM"],
  "1G": ["1G", "GM"],

  "2AR": ["2AR", "2AG", "GM"],
  "2AK": ["2AK", "2AG", "GM"],
  "2AG": ["2AG", "GM"],
  "2BR": ["2BR", "2BG", "GM"],
  "2BK": ["2BK", "2BG", "GM"],
  "2BG": ["2BG", "GM"],

  "3AK": ["3AK", "3AG", "GM"],
  "3AR": ["3AR", "3AG", "GM"],
  "3AG": ["3AG", "GM"],
  "3BK": ["3BK", "3BG", "GM"],
  "3BR": ["3BR", "3BG", "GM"],
  "3BG": ["3BG", "GM"],

  STK: ["STK", "STG", "GM"],
  STR: ["STR", "STG", "GM"],
  STG: ["STG", "GM"],

  SCK: ["SCK", "SCG", "GM"],
  SCR: ["SCR", "SCG", "GM"],
  SCG: ["SCG", "GM"],

  GMR: ["GMR", "GM"],
  GMK: ["GMK", "GM"],

  GM: ["GM"],
};

const ROUND_WEIGHTS: Record<RoundKey, number> = {
  r1: 0.86,
  r2: 0.94,
  r3: 1.05,
};

const OLLAMA_MODEL = "kcet-advisor";

const normalizeCutoffValue = (value?: number | string | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const roundKeyLabel: Record<RoundKey, string> = {
  r1: "R1",
  r2: "R2",
  r3: "R3",
};

const computeRoundStats = (
  categoryData?: Record<string, { r1?: any; r2?: any; r3?: any }>
): RoundStat[] => {
  if (!categoryData) return [];

  const years = ["2025", "2024", "2023", "2022"];
  const rounds: RoundKey[] = ["r1", "r2", "r3"];

  return rounds.map((round) => {
    const values = years.map((y) =>
      normalizeCutoffValue(categoryData?.[y]?.[round])
    );
    const coverage = values.filter(Boolean).length;
    const avg =
      coverage > 0 ? values.reduce((sum, v) => sum + v, 0) / coverage : 0;
    const latest =
      normalizeCutoffValue(categoryData?.["2025"]?.[round]) ||
      normalizeCutoffValue(categoryData?.["2024"]?.[round]) ||
      0;

    const prev = normalizeCutoffValue(categoryData?.["2024"]?.[round]);
    const trend = latest && prev ? (latest - prev) / Math.max(prev, 1) : 0;

    return { round, avg, latest, trend, coverage };
  });
};

const chanceLevel = (prob: number): SeatPrediction["level"] => {
  if (prob >= 0.7) return "High";
  if (prob >= 0.4) return "Medium";
  return "Low";
};

const computeFallbackChain = (
  category: string,
  backendFallBack?: Record<string, string[]>
) => {
  if (backendFallBack?.[category]?.length) return backendFallBack[category];
  return FALLBACK_ORDER[category] || [category, "GM"];
};

const scoreProbability = (
  rank: number,
  stat: RoundStat,
  fallbackIndex: number
) => {
  if (!stat.avg) return 0;
  const closeness = Math.max(0, 1 - Math.abs(rank - stat.avg) / stat.avg);
  const advantage = rank <= stat.avg ? 0.58 : 0.3;
  const trendBoost =
    stat.trend > 0
      ? 1 + Math.min(0.12, stat.trend)
      : 1 - Math.min(0.1, Math.abs(stat.trend));
  const fallbackPenalty = Math.max(0.7, 1 - fallbackIndex * 0.08);

  const prob =
    (advantage + 0.42 * closeness) *
    ROUND_WEIGHTS[stat.round] *
    trendBoost *
    fallbackPenalty;
  return Math.max(0, Math.min(1, prob));
};

const pickBestOutcome = (
  rank: number,
  category: string,
  cutoff: BranchCutoffResponse | null
): SeatPrediction | null => {
  if (!cutoff?.categories) return null;
  const chain = computeFallbackChain(category, cutoff.fall_back);

  let best: SeatPrediction | null = null;
  chain.forEach((cat, idx) => {
    const stats = computeRoundStats(cutoff.categories?.[cat]);
    stats.forEach((stat) => {
      const probability = scoreProbability(rank, stat, idx);
      if (!best || probability > best.probability) {
        const effectiveCategory = cat;
        best = {
          probability,
          level: chanceLevel(probability),
          round: roundKeyLabel[stat.round],
          effectiveCategory,
          usedCutoff: stat.latest || stat.avg,
          explanation: `Using ${effectiveCategory} fall-back and ${
            roundKeyLabel[stat.round]
          }, historical avg cutoff is ${Math.round(stat.avg || stat.latest)}.`,
        };
      }
    });
  });
  return best;
};

const buildDecisionFromData = (
  category: string,
  cutoff: BranchCutoffResponse | null
): {
  recommendedRank: number;
  round: string;
  fallbackCategory: string;
  competition: "Low" | "Medium" | "High";
  confidence: number;
  probability: number;
} | null => {
  if (!cutoff?.categories) return null;

  const chain = computeFallbackChain(category, cutoff.fall_back);
  let bestStat: { stat: RoundStat; cat: string } | null = null;

  for (const cat of chain) {
    const stats = computeRoundStats(cutoff.categories?.[cat]);
    for (const stat of stats) {
      const weighted = (stat.latest || stat.avg) * ROUND_WEIGHTS[stat.round];
      const currentWeighted = bestStat
        ? (bestStat.stat.latest || bestStat.stat.avg) *
          ROUND_WEIGHTS[bestStat.stat.round]
        : -Infinity;
      if (!bestStat || weighted > currentWeighted) {
        bestStat = { stat, cat };
      }
    }
  }

  if (!bestStat) return null;

  const { stat, cat } = bestStat as { stat: RoundStat; cat: string };
  const roundKey: RoundKey = stat.round;
  const baselineRank = stat.latest || stat.avg;
  const confidenceBase = 50 + stat.coverage * 10 + (stat.trend > 0 ? 8 : 0);
  const probability = Math.min(
    1,
    0.65 * ROUND_WEIGHTS[roundKey] + (stat.trend > 0 ? 0.08 : -0.04)
  );
  const confidence = Math.max(40, Math.min(98, confidenceBase));

  return {
    recommendedRank: Math.round(baselineRank ? baselineRank * 0.98 : 0),
    round: roundKeyLabel[roundKey],
    fallbackCategory: cat,
    competition:
      chanceLevel(probability) === "High"
        ? "Low"
        : chanceLevel(probability) === "Low"
        ? "High"
        : "Medium",
    confidence,
    probability,
  };
};

const BranchDetailPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { user } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [cutoff, setCutoff] = useState<BranchCutoffResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [reviews, setReviews] = useState<{
    reviews: Review[];
    average_ratings: Record<string, number>;
    total_reviews: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingMeeting, setRequestingMeeting] = useState<string | null>(
    null
  );
  const [userRankInput, setUserRankInput] = useState<string>("");
  const [userCategoryInput, setUserCategoryInput] = useState<string>("");
  const [prediction, setPrediction] = useState<SeatPrediction | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [decisionSummary, setDecisionSummary] = useState<string>("");
  const [insightBullets, setInsightBullets] = useState<string[]>([]);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<BranchInsightsResponse | null>(
    null
  );
  const [insightsBranchKey, setInsightsBranchKey] = useState<string | null>(null);

  const prepareChartData = (
    categoryData?: Record<string, { r1?: any; r2?: any; r3?: any }>
  ) => {
    if (!categoryData) return [];
    const years = ["2022", "2023", "2024", "2025"];
    return years
      .map((y) => ({
        year: y,
        R1: Number(categoryData[y]?.r1 ?? 0),
        R2: Number(categoryData[y]?.r2 ?? 0),
        R3: Number(categoryData[y]?.r3 ?? 0),
      }))
      .filter((row) => row.R1 || row.R2 || row.R3);
  };

  const categories = useMemo(
    () => Object.keys(cutoff?.categories || {}),
    [cutoff]
  );

  const primaryCategory = useMemo(
    () =>
      selectedCategory ||
      userCategoryInput ||
      user?.category ||
      categories[0] ||
      "GM",
    [categories, selectedCategory, user?.category, userCategoryInput]
  );

  const decisionData = useMemo(
    () => buildDecisionFromData(primaryCategory, cutoff),
    [primaryCategory, cutoff]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!publicId) return;

        const branchData = await branchService.detail(publicId);
        setBranch(branchData);

        const cutoffData = await branchService.cutoff(publicId);
        setCutoff(cutoffData);

        const reviewData = await reviewService.branchReviews(publicId);
        setReviews(reviewData);

        // Set default category to user's category if logged in
        if (user?.category && !selectedCategory) {
          setSelectedCategory(user.category);
          setUserCategoryInput(user.category);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publicId, user?.category]);

  useEffect(() => {
    if (user?.category && !userCategoryInput) {
      setUserCategoryInput(user.category);
    }
  }, [user?.category, userCategoryInput]);

  const handleOpenInsights = useCallback(async () => {
    if (!branch) return;

    setInsightsOpen(true);
    setInsightsError(null);

    if (insightsData && insightsBranchKey === branch.unique_key) return;

    try {
      setInsightsLoading(true);
      const data = await branchService.insights(branch.unique_key);
      setInsightsData(data);
      setInsightsBranchKey(branch.unique_key);
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as any)?.response?.data?.error ||
        (err as Error)?.message ||
        "Unable to fetch branch insights right now.";
      setInsightsError(message);
    } finally {
      setInsightsLoading(false);
    }
  }, [branch, insightsData, insightsBranchKey]);

  const formatCutoffForLLM = useCallback(() => {
    if (!cutoff?.categories) return "{}";
    const payload: Record<string, any> = {};
    Object.entries(cutoff.categories).forEach(([cat, years]) => {
      payload[cat] = {};
      Object.entries(years || {}).forEach(([year, rounds]) => {
        payload[cat][year] = {
          R1: normalizeCutoffValue((rounds as any)?.r1),
          R2: normalizeCutoffValue((rounds as any)?.r2),
          R3: normalizeCutoffValue((rounds as any)?.r3),
        };
      });
    });
    return JSON.stringify(payload, null, 2);
  }, [cutoff]);

  const ollamaGenerate = useCallback(async (prompt: string) => {
    setLlmError(null);
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        "Ollama service not reachable. Ensure it runs locally on port 11434."
      );
    }

    const data = await response.json();
    return (data?.response as string)?.trim?.() || "";
  }, []);

  const handleSeatPrediction = useCallback(() => {
    const rank = Number(userRankInput);
    if (!rank || rank <= 0) {
      alert("Please enter a valid rank.");
      return;
    }
    if (!cutoff) {
      alert("Cutoff data missing.");
      return;
    }
    setPredicting(true);
    try {
      const targetCategory =
        userCategoryInput ||
        selectedCategory ||
        user?.category ||
        categories[0] ||
        "GM";
      const best = pickBestOutcome(rank, targetCategory, cutoff);
      setPrediction(best);
    } finally {
      setPredicting(false);
    }
  }, [
    categories,
    cutoff,
    selectedCategory,
    user?.category,
    userCategoryInput,
    userRankInput,
  ]);

  const renderTooltip = useCallback(
    (props: any) => <CustomTooltip {...props} />,
    []
  );

  useEffect(() => {
    if (!cutoff || !decisionData || !branch) return;
    const run = async () => {
      setLlmBusy(true);
      try {
        const decisionPrompt = `
You are a concise KCET counselling advisor.
Branch: ${branch.branch_name} at ${branch.college.college_name}
Primary category: ${primaryCategory}
Best round: ${decisionData.round}
Recommended rank threshold: ${decisionData.recommendedRank}
Probability: ${(decisionData.probability * 100).toFixed(0)}%
Fallback category: ${decisionData.fallbackCategory}

Cutoff JSON (latest 3 years):
${formatCutoffForLLM()}

Respond with 2 short sentences that tell the student what to do. Avoid jargon.`;

        const summary = await ollamaGenerate(decisionPrompt);
        setDecisionSummary(summary);

        const insightPrompt = `
You are generating crisp insights about KCET cutoff behavior.
Use last 3 years data, trends, and fallback category logic.
Return 4-5 bullet points (no numbering), each under 18 words.

Cutoffs:
${formatCutoffForLLM()}

Fallback chain for ${primaryCategory}: ${computeFallbackChain(
          primaryCategory,
          cutoff.fall_back
        ).join(" → ")}

Highlight competition trend, volatility, safest round, and a forward-looking tip for 2025.`;

        const insightText = await ollamaGenerate(insightPrompt);
        const bullets = insightText
          .split("\n")
          .map((line) => line.replace(/^[\s*\-\d\.]+/, "").trim())
          .filter(Boolean)
          .slice(0, 5);
        setInsightBullets(bullets);
      } catch (err: any) {
        console.error(err);
        setLlmError(err?.message || "Unable to generate AI guidance.");
      } finally {
        setLlmBusy(false);
      }
    };
    run();
  }, [
    branch,
    cutoff,
    decisionData,
    formatCutoffForLLM,
    ollamaGenerate,
    primaryCategory,
  ]);

  const requestMeeting = async (studyingUserId?: string) => {
    if (!studyingUserId) {
      alert("Unable to request meeting for this reviewer.");
      return;
    }
    setRequestingMeeting(studyingUserId);
    try {
      await meetingService.request(studyingUserId);
      alert("Meeting request sent. Track it on the Meetings page.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Error sending meeting request");
    } finally {
      setRequestingMeeting(null);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-slate-600 dark:text-gray-400">Loading…</div>
    );
  if (!branch)
    return (
      <div className="p-8 text-slate-600 dark:text-gray-400">
        Branch not found.
      </div>
    );

  // BUILD CHART LIST
  // If user is logged in and has a category, default to showing that category
  // but still allow changing via the dropdown
  let chartCategories: string[] = [];

  if (!selectedCategory) {
    // If user is logged in and has category, use it; otherwise show all
    if (user?.category) {
      const chain = computeFallbackChain(user.category, cutoff?.fall_back);
      const seen = new Set<string>();
      chartCategories = chain.filter((c) => {
        if (seen.has(c)) return false;
        seen.add(c);
        return cutoff?.categories?.[c];
      });
      // If no categories found for user's category, show all
      if (chartCategories.length === 0) {
        chartCategories = categories;
      }
    } else {
      chartCategories = categories;
    }
  } else {
    const chain = computeFallbackChain(selectedCategory, cutoff?.fall_back);
    const seen = new Set<string>();
    chartCategories = chain.filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return cutoff?.categories?.[c];
    });
  }

  // Review attribute columns
  const FIELDS = [
    { key: "teaching_review", label: "Teaching" },
    { key: "courses_review", label: "Courses" },
    { key: "library_review", label: "Library" },
    { key: "research_review", label: "Research" },
    { key: "internship_review", label: "Internship" },
    { key: "infrastructure_review", label: "Infrastructure" },
    { key: "administration_review", label: "Administration" },
    { key: "extracurricular_review", label: "Extracurricular" },
    { key: "safety_review", label: "Safety" },
    { key: "placement_review", label: "Placement" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={`/colleges/${branch.college.public_id}`}
            className="text-blue-600 dark:text-sky-400 hover:underline"
          >
            ← Back to {branch.college.college_name}
          </Link>

          <h1 className="text-3xl font-bold mt-4 text-slate-800 dark:text-gray-100 mb-2">
            {branch.branch_name}
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mb-1">
            <strong>College:</strong> {branch.college.college_name}
          </p>
          <p className="text-slate-600 dark:text-gray-400 mb-2">
            <strong>Cluster:</strong> {branch.cluster.cluster_name}
          </p>
        </div>

        <div className="mt-1 flex items-start justify-end">
          <button
            type="button"
            onClick={handleOpenInsights}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-900/30 px-4 py-2 text-sm font-medium text-sky-800 dark:text-sky-100 shadow-sm hover:bg-sky-100 dark:hover:bg-sky-900/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-800 text-sky-700 dark:text-sky-200 text-xs">
              ℹ
            </span>
            Branch Insights
          </button>
        </div>
      </div>

      {/* Cutoff */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8 border border-slate-300 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-100">
            Cutoff Trends
          </h2>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {chartCategories.map((cat) => {
            const data = prepareChartData(cutoff?.categories?.[cat]);
            if (!data.length) return null;

            return (
              <div
                key={cat}
                className="rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900 dark:text-gray-100">
                    Category: {cat}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-sky-900/30 text-blue-700 dark:text-sky-300 border border-blue-100 dark:border-sky-800">
                    2022-25 • R1-R3
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip content={renderTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="R1"
                      stroke="#16a34a"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="R2"
                      stroke="#2563eb"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="R3"
                      stroke="#dc2626"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Card */}
      {decisionData && (
        <div
          className="relative overflow-hidden rounded-2xl mb-6 border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-600 via-cyan-600 to-slate-600
border border-teal-200 dark:border-slate-700 text-white shadow-lg"
        >
          <div
            className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_25%)]"
            aria-hidden
          />
          <div className="p-6 sm:p-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">
                  🎓 Final Recommendation
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold mt-1">
                  Apply if rank ≤ {decisionData.recommendedRank || "—"}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="backdrop-blur bg-white/15 rounded-xl px-3 py-2 border border-white/20">
                  <div className="text-white/80 text-xs">Best Round</div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span className="text-white">🏁</span> {decisionData.round}
                  </div>
                </div>
                <div className="backdrop-blur bg-white/15 rounded-xl px-3 py-2 border border-white/20">
                  <div className="text-white/80 text-xs">Backup Category</div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span className="text-white">🛡️</span>{" "}
                    {decisionData.fallbackCategory}
                  </div>
                </div>
                <div className="backdrop-blur bg-white/15 rounded-xl px-3 py-2 border border-white/20">
                  <div className="text-white/80 text-xs">Competition</div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span className="text-white">🔥</span>{" "}
                    {decisionData.competition}
                  </div>
                </div>
                <div className="backdrop-blur bg-white/15 rounded-xl px-3 py-2 border border-white/20">
                  <div className="text-white/80 text-xs">Confidence</div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span className="text-white">✅</span>{" "}
                    {decisionData.confidence}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seat Predictor */}
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">
              Seat Possibility
            </h3>
            <span className="text-xs px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
              AI-assisted
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-400">
                Enter KCET Rank
              </label>
              <input
                type="number"
                value={userRankInput}
                onChange={(e) => setUserRankInput(e.target.value)}
                placeholder="e.g., 5234"
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-400">
                Category
              </label>
              <select
                value={userCategoryInput}
                onChange={(e) => setUserCategoryInput(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Auto (your category / GM)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSeatPrediction}
              disabled={predicting}
              className="w-full rounded-lg bg-gradient-to-r from-teal-600 via-cyan-600 to-slate-600
border border-teal-200 dark:border-slate-700 text-white font-semibold py-2.5 shadow-md hover:shadow-lg transition hover:translate-y-[-1px] disabled:opacity-60"
            >
              {predicting ? "Calculating…" : "Check My Chances"}
            </button>
            <p className="text-xs text-slate-500 dark:text-gray-500">
              We apply fallback categories automatically, weigh recent rounds,
              and adjust for trends.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4">
            Result
          </h3>
          {prediction ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm px-3 py-1 rounded-full font-semibold border ${
                    prediction.level === "High"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
                      : prediction.level === "Medium"
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
                      : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800"
                  }`}
                >
                  {prediction.level} chance
                </span>
                <span className="text-sm text-slate-600 dark:text-gray-400">
                  Most likely in {prediction.round} • Category{" "}
                  {prediction.effectiveCategory}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-gray-500 mb-1">
                  <span>0%</span>
                  <span className="font-semibold text-slate-700 dark:text-gray-200">
                    {Math.round(prediction.probability * 100)}%
                  </span>
                  <span>100%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      prediction.level === "High"
                        ? "bg-emerald-500"
                        : prediction.level === "Medium"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${Math.round(prediction.probability * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-gray-500">
                    Effective Category
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-gray-100">
                    {prediction.effectiveCategory}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-gray-500">
                    Used Cutoff (avg)
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-gray-100">
                    {Math.round(prediction.usedCutoff || 0)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-gray-400 text-sm">
              Enter your rank and category to see the most probable round and
              fallback path.
            </p>
          )}
        </div>
      </div>

      {/* Average Ratings */}
      {reviews?.average_ratings && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6 border border-slate-300 dark:border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">
            Overall Average Ratings
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(reviews.average_ratings).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="flex justify-center mb-1">
                  <StarRating
                    rating={Math.round(value || 0)}
                    readonly
                    size="sm"
                  />
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-sky-400">
                  {value?.toFixed?.(1) || "N/A"}
                </div>
                <div className="text-xs text-slate-600 dark:text-gray-400">
                  {key
                    .replace("avg_", "")
                    .replace("_", " ")
                    .replace(/\b\w/g, (char) => char.toUpperCase())}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-300 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-100">
          Reviews (By Students)
        </h2>

        {reviews?.reviews?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase w-48">
                    Reviewer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                    Preferred Day
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                    Preferred Time
                  </th>
                  {FIELDS.map((f) => (
                    <th
                      key={f.key}
                      className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase min-w-[200px]"
                    >
                      {f.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">
                    Meeting
                  </th>
                </tr>
              </thead>

              <tbody>
                {reviews.reviews.map((r) => (
                  <tr
                    key={r.review_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-6 py-4 align-top font-medium text-sm text-slate-900 dark:text-gray-100">
                      {r.student_user_id_data?.name ||
                        r.student_user_id_data?.email_id ||
                        r.student_user_id}
                    </td>

                    <td className="px-6 py-4 align-top text-sm text-slate-800 dark:text-gray-200">
                      {r.preferred_day?.trim() || "—"}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-slate-800 dark:text-gray-200">
                      {r.preferred_time?.trim() || "—"}
                    </td>

                    {FIELDS.map((f) => (
                      <td
                        key={f.key}
                        className="px-6 py-4 align-top text-sm text-left text-slate-900 dark:text-gray-100"
                      >
                        <div className="whitespace-normal break-words">
                          {(r as any)[f.key]?.trim() || "—"}
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 align-top text-sm">
                      {user?.type_of_student === "counselling" ? (
                        <button
                          onClick={() =>
                            requestMeeting(
                              r.student_user_id_data?.student_user_id
                            )
                          }
                          disabled={
                            !r.student_user_id_data?.student_user_id ||
                            requestingMeeting ===
                              r.student_user_id_data?.student_user_id
                          }
                          className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 disabled:text-slate-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                          {requestingMeeting ===
                          r.student_user_id_data?.student_user_id
                            ? "Requesting..."
                            : "Request Meeting"}
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-xs">
                          Counselling students only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-gray-400">
            No reviews yet for this branch.
          </p>
        )}
      </div>

      <BranchInsightsModal
        isOpen={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        loading={insightsLoading}
        error={insightsError}
        data={insightsData}
        collegeName={branch.college.college_name}
        branchName={branch.branch_name}
      />
    </div>
  );
};

export default BranchDetailPage;
