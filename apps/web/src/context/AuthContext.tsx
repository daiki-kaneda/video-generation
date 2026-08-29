import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as cognitoAuth from "../lib/cognitoAuth";

interface AuthContextValue {
  /** 初回のセッション確認中かどうか */
  isInitializing: boolean;
  isAuthenticated: boolean;
  email?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    cognitoAuth
      .getCurrentSession()
      .then((session) => {
        if (!cancelled) {
          setEmail(session?.email);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmail(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (userEmail: string, password: string) => {
    const tokens = await cognitoAuth.signIn(userEmail, password);
    setEmail(tokens.email ?? userEmail);
  }, []);

  const signUp = useCallback(
    (userEmail: string, password: string) =>
      cognitoAuth.signUp(userEmail, password),
    [],
  );

  const confirmSignUp = useCallback(
    (userEmail: string, code: string) =>
      cognitoAuth.confirmSignUp(userEmail, code),
    [],
  );

  const signOut = useCallback(() => {
    cognitoAuth.signOut();
    setEmail(undefined);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isInitializing,
        isAuthenticated: Boolean(email),
        email,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
