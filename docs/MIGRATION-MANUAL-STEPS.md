# Eleventy Migration — Manual Steps

> These steps must be completed by a human. They require browser access to GitHub and Netlify dashboards.

---

## Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Merge migration branch | ⬜ Not started | |
| 2. Configure GitHub Pages source | ⬜ Not started | |
| 3. Verify custom domain | ⬜ Not started | |
| 4. Create Netlify site for Identity | ⬜ Not started | |
| 5. Enable Netlify Identity | ⬜ Not started | |
| 6. Enable Git Gateway | ⬜ Not started | |
| 7. Set registration to Invite Only | ⬜ Not started | |
| 8. Invite yourself | ⬜ Not started | |
| 9. Verify live site | ⬜ Not started | |
| 10. Test Decap CMS | ⬜ Not started | |

---

## 1. Merge the migration branch

The `eleventy-migration` branch contains the full migration. All legacy HTML files are deleted and replaced by Eleventy templates.

1. Push the branch (if not already pushed):
   ```bash
   git push -u origin eleventy-migration
   ```
2. Go to your repo on GitHub
3. Open a Pull Request from `eleventy-migration` → `main`
4. Review the changes, then **Merge** (squash or merge commit — your preference)
5. After merging, the GitHub Actions workflow will trigger automatically

**✅ Done when:** The PR is merged and the Actions tab shows a green "Deploy to GitHub Pages" run.

---

## 2. Configure GitHub Pages to deploy from Actions

By default, GitHub Pages deploys from a branch. You need to switch it to deploy from GitHub Actions.

1. Go to: `https://github.com/<your-user>/wild-care-website/settings/pages`
   (Replace `<your-user>` with your GitHub username and adjust the repo name if different)
2. Under **"Build and deployment"** → **"Source"**, select **"GitHub Actions"** from the dropdown
   - Do NOT select "Deploy from a branch"
3. Click **Save** if prompted

**✅ Done when:** The Source dropdown shows "GitHub Actions".

---

## 3. Verify custom domain

Still on the GitHub Pages settings page:

1. Under **"Custom domain"**, verify `wildcare.space` is set
   - If it's not there, type `wildcare.space` and click **Save**
   - GitHub will run a DNS check — this may take a few minutes
2. Check **"Enforce HTTPS"** is enabled (tick the checkbox if not)
3. Verify your DNS records point to GitHub Pages:
   - If using an apex domain (`wildcare.space`), you need A records pointing to GitHub's IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - If using `www.wildcare.space`, you need a CNAME record pointing to `<your-user>.github.io`
   - The `CNAME` file in the repo already contains `wildcare.space`

**✅ Done when:** The Pages settings show a green checkmark next to your domain and "Your site is live at https://wildcare.space".

---

## 4. Create a Netlify site (for Identity only)

You use Netlify **only** for its free Identity service (OAuth for Decap CMS). The site itself stays on GitHub Pages.

1. Go to `https://app.netlify.com/signup` — sign up or log in (free, no credit card)
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag an empty folder from your desktop onto the upload area (the site doesn't need real content)
4. Once created, rename the site to something recognizable:
   - Go to **Site configuration** → **General** → **Site name** → click **Change site name**
   - Set it to `wildcare-cms` (or similar)
5. Note the site URL: `https://wildcare-cms.netlify.app` — you'll need this later

**✅ Done when:** You have a Netlify site at `https://wildcare-cms.netlify.app` (or your chosen name).

---

## 5. Enable Netlify Identity

1. In your Netlify site dashboard, click **"Integrations"** in the sidebar
2. Find **"Identity"** and click **"Enable"**
   - Alternatively: go to `https://app.netlify.com/sites/wildcare-cms/identity`

**✅ Done when:** The Identity tab shows "Identity is enabled" with 0 users.

---

## 6. Enable Git Gateway

This lets Decap CMS commit to your GitHub repo via Netlify's proxy.

1. In the Identity section, scroll down to **"Services"**
2. Click **"Enable Git Gateway"**
3. It will ask you to connect your GitHub account — authorize it
4. Select the repository that contains the Wild Care website
5. Confirm

**✅ Done when:** Git Gateway shows as "Enabled" under Services.

---

## 7. Set registration to Invite Only

You don't want random people signing up to your CMS.

1. In Identity → **"Registration preferences"**
2. Click **"Edit settings"**
3. Select **"Invite only"**
4. Save

**✅ Done when:** Registration shows "Invite only".

---

## 8. Invite yourself

1. In Identity → click **"Invite users"**
2. Enter your email address
3. Click **"Send"**
4. Check your inbox for the invitation email
5. Click the confirmation link in the email
6. Set a password when prompted

**✅ Done when:** You can log in at `https://wildcare-cms.netlify.app/.netlify/identity` with your email and password.

---

## 9. Verify the live site

After the GitHub Actions deploy completes (Step 1), visit each page and check it loads correctly:

**German (DE) pages:**
- [ ] `https://wildcare.space/` — Home with video hero
- [ ] `https://wildcare.space/team.html`
- [ ] `https://wildcare.space/programm.html`
- [ ] `https://wildcare.space/journal.html` — Should show 2 article cards
- [ ] `https://wildcare.space/mitmachen.html`
- [ ] `https://wildcare.space/kontakt.html` — Form visible, map visible
- [ ] `https://wildcare.space/montagskurs.html`
- [ ] `https://wildcare.space/bewegungsrevolution.html`
- [ ] `https://wildcare.space/impressum.html`
- [ ] `https://wildcare.space/datenschutz.html`
- [ ] `https://wildcare.space/brand.html`

**English (EN) pages:**
- [ ] `https://wildcare.space/en/` — English home
- [ ] `https://wildcare.space/en/team.html`
- [ ] `https://wildcare.space/en/programm.html`
- [ ] `https://wildcare.space/en/journal.html`
- [ ] `https://wildcare.space/en/mitmachen.html`
- [ ] `https://wildcare.space/en/kontakt.html`
- [ ] `https://wildcare.space/en/montagskurs.html`
- [ ] `https://wildcare.space/en/bewegungsrevolution.html`
- [ ] `https://wildcare.space/en/impressum.html`
- [ ] `https://wildcare.space/en/datenschutz.html`

**Journal articles:**
- [ ] `https://wildcare.space/journal/warum-ci.html`
- [ ] `https://wildcare.space/journal/bewegungsrevolution.html`
- [ ] `https://wildcare.space/en/journal/warum-ci.html`
- [ ] `https://wildcare.space/en/journal/bewegungsrevolution.html`

**Functional checks:**
- [ ] Language toggle (DE/EN buttons in nav) switches between locales
- [ ] Mobile nav hamburger menu works (viewport < 968px)
- [ ] Video hero plays on home page
- [ ] Scroll-triggered nav (transparent → solid) works on home page
- [ ] Kontakt form renders (don't submit unless you want to test Formspree)

**✅ Done when:** All pages load, nav works, language toggle works, no broken layouts.

---

## 10. Test Decap CMS

1. Visit `https://wildcare.space/admin/`
2. Click **"Login with Netlify Identity"**
3. Enter the email and password from Step 8
4. **Verify the dashboard** loads showing:
   - Journal (Deutsch)
   - Journal (English)
   - Team
   - Nächste Session
   - Startseite
5. **Create a test post:**
   - Click "Journal (Deutsch)" → "New Journal (Deutsch)"
   - Fill in: Title = "Test", Slug = "cms-test", Date = today, Excerpt = "Test post"
   - Write a sentence in the body
   - Click **"Save"** → then **"Publish"** → **"Publish now"**
6. **Verify the commit:** Go to your GitHub repo → check that a new commit appeared adding `src/journal/de/cms-test.md`
7. **Verify the deploy:** Wait for the GitHub Action to complete → visit `https://wildcare.space/journal.html` → the test post should appear
8. **Delete the test post:** In Decap, open the test post → click "Delete" → confirm → publish the deletion
9. **Verify cleanup:** Another commit removes the file, another deploy removes the post from the listing

**✅ Done when:** You can create, publish, and delete journal posts through the CMS.

---

## Troubleshooting

### GitHub Actions deploy fails
- Check the Actions tab for error logs
- Most common issue: `npm ci` fails if `package-lock.json` is missing or outdated
- Fix: run `npm install` locally and commit the updated `package-lock.json`

### Decap CMS login fails
- Make sure Git Gateway is enabled (Step 6)
- Make sure you accepted the email invitation (Step 8)
- Check browser console for errors — the Identity widget URL must match your Netlify site

### Custom domain not working
- DNS propagation can take up to 48 hours
- Verify DNS records with: `dig wildcare.space +short`
- The CNAME file in the repo must contain `wildcare.space`

### Pages show wrong content or 404
- Clear browser cache or use incognito
- Check that GitHub Pages source is set to "GitHub Actions" (not branch-based)
- Run `npm run build` locally and check `_site/` for the expected files
