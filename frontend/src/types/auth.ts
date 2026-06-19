import type { Session, User } from "@supabase/supabase-js";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (credentials: AuthCredentials) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
};
