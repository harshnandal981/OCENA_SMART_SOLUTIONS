import { useAuth } from "./useAuth";

export function useUser() {
  const { user, session, loading } = useAuth();

  return {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
  };
}
