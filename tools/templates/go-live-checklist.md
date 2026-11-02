# Go-live checklist (for you, Kyle)

Do these in order every time someone pays. Claude can do steps 2–4 for you: just paste what the customer sent.

1. **Payment received?** Check Stripe, then **Payments**, for their name. Don't build the live site until it shows "Succeeded".
2. **Send template 2** ("After they pay") and wait for their logo, photos, hours and so on.
3. **Start their client file:**
   `npm run go-live -- --init "Exact Business Name"`
   This creates `clients/<slug>.json`. Put their photos and logo in `clients/<slug>/` and fill in the file.
4. **Build the site:**
   `npm run go-live -- --client clients/<slug>.json`
   This builds the finished site in `sites/<slug>/`. Open `sites/<slug>/index.html` and check it on your phone.
5. **Put it online:** Cloudflare, then **Workers & Pages**, then **Create**, then **Continue to Pages**, then **Upload files**.
   Name the project the same as `<slug>`, upload the `sites/<slug>` folder (zipped), and click Deploy.
6. **Connect their web address:** send template 3, then add the custom domain on your side.
7. **Send template 4** ("Your site is live").
8. **Track it:** add them to your client list (name, domain, plan, start date, Stripe customer).

## If they cancel
- Cancel the subscription in Stripe (or it cancels itself if they do it).
- Send them a zip of `sites/<slug>/` so they keep their site. That's the fair thing to do and prevents disputes.
- Delete their Cloudflare project after 30 days.

## Rules that keep you out of trouble
- Never put fake reviews, fake licenses or made-up claims ("licensed & insured", "20 years") on a site. Only use what the customer tells you.
- Only use photos they send you or that they confirm are theirs.
- Stop emailing anyone who says no, immediately.
