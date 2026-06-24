# StatementExcel — SEO & AdSense Guide

## Project Structure

```
/
├── index.html                          ← Main converter (primary keyword page)
├── robots.txt
├── sitemap.xml
├── css/
│   ├── vars.css
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── utils.js                        ← Shared helpers
│   ├── converter.js                    ← Core conversion logic
│   └── layout.js                       ← Header/footer injection
├── pages/
│   ├── how-it-works.html
│   ├── faq.html
│   ├── banks.html
│   ├── privacy.html                    ← Required for AdSense
│   └── terms.html                      ← Required for AdSense
└── seo/
    ├── convert-bank-statement-to-excel.html   ← 2,200 searches/mo
    ├── bank-statement-to-csv.html             ← 1,600 searches/mo
    ├── import-bank-statement-into-excel.html  ← 1,000 searches/mo
    ├── pdf-bank-statement-to-spreadsheet.html ← 800 searches/mo
    └── bank-statement-converter-free.html     ← 3,600 searches/mo
```

---

## AdSense Approval Checklist

Before submitting for AdSense approval, verify:

### Content Requirements
- [x] Original, substantial content on every page (no thin pages)
- [x] Privacy Policy page (pages/privacy.html) — mentions AdSense/cookies
- [x] Terms of Service page (pages/terms.html)
- [x] Clear site navigation on all pages
- [x] No copyright violations
- [x] No misleading claims
- [x] Tool description accurately reflects what it does

### Technical Requirements
- [x] sitemap.xml present and submitted to Google Search Console
- [x] robots.txt present and not blocking Googlebot
- [x] Google Analytics tag on all pages (G-93N4WFXYE1)
- [ ] **REPLACE yourdomain.com with actual domain in all canonical tags**
- [ ] **Update sitemap.xml with actual domain**
- [ ] Site must be live and accessible (not localhost)
- [ ] At least 5–10 pages of content indexed before applying
- [ ] No broken links

### AdSense Ad Slot Setup
Current ad-slot placeholders in HTML:
```html
<div class="ad-slot ad-leaderboard">Advertisement</div>
<div class="ad-slot ad-rectangle">Advertisement</div>
<div class="ad-slot ad-banner">Advertisement</div>
```

Replace these with real AdSense units once approved:
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXX"
     data-ad-slot="XXXXXXXXXX"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

Add AdSense script to `<head>` on all pages:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>
```

---

## SEO Strategy

### Target Keywords (Primary)
| Keyword | Monthly Searches | Page |
|---------|-----------------|------|
| bank statement converter online free | 3,600 | index.html + seo/bank-statement-converter-free.html |
| convert bank statement to excel | 2,200 | seo/convert-bank-statement-to-excel.html |
| bank statement to csv | 1,600 | seo/bank-statement-to-csv.html |
| import bank statement into excel | 1,000 | seo/import-bank-statement-into-excel.html |
| pdf bank statement to spreadsheet | 800 | seo/pdf-bank-statement-to-spreadsheet.html |

### Internal Linking Strategy
- index.html links to all 5 SEO pages in "More Guides" section
- Each SEO page links back to index.html with CTA buttons
- All SEO pages linked from sitemap.xml
- Header nav consistent across all pages

### Schema Markup Implemented
- index.html: WebApplication schema
- SEO pages: Article / HowTo / WebApplication schemas
- All pages: publisher/organization details

### Next Steps for SEO Growth
1. Submit sitemap to Google Search Console
2. Build 5–10 backlinks from finance/productivity blogs
3. Add more long-tail SEO pages:
   - /seo/chase-bank-statement-to-excel.html
   - /seo/bank-of-america-statement-to-excel.html
   - /seo/anz-bank-statement-to-excel.html
   - /seo/westpac-statement-to-excel.html
   - /seo/bank-statement-to-quickbooks.html
   - /seo/bank-statement-to-xero.html
4. Create a blog section for "how to" content targeting informational keywords
5. Add country-specific pages for NZ, AU, UK, CA banks

### Domain Setup
Replace `https://statementexcel.com` in these files:
- index.html (canonical + og:url)
- sitemap.xml (all <loc> entries)
- All pages/\*.html (canonical tags)
- All seo/\*.html (canonical tags)

---

## Known Wiring Fixes Made (v3.1)

1. **Layout presets consolidated** — `applyLayoutPreset()` now lives only in `converter.js`. Removed duplicate inline `<script>` from index.html that was double-firing layout changes.
2. **Dropzone click fixed** — `els.fileInput.click()` now triggers on dropzone click (file input was `display:none`, not inside dropzone flow).
3. **Mobile nav toggle** — Added hamburger toggle button to header with `open` class on `.site-nav`.
4. **Privacy policy** — Added AdSense/Google Analytics cookies disclosure (required for AdSense).
5. **Terms page** — Created full terms.html (required for AdSense).
6. **Schema markup** — Enhanced all pages with proper JSON-LD.
7. **SEO folder** — 5 long-tail pages targeting high-volume keywords.
