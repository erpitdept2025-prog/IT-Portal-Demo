"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { toast } from "react-toastify";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/custom-ui/Card";
import { Badge } from "@/components/custom-ui/Badge";
import { dashboardContainerVariants, cardVariants, statVariants } from "@/components/animations/dashboard";

interface CustomerRecord {
  _id: string;
  date_created: string;
}

interface UserRecord {
  _id: string;
  createdAt: string;
}

interface ProgressRecord {
  _id: string;
  referenceid: string;
  date: string;
  ramConsumed: number;
}

interface ActivityRecord {
  _id: string;
}

export function SectionCards() {
  const [allRecords, setAllRecords] = useState<CustomerRecord[]>([]);
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);

  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [errorRecords, setErrorRecords] = useState<string | null>(null);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [errorProgress, setErrorProgress] = useState<string | null>(null);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);

  const NEW_RECORDS_DAYS = 7;

  // Fetch customer records
  useEffect(() => {
    async function fetchData() {
      setLoadingRecords(true);
      setErrorRecords(null);
      try {
        const res = await fetch(
          "/api/Data/Applications/Taskflow/CustomerDatabase/Fetch"
        );
        if (!res.ok) throw new Error("Failed to fetch customer records");
        const data = await res.json();
        setAllRecords(Array.isArray(data) ? data : data.data ?? []);
      } catch (err: any) {
        setErrorRecords(err.message || "Error fetching customer records");
        toast.error(`Customer Records Error: ${err.message || err}`);
        setAllRecords([]);
      } finally {
        setLoadingRecords(false);
      }
    }
    fetchData();
  }, []);

  // Fetch user records
  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      setErrorUsers(null);
      try {
        const res = await fetch("/api/Dashboard/FetchUser");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUserRecords(Array.isArray(data) ? data : data.data ?? []);
      } catch (err: any) {
        setErrorUsers(err.message || "Error fetching users");
        toast.error(`Users Error: ${err.message || err}`);
        setUserRecords([]);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  // Fetch progress records
  useEffect(() => {
    async function fetchProgress() {
      setLoadingProgress(true);
      setErrorProgress(null);
      try {
        const res = await fetch("/api/fetch-progress");
        if (!res.ok) throw new Error("Failed to fetch progress records");
        const data = await res.json();
        setProgressRecords(Array.isArray(data.activities) ? data.activities : []);
      } catch (err: any) {
        setErrorProgress(err.message || "Error fetching progress records");
      } finally {
        setLoadingProgress(false);
      }
    }
    fetchProgress();
  }, []);

  // Fetch activity records
  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true);
      setErrorActivity(null);
      try {
        const res = await fetch("/api/fetch-activity");
        if (!res.ok) throw new Error("Failed to fetch activity records");
        const data = await res.json();
        setActivityRecords(Array.isArray(data.activities) ? data.activities : []);
      } catch (err: any) {
        setErrorActivity(err.message || "Error fetching activity records");
      } finally {
        setLoadingActivity(false);
      }
    }
    fetchActivity();
  }, []);

  const newRecordsCount = allRecords.filter((record) => {
    const createdDate = new Date(record.date_created);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NEW_RECORDS_DAYS);
    return createdDate >= cutoffDate;
  }).length;

  const newUsersCount = userRecords.filter((user) => {
    const createdDate = new Date(user.createdAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NEW_RECORDS_DAYS);
    return createdDate >= cutoffDate;
  }).length;

  const stats = [
    {
      title: "Total Balance",
      value: "12.84 ETH",
      trend: "+4.2%",
      description: "System capacity",
      loading: loadingRecords,
      error: errorRecords,
    },
    {
      title: "Tickets",
      value: allRecords.length.toString(),
      trend: "+15.2%",
      description: "8 Expiring Soon",
      loading: loadingRecords,
      error: errorRecords,
    },
    {
      title: "Audits",
      value: userRecords.length.toString(),
      trend: "+10.7%",
      description: "Completed 100%",
      loading: loadingUsers,
      error: errorUsers,
    },
    {
      title: "Network Velocity",
      value: "87.5%",
      trend: "+6.0%",
      description: "Peak performance",
      loading: loadingProgress,
      error: errorProgress,
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6"
      variants={dashboardContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
        <motion.div key={index} variants={cardVariants} whileHover="hover">
          <Card animated delay={index * 0.1} className="h-full">
            <CardContent className="flex items-start justify-between">
              <div className="flex flex-col gap-2 flex-1">
                <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">
                  {stat.title}
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-white">
                  {stat.loading ? (
                    <motion.div
                      className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : stat.error ? (
                    <span className="text-red-400 text-sm">Error</span>
                  ) : (
                    stat.value
                  )}
                </CardTitle>
                {!stat.loading && !stat.error && (
                  <motion.div variants={statVariants}>
                    <Badge variant="cyan" className="gap-1 w-fit">
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </Badge>
                  </motion.div>
                )}
                <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
