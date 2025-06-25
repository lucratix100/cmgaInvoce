"use client"

import { createContext, useContext, ReactNode } from 'react'

interface UserRoleContextType {
  role: string | null;
  isAdmin: boolean;
  isRecouvrement: boolean;
}

const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  isAdmin: false,
  isRecouvrement: false
});

interface UserRoleProviderProps {
  role: string | null;
  children: ReactNode;
}

export function UserRoleProvider({ role, children }: UserRoleProviderProps) {
  const value = {
    role,
    isAdmin: role === "ADMIN",
    isRecouvrement: role === "RECOUVREMENT"
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export const useUserRole = () => useContext(UserRoleContext); 