# Ceres Apple Wallet pass (scaffold, disabled)

The "Add to Apple Wallet" button on /gate/ stays hidden until `config.json` has
`"enabled": true` and a `signEndpoint`. GitHub Pages is static and cannot sign
passes, so signing must run on a small server (e.g. a serverless function) that
calls `sign-pass.mjs` and returns the file with
`Content-Type: application/vnd.apple.pkpass`.

Needed before enabling:
1. Apple Developer Program membership (USD 99/yr).
2. A Pass Type ID (Certificates, Identifiers & Profiles > Identifiers > Pass Type IDs).
3. The Pass Type ID certificate + private key, exported to PEM.
4. Apple WWDR intermediate certificate (G4), PEM.
5. A signing endpoint (HTTPS) holding those as secrets. Never commit them here.

Env vars: PASS_TYPE_ID, APPLE_TEAM_ID, PASS_CERT_PATH, PASS_KEY_PATH,
PASS_KEY_PASSPHRASE (optional), WWDR_CERT_PATH, GATE_URL.

    node sign-pass.mjs --name "Jane Doe" --out ./out/ceres.pkpass
