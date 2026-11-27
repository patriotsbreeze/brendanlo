import { call, callAsServer, readBody, respond, text } from "../../_server/db";
import { googleUser } from "../../_server/google";
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

/** Delete the account and everything in it, given its password, or for an
 * account with none, the Google account linked to it ({credential, proof} from
 * the button). */
export async function DELETE(request: Request) {
  return respond(async () => {
    const { account, password, google } = await readBody(request);
    if (google === undefined) {
      await call("delete_account", {
        p_token: await token(),
        p_username: text(account),
        p_password: text(password),
      });
    } else {
      await callAsServer("google_delete", {
        p_token: await token(),
        p_username: text(account),
        p_google: (await googleUser(google)).sub,
      });
    }
    await drop();
    return { ok: true };
  });
}
