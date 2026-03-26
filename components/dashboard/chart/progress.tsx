"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/custom-ui/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { chartVariants } from "@/components/animations/dashboard";

interface ProgressRecord {
  id: string;
  referenceid: string;
  date_created: string;
}

interface ActivityRecord {
  id: string;
  date_created: string;
}

const chartConfig = {
  progress: {
    label: "Progress Count",
    color: "var(--color-desktop)",
  },
  activity: {
    label: "Activity Count",
    color: "var(--color-mobile)",
  },
} satisfies ChartConfig;

function countDistinctIdsByDate<T>(
  records: T[],
  getDate: (r: T) => string,
  getId: (r: T) => string
): Record<string, number> {
  const map: Record<string, Set<string>> = {};

  records.forEach((record) => {
    const dateStrRaw = getDate(record);
    const dateStr = typeof dateStrRaw === "string" ? dateStrRaw.slice(0, 10) : "";
    if (!dateStr) return;

    if (!map[dateStr]) map[dateStr] = new Set();
    map[dateStr].add(getId(record));
  });

  const result: Record<string, number> = {};
  for (const date in map) {
    result[date] = map[date].size;
  }
  return result;
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  const [progressRecords, setProgressRecords] = React.useState<ProgressRecord[]>([]);
  const [activityRecords, setActivityRecords] = React.useState<ActivityRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const htmlEl = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(htmlEl.classList.contains("dark"));
    });
    observer.observe(htmlEl, { attributes: true, attributeFilter: ["class"] });

    setIsDark(htmlEl.classList.contains("dark"));

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [progressRes, activityRes] = await Promise.all([
          fetch("/api/fetch-progress"),
          fetch("/api/fetch-activity"),
        ]);
        if (!progressRes.ok) throw new Error("Failed to fetch progress data");
        if (!activityRes.ok) throw new Error("Failed to fetch activity data");

        const progressResJson = await progressRes.json();
        const activityResJson = await activityRes.json();

        setProgressRecords(
          Array.isArray(progressResJson.activities) ? progressResJson.activities : []
        );
        setActivityRecords(
          Array.isArray(activityResJson.activities) ? activityResJson.activities : []
        );
      } catch (err: any) {
        setError(err.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getCssVar = (name: string) =>
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : "";

  const getCssVarHsl = (name: string, fallback: string) => {
    const val = getCssVar(name);
    return val ? `hsl(${val})` : fallback;
  };

  const chartColors = React.useMemo(
    () => ({
      axisLine: getCssVarHsl("--chart-axis-line", isDark ? "#ddd" : "#666"),
      tickColor: getCssVarHsl("--chart-tick-color", isDark ? "#ddd" : "#666"),
      gridLine: getCssVarHsl("--chart-grid-line", isDark ? "#444" : "#ddd"),
      tooltipBg: getCssVarHsl("--chart-tooltip-bg", isDark ? "#222" : "#fff"),
      tooltipColor: getCssVarHsl("--chart-tooltip-color", isDark ? "#eee" : "#000"),
      background: getCssVarHsl("--chart-background", isDark ? "#121212" : "#fff"),
      progressColor: getCssVarHsl("--color-desktop", isDark ? "#65def1" : "#1e40af"),
      activityColor: getCssVarHsl("--color-mobile", isDark ? "#65def1" : "#059669"),
    }),
    [isDark]
  );

  const progressCountByDate = countDistinctIdsByDate(
    progressRecords,
    (r) => r.date_created,
    (r) => r.id
  );

  const activityCountByDate = countDistinctIdsByDate(
    activityRecords,
    (r) => r.date_created,
    (r) => r.id
  );

  const allDatesSet = new Set<string>([
    ...Object.keys(progressCountByDate),
    ...Object.keys(activityCountByDate),
  ]);
  const allDates = Array.from(allDatesSet).sort();

  const referenceDate = new Date(allDates[allDates.length - 1] || new Date().toISOString());
  let daysToSubtract = 90;
  if (timeRange === "30d") daysToSubtract = 30;
  else if (timeRange === "7d") daysToSubtract = 7;

  const startDate = new Date(referenceDate);
  startDate.setDate(referenceDate.getDate() - daysToSubtract);

  const filteredDates = allDates.filter((dateStr) => {
    const d = new Date(dateStr);
    return d >= startDate && d <= referenceDate;
  });

  const filteredData = filteredDates.map((dateStr) => ({
    date: dateStr,
    progress: progressCountByDate[dateStr] || 0,
    activity: activityCountByDate[dateStr] || 0,
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <motion.div
            className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-red-400">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div variants={chartVariants} initial="hidden" animate="visible">
      <Card className="border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Network Velocity</CardTitle>
          <CardDescription className="text-slate-400">
            Progress and Activity Overview
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {["7d", "30d", "90d"].map((range) => (
              <motion.button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range
                    ? "bg-cyan-500 text-slate-900"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {range === "7d" ? "1W" : range === "30d" ? "1M" : "3M"}
              </motion.button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="fillProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.progressColor} stopOpacity={1.0} />
                    <stop offset="95%" stopColor={chartColors.progressColor} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.activityColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={chartColors.activityColor} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartColors.gridLine} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  stroke={chartColors.axisLine}
                  tickMargin={8}
                  minTickGap={32}
                  tick={{ fill: chartColors.tickColor }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }
                      indicator="dot"
                      style={{
                        backgroundColor: chartColors.tooltipBg,
                        color: chartColors.tooltipColor,
                        borderRadius: "8px",
                        padding: "8px",
                      }}
                    />
                  }
                />
                <Area
                  dataKey="progress"
                  type="natural"
                  fill="url(#fillProgress)"
                  stroke={chartColors.progressColor}
                  stackId="a"
                />
                <Area
                  dataKey="activity"
                  type="natural"
                  fill="url(#fillActivity)"
                  stroke={chartColors.activityColor}
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
