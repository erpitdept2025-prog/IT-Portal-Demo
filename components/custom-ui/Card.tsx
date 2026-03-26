"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animated?: boolean;
  delay?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, animated = false, delay = 0, ...props }, ref) => {
    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            "bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-lg",
            className
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay }}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("pb-4 border-b border-slate-700", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-white", className)}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  >
    {children}
  </p>
));

CardDescription.displayName = "CardDescription";

export { Card, CardHeader, CardContent, CardTitle, CardDescription };
