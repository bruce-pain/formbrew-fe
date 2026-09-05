import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string | null;
    refreshToken: string | null;
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt?: number;
    id?: string;
  }
}
