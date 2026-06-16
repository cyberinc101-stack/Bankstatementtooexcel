# StatementExcel — Bank Statement to Excel Converter

## File Structure

```
bankconvert/
├── index.html              ← Main converter tool (homepage)
├── robots.txt              ← SEO crawler rules
├── sitemap.xml             ← SEO sitemap
├── css/
│   ├── vars.css            ← Design tokens (colors, spacing, fonts)
│   ├── base.css            ← Reset + typography
│   ├── layout.css          ← Header, hero, footer, callouts, feature grid
│   └── components.css      ← Tool UI, dropzone, buttons, table, progress
├── js/
│   ├── utils.js            ← Toast, fmtBytes, fmtCurrency, downloadCSV, downloadJSON
│   ├── converter.js        ← Core converter — PDF reading, Claude API call, UI state
│   └── layout.js           ← Header/footer injection, FAQ accordion
└── pages/
    ├── how-it-works.html   ← Step-by-step guide (SEO)
    ├── faq.html            ← FAQ with schema markup (SEO)
    ├── banks.html          ← Supported banks list (SEO)
    ├── privacy.html        ← Privacy policy (required for AdSense)
    └── terms.html          ← Terms of service
```

## How It Works

1. User uploads PDF bank statement
2. Browser reads the PDF as base64
3. API call made from browser → Anthropic Claude API (user's own key)
4. Claude returns structured JSON array of transactions
5. Results render in table; user downloads as CSV

**No server required.** This is a 100% static site.

## Deployment

1. Replace `yourdomain.com` in all HTML files with your real domain
2. Push folder to GitHub
3. Connect to Vercel → auto-deploys as static site (no build step)
4. Submit sitemap.xml to Google Search Console

## AdSense Setup

1. Apply at https://adsense.google.com
2. Once approved, add to every `<head>`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>
   ```
3. Replace `<div class="ad-slot ...">Advertisement</div>` with real ad units

**AdSense requirements met:** Privacy policy ✓, Terms ✓, Original content ✓, Mobile responsive ✓, No prohibited content ✓

## SEO Keywords Targeted

**Primary:**
- bank statement to excel converter
- convert bank statement pdf to excel
- bank statement converter online free
- pdf bank statement to spreadsheet

**Long-tail (per page):**
- how to convert bank statement to excel step by step
- bank statement pdf to csv online free
- import bank statement into excel without manual entry
- chase bank statement to excel converter
- convert bank of america statement to csv
- ANZ bank statement to excel
- bank statement converter no upload required
- convert credit card statement to excel free

## Monetization Options

1. **AdSense** — display ads (easiest, passive)
2. **Upgrade to paid tier** — remove API key requirement, charge $5–10/month
3. **Affiliate** — link to Anthropic API sign-up (if they have a program)

## API Key Note

The tool requires users to bring their own Claude API key. This:
- Keeps infrastructure costs $0
- Ensures user data privacy (goes directly to Anthropic)
- Means you pay nothing for API costs
- Anthropic gives free credits to new users (~$5–10 worth)

To remove the API key requirement (paid SaaS model), add a backend proxy
that uses your own key and charge users per conversion or via subscription.
