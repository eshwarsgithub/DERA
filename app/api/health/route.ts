import { NextResponse } from 'next/server';

export async function GET() {
  const hasDB = !!process.env.DATABASE_URL;
  const hasSFMC = !!(
    process.env.SFMC_CLIENT_ID &&
    process.env.SFMC_CLIENT_SECRET &&
    process.env.SFMC_AUTH_BASE_URL &&
    process.env.SFMC_REST_BASE_URL &&
    process.env.SFMC_SOAP_BASE_URL
  );
  return NextResponse.json({
    ok: true,
    hasDB,
    hasSFMC,
    urls: {
      auth: process.env.SFMC_AUTH_BASE_URL ? true : false,
      rest: process.env.SFMC_REST_BASE_URL ? true : false,
      soap: process.env.SFMC_SOAP_BASE_URL ? true : false,
    },
  });
}
