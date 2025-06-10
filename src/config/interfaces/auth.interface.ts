export interface JwtConfig {
  secret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  allowedDomains?: string[];
}

export interface AuthConfig {
  jwt: JwtConfig;
  google?: GoogleOAuthConfig;
}
