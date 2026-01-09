import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// --- VERCEL COMPATIBLE CONFIG (Stateless JWT) ---
// Database Adapter removed because Vercel Serverless cannot access local SQLite file.
// For production DB, we would move to Turso/Supabase.

export const authOptions: NextAuthOptions = {
    // session: { strategy: 'jwt' }, // Default is jwt when no adapter
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        // Email/Magic Link removed - requires DB
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token, user }) {
            // Send properties to the client, like an access_token from a provider.
            // (session.user as any).role = 'admin'; // Hardcode admin for now or check email logic here
            return session
        }
    },
    pages: {
        signIn: '/auth/signin',
    }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
