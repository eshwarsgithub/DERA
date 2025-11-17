import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers: { GET, POST } } = NextAuth({
  debug: false,
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
});
