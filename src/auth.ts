import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validUsername = process.env.AUTH_USERNAME;
        const validPassword = process.env.AUTH_PASSWORD;

        if (!validUsername || !validPassword) {
          console.error("[Auth] AUTH_USERNAME or AUTH_PASSWORD not configured");
          return null;
        }

        if (
          credentials?.username === validUsername &&
          credentials?.password === validPassword
        ) {
          return {
            id: "owner",
            name: "Owner",
            email: validUsername,
          };
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");
      const isCronApi = nextUrl.pathname.startsWith("/api/cron");
      const isHealthApi = nextUrl.pathname.startsWith("/api/health");

      // Always allow auth API, cron API, and health check
      if (isAuthApi || isCronApi || isHealthApi) return true;

      // Redirect authenticated users away from login
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", nextUrl));
      }

      // Require auth for everything else
      if (!isLoggedIn && !isLoginPage) {
        return false; // NextAuth redirects to signIn page
      }

      return true;
    },
  },
});
