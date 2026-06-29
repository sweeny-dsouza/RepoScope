import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';

/**
 * Consolidated data fetching for repository detail page.
 * Handles timeout (15s), error aggregation, and provides a unified loading state.
 */
export function useRepoData(owner: string | undefined, name: string | undefined) {
  const enabled = !!owner && !!name;
  const timeoutMs = 15000;

  // Repository core data
  const repoQuery = trpc.github.getRepoDetails.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 5, retry: false }
  );

  // Languages
  const langsQuery = trpc.github.getRepoLanguages.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 30, retry: false }
  );

  // Contributors
  const contributorsQuery = trpc.github.getContributors.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 30, retry: false }
  );

  // Health score
  const healthQuery = trpc.github.getHealthScore.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 60, retry: false }
  );

  // Difficulty (if needed elsewhere)
  const difficultyQuery = trpc.github.getDifficulty.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 60, retry: false }
  );

  // AI summary
  const aiQuery = trpc.ai.getSummary.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 10, retry: false }
  );

  // Commit activity
  const commitActivityQuery = trpc.github.getCommitActivity.useQuery(
    { owner: owner!, repo: name! },
    { enabled, staleTime: 1000 * 60 * 30, retry: false }
  );

  // Timeout handling for each query
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [anyError, setAnyError] = useState(false);

  // Helper to set timeout for a specific loading flag
  const useTimeout = (loading: boolean) => {
    useEffect(() => {
      if (loading) {
        const timer = setTimeout(() => setHasTimedOut(true), timeoutMs);
        return () => clearTimeout(timer);
      }
    }, [loading]);
  };

  useTimeout(repoQuery.isLoading);
  useTimeout(langsQuery.isLoading);
  useTimeout(contributorsQuery.isLoading);
  useTimeout(healthQuery.isLoading);
  useTimeout(aiQuery.isLoading);
  useTimeout(commitActivityQuery.isLoading);

  // Aggregate errors and reset when all succeed
  useEffect(() => {
    const hasError =
      repoQuery.isError ||
      langsQuery.isError ||
      contributorsQuery.isError ||
      healthQuery.isError ||
      difficultyQuery.isError ||
      aiQuery.isError ||
      commitActivityQuery.isError;
    setAnyError(hasError);
  }, [
    repoQuery.isError,
    langsQuery.isError,
    contributorsQuery.isError,
    healthQuery.isError,
    difficultyQuery.isError,
    aiQuery.isError,
    commitActivityQuery.isError,
  ]);

  // Reset timeout flag when any query succeeds
  useEffect(() => {
    if (
      repoQuery.isSuccess ||
      langsQuery.isSuccess ||
      contributorsQuery.isSuccess ||
      healthQuery.isSuccess ||
      difficultyQuery.isSuccess ||
      aiQuery.isSuccess ||
      commitActivityQuery.isSuccess
    ) {
      setHasTimedOut(false);
    }
  }, [
    repoQuery.isSuccess,
    langsQuery.isSuccess,
    contributorsQuery.isSuccess,
    healthQuery.isSuccess,
    difficultyQuery.isSuccess,
    aiQuery.isSuccess,
    commitActivityQuery.isSuccess,
  ]);

  // Consolidated loading flag (excluding timed out state)
  const isLoading =
    repoQuery.isLoading ||
    langsQuery.isLoading ||
    contributorsQuery.isLoading ||
    healthQuery.isLoading ||
    difficultyQuery.isLoading ||
    aiQuery.isLoading ||
    commitActivityQuery.isLoading;

  // Expose data and utilities
  return {
    repo: repoQuery.data,
    repoLoading: repoQuery.isLoading,
    repoError: repoQuery.error,
    repoRefetch: repoQuery.refetch,
    languages: langsQuery.data,
    languagesError: langsQuery.error,
    languagesRefetch: langsQuery.refetch,
    contributors: contributorsQuery.data,
    contributorsError: contributorsQuery.error,
    contributorsRefetch: contributorsQuery.refetch,
    health: healthQuery.data,
    healthError: healthQuery.error,
    healthRefetch: healthQuery.refetch,
    difficulty: difficultyQuery.data,
    difficultyError: difficultyQuery.error,
    difficultyRefetch: difficultyQuery.refetch,
    aiSummary: aiQuery.data,
    aiError: aiQuery.error,
    aiRefetch: aiQuery.refetch,
    commitActivity: commitActivityQuery.data,
    commitActivityError: commitActivityQuery.error,
    commitActivityRefetch: commitActivityQuery.refetch,
    hasTimedOut,
    anyError,
    retry: () => {
      // Reset flags before retry
      setHasTimedOut(false);
      setAnyError(false);
      repoQuery.refetch();
      langsQuery.refetch();
      contributorsQuery.refetch();
      healthQuery.refetch();
      difficultyQuery.refetch();
      aiQuery.refetch();
      commitActivityQuery.refetch();
    },
  };
}
