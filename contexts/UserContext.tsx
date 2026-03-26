"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  role: string | null;
  setRole: (role: string | null) => void;
  department: string | null;
  setDepartment: (department: string | null) => void;
  referenceId: string | null;
  setReferenceId: (id: string | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  return (
    <UserContext.Provider
      value={{
        userId,
        setUserId,
        role,
        setRole,
        department,
        setDepartment,
        referenceId,
        setReferenceId,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
