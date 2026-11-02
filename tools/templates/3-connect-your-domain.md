# 3. Send to the customer: connecting their web address

Use this when they already own a domain. Replace [DOMAIN] (for example: wilsonglasstint.com)
and [PROJECT] (their Cloudflare Pages project name, for example: wilson-glass-tint-houston).

**Subject:** One quick step to connect [DOMAIN]

---

Hi [Name],

Your new site is ready! The last step is pointing [DOMAIN] to it. This takes about 5 minutes:

1. Log in to the company where you bought [DOMAIN] (GoDaddy, Namecheap, etc.).
2. Find the **DNS** settings for [DOMAIN] (sometimes called "Manage DNS").
3. **Add a record** with these details:
   - Type: **CNAME**
   - Name / Host: **www**
   - Value / Points to: **[PROJECT].pages.dev**
4. Find **Forwarding** (or "Redirect") and forward **[DOMAIN]** to **https://www.[DOMAIN]**.
5. Save.

That's it. It can take up to a few hours to start working. If any of this is confusing, reply with a screenshot of the page you're on and I'll tell you exactly what to click.

Kyle
RankLocal AI

---

## Your side (Kyle), after they add the record

1. Cloudflare, then **Workers & Pages**, then their project, then **Custom domains**, then **Set up a custom domain**.
2. Enter **www.[DOMAIN]** and confirm. Cloudflare checks the record and turns on the https lock automatically.
3. Open https://www.[DOMAIN] on your phone to make sure it works.
