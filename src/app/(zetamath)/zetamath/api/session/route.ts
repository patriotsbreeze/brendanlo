import { passwordMatches, signIn, signOut } from "../../_server/owner";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !passwordMatches(body.password)) {
    // Enough to make guessing in a loop tedious.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return Response.json({ error: "wrong password" }, { status: 401 });
  }
  await signIn();
  return Response.json({ owner: true });
}

export async function DELETE() {
  await signOut();
  return Response.json({ owner: false });
}
