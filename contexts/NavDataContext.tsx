// contexts/NavDataContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Destination, Category } from '@/types';

interface NavDataContextType {
  destinations: Destination[];
  categories: Category[];
}

const NavDataContext = createContext<NavDataContextType>({
  destinations: [],
  categories: [],
});

export const NavDataProvider = ({
  children,
  destinations,
  categories,
}: {
  children: ReactNode;
  destinations: Destination[];
  categories: Category[];
}) => {
  return (
    <NavDataContext.Provider value={{ destinations, categories }}>
      {children}
    </NavDataContext.Provider>
  );
};

export const useNavData = () => useContext(NavDataContext);
