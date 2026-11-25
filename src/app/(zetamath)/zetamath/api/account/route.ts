import { call, readBody, respond, text } from "../../_server/db";
import { drop, token } from "../../_server/session";

/* Both name the account on the page. If another tab has logged in as someone else
 * since, the database refuses rather than change the wrong one. */

/** Change the password. */
export async function POST(request: Request) {
  return respond(async () => {
    const { account, current, next } = await readBody(request);
    await call("change_password", {
      p_token: await token(),
      p_username: text(account),
      p_current: text(current),
      p_next: text(next),
    });
    return { ok: true };
  });
}

/** Delete the account and everything in it. */
export async function DELETE(request: Request) {
  return respond(async () => {
    const { account, password } = await readBody(request);
    await call("delete_account", {
      p_token: await token(),
      p_username: text(account),
      p_password: text(password),
    });
    await drop();
    return { ok: true };
  });
}
