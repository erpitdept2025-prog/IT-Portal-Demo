"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({
  open = false,
  onOpenChange,
  children,
}: DialogProps) => {
  const [isOpen, setIsOpen] = React.useState(open);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  return (
    <DialogContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within Dialog");
  }
  return context;
};

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialog();
    return (
      <button
        ref={ref}
        onClick={(e) => {
          onOpenChange(true);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DialogTrigger.displayName = "DialogTrigger";

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, onOpenChange } = useDialog();

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              ref={ref}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-6 shadow-lg z-50",
                className
              )}
              {...props}
            >
              <button
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-5 h-5" />
              </button>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

DialogContent.displayName = "DialogContent";

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
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

DialogHeader.displayName = "DialogHeader";

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-white pr-6", className)}
      {...props}
    >
      {children}
    </h2>
  )
);

DialogTitle.displayName = "DialogTitle";

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("py-4", className)} {...props}>
      {children}
    </div>
  )
);

DialogBody.displayName = "DialogBody";

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("pt-4 border-t border-slate-700 flex gap-2 justify-end", className)}
      {...props}
    >
      {children}
    </div>
  )
);

DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useDialog,
};
