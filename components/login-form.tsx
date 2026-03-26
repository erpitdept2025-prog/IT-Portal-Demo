"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/custom-ui/Button";
import { Input } from "@/components/custom-ui/Input";
import { Card, CardContent, CardTitle } from "@/components/custom-ui/Card";

import { Mail, Lock, LogIn, Rocket } from "lucide-react";
import {
  containerVariants,
  itemVariants,
  logoVariants,
  formVariants,
} from "@/components/animations/login";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const router = useRouter();
  const { login } = useAuth();

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 1) {
      newErrors.password = "Password is too short";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) return;

      setLoading(true);
      try {
        const deviceId = getDeviceId();
        const result = await login(email, password, deviceId);

        if (!result.success) {
          toast.error(result.error || "Login failed");
          setLoading(false);
          return;
        }

        toast.success("Login successful! Redirecting...");
        
        // Direct redirect to dashboard (no delay)
        router.push("/dashboard");
      } catch (error) {
        toast.error("An unexpected error occurred");
        console.error("Login error:", error);
      } finally {
        setLoading(false);
      }
    },
    [email, password, login, router]
  );

  return (
    <motion.div
      className={`relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo/Header */}
        <motion.div
          className="text-center mb-12"
          variants={logoVariants}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-500 mb-4 shadow-lg shadow-cyan-500/50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="w-8 h-8 text-slate-900" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            KINETIC
          </h1>
          <p className="text-cyan-400 text-sm uppercase tracking-widest font-medium">
            Precision Audit Interface
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div variants={formVariants}>
          <Card className="border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-8">
              <motion.h2
                className="text-xl font-semibold text-white mb-6 text-center"
                variants={itemVariants}
              >
                Sign In
              </motion.h2>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <Input
                    type="email"
                    label="Email Address"
                    icon={<Mail className="w-5 h-5" />}
                    placeholder="admin@kinetic.io"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    error={errors.email}
                    disabled={loading}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Input
                    type="password"
                    label="Access Key"
                    icon={<Lock className="w-5 h-5" />}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    disabled={loading}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-400 focus:ring-cyan-400"
                      defaultChecked
                    />
                    <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                      Keep session active
                    </span>
                  </label>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={loading}
                    className="w-full"
                    disabled={loading}
                  >
                    {!loading && <LogIn className="w-5 h-5 mr-2" />}
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                className="mt-6 pt-6 border-t border-slate-700/50 text-center"
                variants={itemVariants}
              >
                <p className="text-sm text-slate-400">
                  New observer?{" "}
                  <a
                    href="#"
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Request access
                  </a>
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className="text-center text-xs text-slate-500 mt-8"
          variants={itemVariants}
        >
          System Status:{" "}
          <span className="text-green-400 font-medium">Operational</span> • NODE: ALPHA-7
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
