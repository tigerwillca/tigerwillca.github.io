# Soft7 landing (alive) — LOCAL ONLY, NOT DEPLOYED
Built Wed Oct 7, 2026 ~10:10 PM PT. Nothing pushed, nothing deployed.

- Files: index.html (single file, inline CSS/JS, no libraries) + img/033–039.webp (7 card thumbs, ~38 KB each, 440x660).
- Thumbs were made from the exact images in the on-chain metadata (tokenURI -> meta -> image, jsDelivr pin @ae7d304).
- Live, read-only: on load the page calls the public RPC https://rpc.mainnet.chain.robinhood.com (CORS *) for totalSupply,
  ownerOf(1..7) (holder count + short holder address per card), blockNumber (ticks every 12 s), and tokenURI(1..7) -> metadata
  to re-verify each image (green check on each card). If the RPC fails, it shows "offline · showing last check" with the
  Oct 7 values baked in. Blockscout API is NOT used (Cloudflare 403 from scripts).
- Never asks for a wallet. No descriptions from metadata are shown (keeps the payout line off this page).
- Motion: drifting amber/violet motes (canvas, max 70), title sheen, slow shimmer sweep per card, hover/tap reveal of
  species, art slot, holder, link to full art. Respects prefers-reduced-motion.
- Copy uses "my son" (not Billy's name) per the marketing rule. Swap one line if William says to use his name.
- Preview locally: cd /workspace/soft7-launch/landing-alive && python3 -m http.server 8777 --bind 127.0.0.1
- To ship (only on William's yes): copy index.html + img/ into tigerwillca.github.io at the chosen path, open a PR, merge.
