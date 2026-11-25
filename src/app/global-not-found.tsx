import type { Metadata } from "next";
import "./(home)/globals.css";

/* Every page has its own root layout ((home), (lab), (zetamath)), so there is
 * no single layout left to compose a 404 from.
 * Per node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
 * this file (behind `experimental.globalNotFound` in next.config.ts) renders
 * unmatched URLs instead.
 *
 * It reproduces the 404 the site served before the split: Next's default
 * not-found markup on top of the home stylesheet. */

export const metadata: Metadata = {
  title: "404: This page could not be found.",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            fontFamily:
              'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
            height: "100vh",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <style>{`body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}`}</style>
            <h1
              className="next-error-h1"
              style={{
                display: "inline-block",
                margin: "0 20px 0 0",
                padding: "0 23px 0 0",
                fontSize: 24,
                fontWeight: 500,
                verticalAlign: "top",
                lineHeight: "49px",
              }}
            >
              404
            </h1>
            <div style={{ display: "inline-block" }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: "49px",
                  margin: 0,
                }}
              >
                This page could not be found.
              </h2>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
