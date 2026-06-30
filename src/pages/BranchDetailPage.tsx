import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { branchService, reviewService } from "../services/api";
import StarRating from "../components/StarRating";
import CustomTooltip from "../components/charts/CustomTooltip";
import type { Branch, Review, BranchInsightsResponse } from "../types";
import { LoadingIndicator } from "../components/application/loading-indicator/loading-indicator";
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

type BranchReviewResponse = {
  reviews: Review[];
  average_ratings?: Record<string, number>;
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

const normalizeCutoffValue = (value?: number | string | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};


const sanitizeRoundData = (r1: number | null, r2: number | null, r3: number | null) => {
  const isValid = (v: number | null): v is number =>
    v !== null &&
    v !== undefined &&
    v !== 0;

  // R1
  let graphR1 = isValid(r1) ? r1 : null;

  // R2
  let graphR2: number | null;
  if (!isValid(r2)) {
    graphR2 = graphR1;
  } else if (graphR1 !== null && r2 < graphR1) {
    graphR2 = graphR1;
  } else {
    graphR2 = r2;
  }

  // R3
  let graphR3: number | null;
  if (!isValid(r3)) {
    graphR3 = graphR2;
  } else if (graphR2 !== null && r3 < graphR2) {
    graphR3 = graphR2;
  } else if (graphR1 !== null && r3 < graphR1) {
    graphR3 = graphR1;
  } else {
    graphR3 = r3;
  }

  return {
    graph: {
      R1: graphR1,
      R2: graphR2,
      R3: graphR3,
    },
    tooltip: {
      R1: isValid(r1) ? r1 : "--",
      R2: isValid(r2) ? r2 : "--",
      R3: isValid(r3) ? r3 : "--",
    },
  };
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

const buildDecisionFromData = (
  primaryCategory: string,
  cutoff: BranchCutoffResponse | null
) => {
  if (!cutoff || !cutoff.categories) return null;

  const chain = computeFallbackChain(primaryCategory, cutoff.fall_back);
  
  // Find the first category in the chain that has data
  let targetCategory = primaryCategory;
  let targetData = cutoff.categories[primaryCategory];
  let fallbackIndex = 0;

  if (!targetData) {
    for (let i = 0; i < chain.length; i++) {
      if (cutoff.categories[chain[i]]) {
        targetCategory = chain[i];
        targetData = cutoff.categories[chain[i]];
        fallbackIndex = i;
        break;
      }
    }
  }

  if (!targetData) return null;

  const stats = computeRoundStats(targetData);
  if (stats.length === 0) return null;

  // Filter out rounds with no data
  const validStats = stats.filter((s) => s.avg > 0);
  if (validStats.length === 0) return null;

  // Pick the best round (highest latest cutoff or average)
  let bestRoundStat = validStats[0];
  for (const stat of validStats) {
    const val = stat.latest || stat.avg;
    const bestVal = bestRoundStat.latest || bestRoundStat.avg;
    if (val > bestVal) {
      bestRoundStat = stat;
    }
  }

  const recommendedRank = Math.round(bestRoundStat.latest || bestRoundStat.avg);
  const roundLabel = roundKeyLabel[bestRoundStat.round];

  const fallbackCategory = chain.find((c) => c !== targetCategory && cutoff.categories?.[c]) || "GM";

  // Competition based on trend
  let competition = "Medium";
  if (bestRoundStat.trend < -0.05) {
    competition = "High";
  } else if (bestRoundStat.trend > 0.05) {
    competition = "Low";
  }

  // Confidence calculation
  let confidence = 60;
  confidence += bestRoundStat.coverage * 8; // up to +32
  confidence -= Math.min(20, Math.round(Math.abs(bestRoundStat.trend) * 40));
  if (fallbackIndex > 0) {
    confidence -= fallbackIndex * 5;
  }
  confidence = Math.max(35, Math.min(98, confidence));

  // Probability at the recommended rank
  const probability = scoreProbability(recommendedRank, bestRoundStat, fallbackIndex);

  return {
    recommendedRank,
    round: roundLabel,
    fallbackCategory,
    competition,
    confidence,
    probability,
  };
};

const pickBestOutcome = (
  rank: number,
  targetCategory: string,
  cutoff: BranchCutoffResponse
): SeatPrediction => {
  const chain = computeFallbackChain(targetCategory, cutoff.fall_back);
  let bestOutcome: {
    probability: number;
    round: RoundKey;
    category: string;
    stat: RoundStat;
    fallbackIndex: number;
  } | null = null;

  for (let i = 0; i < chain.length; i++) {
    const cat = chain[i];
    const catData = cutoff.categories?.[cat];
    if (!catData) continue;

    const stats = computeRoundStats(catData);
    for (const stat of stats) {
      if (stat.avg === 0) continue;
      const prob = scoreProbability(rank, stat, i);
      if (!bestOutcome || prob > bestOutcome.probability) {
        bestOutcome = {
          probability: prob,
          round: stat.round,
          category: cat,
          stat,
          fallbackIndex: i,
        };
      }
    }
  }

  if (!bestOutcome) {
    return {
      probability: 0,
      level: "Low",
      round: "Round 1",
      effectiveCategory: targetCategory,
      explanation: "No historical cutoff data available for this category or its fallback chain.",
      usedCutoff: 0,
    };
  }

  const level = chanceLevel(bestOutcome.probability);
  const roundLabel = roundKeyLabel[bestOutcome.round];
  
  let explanation = "";
  if (bestOutcome.probability >= 0.7) {
    explanation = `Excellent chances! Your rank of ${rank} is well within the historical average cutoff of ${Math.round(bestOutcome.stat.avg)} for category ${bestOutcome.category} in ${roundLabel}.`;
  } else if (bestOutcome.probability >= 0.4) {
    explanation = `Moderate chances. Your rank of ${rank} is close to the average cutoff of ${Math.round(bestOutcome.stat.avg)} for category ${bestOutcome.category} in ${roundLabel}. It's worth putting in your option entry list.`;
  } else {
    explanation = `Low chances. The historical average cutoff for category ${bestOutcome.category} in ${roundLabel} is ${Math.round(bestOutcome.stat.avg)}, which is lower than your rank of ${rank}. Keep a safe backup option.`;
  }

  if (bestOutcome.category !== targetCategory) {
    explanation += ` (Using fallback category: ${bestOutcome.category})`;
  }

  return {
    probability: bestOutcome.probability,
    level,
    round: roundLabel,
    effectiveCategory: bestOutcome.category,
    explanation,
    usedCutoff: bestOutcome.stat.avg,
  };
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
};

const BranchDetailPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { user } = useAuth();
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [cutoff, setCutoff] = useState<BranchCutoffResponse | null>(null);
  const [reviews, setReviews] = useState<BranchReviewResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userRankInput, setUserRankInput] = useState<string>("");
  const [userCategoryInput, setUserCategoryInput] = useState<string>("");
  const [prediction, setPrediction] = useState<SeatPrediction | null>(null);
  const [predicting, setPredicting] = useState(false);
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
      .map((y) => {
        const r1 = categoryData[y]?.r1;
        const r2 = categoryData[y]?.r2;
        const r3 = categoryData[y]?.r3;
        
        const parseVal = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? n : null;
        };
        
        const numR1 = parseVal(r1);
        const numR2 = parseVal(r2);
        const numR3 = parseVal(r3);
        
        const sanitized = sanitizeRoundData(numR1, numR2, numR3);
        
        return {
          year: y,
          R1: sanitized.graph.R1,
          R2: sanitized.graph.R2,
          R3: sanitized.graph.R3,
          tooltipR1: sanitized.tooltip.R1,
          tooltipR2: sanitized.tooltip.R2,
          tooltipR3: sanitized.tooltip.R3,
          hasData: numR1 !== null || numR2 !== null || numR3 !== null
        };
      })
      .filter((row) => row.hasData);
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

  // const formatCutoffForLLM = useCallback(() => {
  //   if (!cutoff?.categories) return "{}";
  //   const payload: Record<string, any> = {};
  //   Object.entries(cutoff.categories).forEach(([cat, years]) => {
  //     payload[cat] = {};
  //     Object.entries(years || {}).forEach(([year, rounds]) => {
  //       payload[cat][year] = {
  //         R1: normalizeCutoffValue((rounds as any)?.r1),
  //         R2: normalizeCutoffValue((rounds as any)?.r2),
  //         R3: normalizeCutoffValue((rounds as any)?.r3),
  //       };
  //     });
  //   });
  //   return JSON.stringify(payload, null, 2);
  // }, [cutoff]);

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

  if (loading)
  return (
    <div className="flex items-center justify-center min-h-[300px] text-slate-600 dark:text-gray-300">
      <LoadingIndicator
        type="dot-circle"
        size="md"
        label="Loading recommendations..."
      />
    </div>
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
    chartCategories = categories;
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-3 sm:p-6 mb-8 border border-slate-300 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-100">
            Cutoff Trends
          </h2>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-3 py-2 sm:py-1 text-sm sm:text-base border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
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

            const chartHeight = isMobile ? 220 : isTablet ? 300 : 380;

            return (
              <div
                key={cat}
                className="rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-gray-100">
                    Category: {cat}
                  </h3>
                  <span className="text-xs self-start sm:self-auto px-2 py-1 rounded-full bg-blue-50 dark:bg-sky-900/30 text-blue-700 dark:text-sky-300 border border-blue-100 dark:border-sky-800">
                    2022-25 • R1-R3
                  </span>
                </div>
                
                <div className="w-full animate-fade-in" style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fontSize: isMobile ? 10 : 12 }} 
                      />
                      <YAxis 
                        tick={{ fontSize: isMobile ? 10 : 12 }} 
                        width={isMobile ? 35 : 55}
                      />
                      <Tooltip content={renderTooltip} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconSize={isMobile ? 8 : 12}
                        wrapperStyle={isMobile ? { fontSize: '10px', paddingTop: 10 } : { fontSize: '12px' }}
                      />
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

                {/* Desktop/Tablet Table (768px and up) */}
                <div className="hidden md:block mt-4 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-cyan-400/20 bg-white dark:bg-[#071224] shadow-[0_0_20px_rgba(34,211,238,0.08)] dark:shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                  <table className="w-full text-sm min-w-[280px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-cyan-500/10 bg-slate-50 dark:bg-cyan-500/5">
                        <th className="px-3 sm:px-4 py-2 text-left font-semibold text-slate-500 dark:text-cyan-200">
                          Year
                        </th>
                        <th className="px-3 sm:px-4 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-300">
                          R1
                        </th>
                        <th className="px-3 sm:px-4 py-2 text-center font-semibold text-blue-600 dark:text-blue-300">
                          R2
                        </th>
                        <th className="px-3 sm:px-4 py-2 text-center font-semibold text-red-600 dark:text-red-300">
                          R3
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-cyan-500/5 text-slate-800 dark:text-gray-200">
                      {data.map((row) => (
                        <tr
                          key={row.year}
                          className="hover:bg-slate-50 dark:hover:bg-cyan-400/5 transition-all duration-150"
                        >
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-slate-700 dark:text-gray-200">
                            {row.year}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {row.tooltipR1}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                            {row.tooltipR2}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-red-600 dark:text-red-400">
                            {row.tooltipR3}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards Layout (below 768px) */}
                <div className="block md:hidden mt-4 space-y-3">
                  {data.map((row) => (
                    <div key={row.year} className="rounded-xl border border-slate-200 dark:border-cyan-400/20 bg-white dark:bg-[#071224] p-3 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-cyan-500/10 pb-1.5 mb-2">
                        <span className="font-semibold text-xs text-slate-700 dark:text-gray-200">Year: {row.year}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
                        <div className="rounded bg-emerald-50/50 dark:bg-emerald-950/20 p-2 border border-emerald-100/50 dark:border-emerald-900/30">
                          <span className="block text-slate-500 dark:text-emerald-300 font-medium mb-0.5">R1</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{row.tooltipR1}</span>
                        </div>
                        <div className="rounded bg-blue-50/50 dark:bg-blue-950/20 p-2 border border-blue-100/50 dark:border-blue-900/30">
                          <span className="block text-slate-500 dark:text-blue-300 font-medium mb-0.5">R2</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm">{row.tooltipR2}</span>
                        </div>
                        <div className="rounded bg-red-50/50 dark:bg-red-950/20 p-2 border border-red-100/50 dark:border-red-900/30">
                          <span className="block text-slate-500 dark:text-red-300 font-medium mb-0.5">R3</span>
                          <span className="font-bold text-red-600 dark:text-red-400 text-xs sm:text-sm">{row.tooltipR3}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase w-48">Reviewer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">Preferred Day</th>
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
                </tr>
              </thead>

              <tbody>
                {reviews.reviews.map((r) => {


                  const reviewerLabel =
                    (r as any).student_user_id_data?.name ||
                    (r as any).student_user_id_data?.email_id ||
                    ((r as any).student_user_id &&
                      typeof (r as any).student_user_id === 'object'
                      ? (r as any).student_user_id.name || (r as any).student_user_id.email_id || (r as any).student_user_id.student_user_id
                      : (typeof (r as any).student_user_id === 'string' ? (r as any).student_user_id : undefined)) ||
                    'Unknown';

                  return (
                    <tr
                      key={(r as any).review_id || (r as any)._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <td className="px-6 py-4 align-top font-medium text-sm text-slate-900 dark:text-gray-100">
                        {reviewerLabel}
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
                  </tr>
                );
              })}
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
