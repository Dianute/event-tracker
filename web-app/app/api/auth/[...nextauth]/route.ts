import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import Database from "better-sqlite3"
import path from "path"
import { v4 as uuidv4 } from 'uuid';

// DB Connection
const dbPath = path.join(process.cwd(), '../backend/events.db');
const db = new Database(dbPath, { verbose: console.log });

// --- Custom SQLite Adapter ---
// Converts Date <-> ISO String for SQLite
function toDate(d: any) { return d ? new Date(d) : null; }
function fromDate(d: any) { return d instanceof Date ? d.toISOString() : d; }

const SqliteAdapter = (db: Database.Database) => {
    return {
        async createUser(user: any) {
            const id = uuidv4();
            const { name, email, emailVerified, image } = user;
            db.prepare('INSERT INTO users (id, name, email, emailVerified, image, role) VALUES (?, ?, ?, ?, ?, ?)')
                .run(id, name, email, fromDate(emailVerified), image, 'user');
            return { ...user, id };
        },
        async getUser(id: string) {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
            if (!user) return null;
            return { ...user, emailVerified: toDate(user.emailVerified) };
        },
        async getUserByEmail(email: string) {
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (!user) return null;
            return { ...user, emailVerified: toDate(user.emailVerified) };
        },
        async getUserByAccount({ provider, providerAccountId }: any) {
            const row = db.prepare(`
        SELECT u.* FROM users u 
        JOIN accounts a ON u.id = a.userId 
        WHERE a.provider = ? AND a.providerAccountId = ?`
            ).get(provider, providerAccountId);
            if (!row) return null;
            return { ...row, emailVerified: toDate(row.emailVerified) };
        },
        async linkAccount(account: any) {
            db.prepare(`
        INSERT INTO accounts (
          id, userId, type, provider, providerAccountId, 
          refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
                uuidv4(), account.userId, account.type, account.provider, account.providerAccountId,
                account.refresh_token, account.access_token, account.expires_at,
                account.token_type, account.scope, account.id_token, account.session_state
            );
            return account;
        },
        async createSession({ sessionToken, userId, expires }: any) {
            const id = uuidv4();
            db.prepare('INSERT INTO sessions (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)')
                .run(id, sessionToken, userId, fromDate(expires));
            return { id, sessionToken, userId, expires };
        },
        async getSessionAndUser(sessionToken: string) {
            const session = db.prepare('SELECT * FROM sessions WHERE sessionToken = ?').get(sessionToken);
            if (!session) return null;
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
            if (!user) return null;
            return {
                session: { ...session, expires: toDate(session.expires) },
                user: { ...user, emailVerified: toDate(user.emailVerified) }
            };
        },
        async updateSession({ sessionToken }: any) {
            // Simplification: NextAuth rarely updates session details other than expiry, but full impl required?
            // For now, return null to force re-fetch or ignore.
            // Actually, better to just return whatever we have.
            return null;
        },
        async deleteSession(sessionToken: string) {
            db.prepare('DELETE FROM sessions WHERE sessionToken = ?').run(sessionToken);
        },
        async createVerificationToken({ identifier, token, expires }: any) {
            db.prepare('INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)')
                .run(identifier, token, fromDate(expires));
            return { identifier, token, expires };
        },
        async useVerificationToken({ identifier, token }: any) {
            const row = db.prepare('SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?').get(identifier, token);
            if (!row) return null;
            db.prepare('DELETE FROM verification_tokens WHERE identifier = ? AND token = ?').run(identifier, token);
            return { ...row, expires: toDate(row.expires) };
        },
    };
};

export const authOptions: NextAuthOptions = {
    // @ts-ignore - Types compatibility specific to this manual adapter
    adapter: SqliteAdapter(db),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD
                }
            },
            from: process.env.EMAIL_FROM
        }),
    ],
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                (session.user as any).role = (user as any).role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin',
    }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
