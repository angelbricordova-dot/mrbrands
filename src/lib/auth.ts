import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Re-checks the admin session close to the data. Every admin action and page calls it. */
export async function requireAdmin() {
  // Session checks compare against the clock, so they always run at request time.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}
