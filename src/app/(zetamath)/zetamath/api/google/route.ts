import { cleanUsername, type Account } from "../../_lib/accounts";
import { suggestUsername } from "../../_lib/google";
import { call, callAsServer, readBody, respond, text } from "../../_server/db";
import { googleUser } from "../../_server/google";
import { keep, token } from "../../_server/session";

/* Each one takes `google`, the button's {credential, proof}, and believes it only
 * once _server/google.ts has checked it. */

/** Log in with Google, or sign up when given a username. With no account for
 * that Google account yet and no username, says so, with a name to start from. */
export async function POST(request: Request) {
  return respond(async () => {
    const { google, username } = await readBody(request);
    const user = await googleUser(google);
    const started = await callAsServer<{ token?: string; account: Account | null }>("google_enter", {
      p_google: user.sub,
      p_username: username === undefined ? null : cleanUsername(text(username)),
    });
    if (!started.token) return { account: null, suggestion: suggestUsername(user.email) };
    await keep(started.token);
    return { account: started.account };
  });
}

/** Link a Google account to the one logged in, given its password. */
export async function PUT(request: Request) {
  return respond(async () => {
    const { google, account, password } = await readBody(request);
    const user = await googleUser(google);
    return callAsServer<{ account: Account }>("google_link", {
      p_token: await token(),
      p_username: text(account),
      p_password: text(password),
      p_google: user.sub,
    });
  });
}

/** Unlink it, given the password. Every other browser is logged out. */
export async function DELETE(request: Request) {
  return respond(async () => {
    const { account, password } = await readBody(request);
    return call<{ account: Account }>("google_unlink", {
      p_token: await token(),
      p_username: text(account),
      p_password: text(password),
    });
  });
}
