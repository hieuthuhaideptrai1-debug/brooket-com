# Brooket.com — 24/7 public deployment

This package is prepared for a public Node.js web host. After deployment, the
hosting service runs the server instead of your PC, so your PC does not need to
stay on.

## Render
1. Upload this project to a GitHub repository.
2. In Render, create a Web Service from the repository.
3. Use the included `render.yaml`, or set:
   Build: `npm install`
   Start: `npm start`
4. Deploy. The host will provide a public HTTPS address.
5. Add your custom `brooket.com` domain in the host's settings and follow its DNS
   instructions.

## Important data note
If this app stores data in local JSON files, choose a hosting plan with persistent
disk/storage, or move account/leaderboard/Bazaar storage to a database. Otherwise
a host may reset local files during redeploys/restarts.

The final public URL is created by the hosting provider; this ZIP itself cannot
create a public Internet address without a hosting account/domain.
