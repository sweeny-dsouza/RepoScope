import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();

  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 0,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onMutate: () => {},
    onSuccess: async () => {
      // Invalidate auth query and clear data immediately
      await utils.auth.me.invalidate();
      utils.auth.me.setData(null);
      // Invalidate all queries to clear other cached data
      await utils.invalidate();
      // Use navigate for SPA routing, then force full reload to ensure state reset
      navigate("/");
      // Hard navigation to guarantee fresh auth state on next load
      window.location.replace("/");
    },
    onError: (error) => {
      console.error("[Logout] Error:", error);
      // Even if logout fails, clear local state and redirect
      navigate("/");
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, error, logout, refetch],
  );
}
