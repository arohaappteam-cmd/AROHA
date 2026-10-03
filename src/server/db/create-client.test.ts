import { afterEach, describe, expect, it } from "vitest";

import { connectionOptions } from "./create-client";

const SUPABASE = "postgresql://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

describe("connectionOptions", () => {
  afterEach(() => {
    delete process.env.DATABASE_CA_CERT;
  });

  it("leaves a local URL without sslmode untouched", () => {
    expect(connectionOptions("postgresql://localhost:5432/aroha?schema=public")).toEqual({
      connectionString: "postgresql://localhost:5432/aroha?schema=public",
    });
  });

  it("reads sslmode=require as encrypt-only, the way libpq and the Prisma CLI do", () => {
    const options = connectionOptions(`${SUPABASE}?sslmode=require`);
    expect(options.connectionString).toBe(SUPABASE);
    expect(options).toMatchObject({ ssl: { rejectUnauthorized: false } });
  });

  it("verifies against the provider's CA when one is given", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";
    expect(connectionOptions(`${SUPABASE}?sslmode=require`)).toMatchObject({
      ssl: { ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----" },
    });
  });

  it("always verifies for verify-full", () => {
    expect(connectionOptions(`${SUPABASE}?sslmode=verify-full`)).toMatchObject({ ssl: true });
  });
});
