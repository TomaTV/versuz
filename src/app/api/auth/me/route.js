import { getCurrentUser } from "@/lib/auth/server";
import { isAdmin, ghLogin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { user: null },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return Response.json(
    {
      user: {
        email: user.email || null,
        login: ghLogin(user),
        isAdmin: isAdmin(user),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
