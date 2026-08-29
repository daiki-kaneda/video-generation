import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { getRuntimeConfig } from "./runtimeConfig";

let userPool: CognitoUserPool | undefined;

const getUserPool = (): CognitoUserPool => {
  if (!userPool) {
    const config = getRuntimeConfig();
    userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.userPoolClientId,
    });
  }
  return userPool;
};

const getCognitoUser = (email: string): CognitoUser =>
  new CognitoUser({ Username: email, Pool: getUserPool() });

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  /** IDトークンのemailクレーム(通知先メールのデフォルト表示等に利用) */
  email?: string;
}

const toAuthTokens = (session: CognitoUserSession): AuthTokens => ({
  idToken: session.getIdToken().getJwtToken(),
  accessToken: session.getAccessToken().getJwtToken(),
  refreshToken: session.getRefreshToken().getToken(),
  email: session.getIdToken().payload.email as string | undefined,
});

/**
 * メール・パスワードでサインインする (USER_SRP_AUTH)。
 * 既存の Cognito User Pool Client (Hosted UI 不使用) にそのまま対応する。
 */
export const signIn = (email: string, password: string): Promise<AuthTokens> =>
  new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(toAuthTokens(session)),
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject(
          new Error(
            "パスワードの変更が必要です。管理者にお問い合わせください。",
          ),
        ),
    });
  });

export const signUp = (email: string, password: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    getUserPool().signUp(email, password, attributes, [], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

export const confirmSignUp = (
  email: string,
  confirmationCode: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    getCognitoUser(email).confirmRegistration(confirmationCode, true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

/**
 * 現在ログイン中のユーザーの有効なセッションを取得する。
 * アクセストークンが期限切れの場合は自動的にリフレッシュトークンで更新する。
 */
export const getCurrentSession = (): Promise<AuthTokens | null> =>
  new Promise((resolve, reject) => {
    const cognitoUser = getUserPool().getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }
    cognitoUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(null);
          return;
        }
        if (!session.isValid()) {
          reject(new Error("Session is invalid"));
          return;
        }
        resolve(toAuthTokens(session));
      },
    );
  });

export const signOut = (): void => {
  const cognitoUser = getUserPool().getCurrentUser();
  cognitoUser?.signOut();
};
