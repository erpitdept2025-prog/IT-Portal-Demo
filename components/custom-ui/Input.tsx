"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, error, type = "text", ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <motion.input
            ref={ref}
            type={type}
            className={cn(
              "w-full bg-transparent border-0 border-b-2 border-slate-600 px-3 py-3 text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-0 focus:border-cyan-400",
              icon && "pl-10",
              error && "border-b-red-500 focus:border-b-red-500",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            animate={{
              borderBottomColor: isFocused
                ? "#06b6d4"
                : error
                  ? "#ef4444"
                  : "#475569",
            }}
            transition={{ duration: 0.2 }}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 mt-1"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
