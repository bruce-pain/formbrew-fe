import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

function decodeJwtExp(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    return payload.exp as number;
  } catch {
    return 0;
  }
}

async function refreshAccessToken(token: JWT): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/token/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token.refreshToken }),
      },
    );

    if (!res.ok) return null;

    const json = await res.json();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: decodeJwtExp(json.access_token),
    };
  } catch {
    return null;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({ authorization: { params: { prompt: "select_account" } } }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          },
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message ?? "Invalid credentials");
        }

        return {
          id: json.data.id,
          email: json.data.email,
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        const idToken =
          typeof account.id_token === "string" ? account.id_token : "";

        // A Google ID token is always a three-segment JWT whose header
        // starts with "eyJ". Guard against a missing or malformed value so
        // the API is never hit with garbage.
        const segments = idToken.split(".");
        const looksLikeJwt =
          idToken.length > 20 &&
          segments.length === 3 &&
          segments[0].startsWith("eyJ");

        if (!looksLikeJwt) {
          throw new Error(
            `Google exchange skipped: id_token missing or malformed (len=${idToken.length})`,
          );
        }

        const exchange = () =>
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_token: idToken }),
            },
          );

        // The backend may be mid-restart during the long Google round-trip;
        // a single retry covers the transient blip before surfacing an error.
        let res: Response;
        try {
          res = await exchange();
        } catch {
          res = await new Promise<Response>((resolve, reject) =>
            setTimeout(() => exchange().then(resolve, reject), 750),
          );
        }

        if (!res.ok) {
          throw new Error("Google exchange with the API failed");
        }

        const json = await res.json();
        token.accessToken = json.access_token;
        token.refreshToken = json.refresh_token;
        token.expiresAt = decodeJwtExp(json.access_token);
        token.id = json.data.id;
        token.email = json.data.email;
        return token;
      }

      if (user) {
        token.accessToken = user.accessToken ?? null;
        token.refreshToken = user.refreshToken ?? null;
        if (user.accessToken) token.expiresAt = decodeJwtExp(user.accessToken);
        token.id = user.id;
        token.email = user.email;
        return token;
      }

      if (!token.expiresAt && token.accessToken) {
        token.expiresAt = decodeJwtExp(token.accessToken);
      }

      if (token.expiresAt && Date.now() / 1000 >= token.expiresAt - 60) {
        if (!token.refreshToken) {
          await signOut({ redirect: false });
          token.accessToken = null;
          token.refreshToken = null;
          return token;
        }

        const refreshed = await refreshAccessToken(token);
        if (refreshed) {
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.expiresAt = refreshed.expiresAt;
        } else {
          await signOut({ redirect: false });
          token.accessToken = null;
          token.refreshToken = null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      if (token.id) session.user.id = token.id;
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
