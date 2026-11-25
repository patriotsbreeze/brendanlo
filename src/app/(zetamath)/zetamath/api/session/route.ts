import { cleanUsername, type Account } from "../../_lib/accounts";
import { call, readBody, respond, text } from "../../_server/db";
import { drop, keep, token } from "../../_server/session";

/** Log in, or sign up when `create` is set. */
export async function POST(request: Request) {
  return respond(async () => {
    const { username, password, create } = await readBody(request);
    const started = await call<{ token: string; account: Account }>(
      create === true ? "sign_up" : "log_in",
      { p_username: cleanUsername(text(username)), p_password: text(password) },
    );
    await keep(started.token);
    return { account: started.account };
  });
}

export async function DELETE() {
  return respond(async () => {
    const mine = await token();
    // First, so that it works with the database down: the cookie is the only copy.
    await drop();
    if (mine) await call("log_out", { p_token: mine }).catch((e) => console.error("zetamath:", e));
    return { account: null };
  });
}
