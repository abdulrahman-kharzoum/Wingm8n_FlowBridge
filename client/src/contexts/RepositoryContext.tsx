import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  html_url: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  pushed_at: string;
  stargazers_count: number;
  language: string | null;
  repoType?: 'personal' | 'organization' | 'collaborative';
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

export interface SelectedRepository {
  repo: Repository;
  stagingBranch?: string;
  mainBranch?: string;
}

interface RepositoryContextType {
  selectedRepository: SelectedRepository | null;
  setSelectedRepository: (repo: SelectedRepository | null) => void;
  clearSelectedRepository: () => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(() => {
    // Try to restore from localStorage
    const stored = localStorage.getItem('selectedRepository');
    return stored ? JSON.parse(stored) : null;
  });

  const handleSetSelectedRepository = useCallback((repo: SelectedRepository | null) => {
    setSelectedRepository(repo);
    if (repo) {
      localStorage.setItem('selectedRepository', JSON.stringify(repo));
    } else {
      localStorage.removeItem('selectedRepository');
    }
  }, []);

  const handleClearSelectedRepository = useCallback(() => {
    setSelectedRepository(null);
    localStorage.removeItem('selectedRepository');
  }, []);

  return (
    <RepositoryContext.Provider
      value={{
        selectedRepository,
        setSelectedRepository: handleSetSelectedRepository,
        clearSelectedRepository: handleClearSelectedRepository,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
