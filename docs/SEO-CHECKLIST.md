# Zaro Crackers — SEO checklist

Site: **https://www.zarocrackers.com** · Updated 21 Oct 2026

Two parts: what the code already does (nothing to do), and the online work only the
owner can do (accounts, listings, reviews). Tick the boxes as you go.

---

## Part 1 — In the code (done)

| Area | What is in place |
|---|---|
| Crawlable pages | Every URL gets its own title, description, canonical, robots, Open Graph/Twitter tags and structured data in the HTML the server sends (`server/seoHead.mjs`), so Google, Bing and WhatsApp/Facebook previews see the right page even without running JavaScript. Pre-rendered pages are used when the build has Chrome. |
| One canonical domain | `https://www.zarocrackers.com` everywhere; `http`, non-www and the Netlify hosts 301 to it. |
| Sitemap | `/sitemap.xml` is generated live: all pages, 39 categories, every visible product (including ones added in the admin) with product images; hidden products are left out. |
| robots.txt | Blocks cart, checkout, admin, invoice links and APIs; points to the sitemap. |
| Real 404s | Unknown pages and products return a proper 404, not the home page. |
| Page content in the HTML | The server also writes each page's heading, text, prices, breadcrumbs and links into the HTML (`server/seoBody.mjs`), so crawlers that do not run JavaScript (and link previews) see real content. The app replaces it when it loads. |
| Bing, Yandex and others | IndexNow: the sitemap is sent after every deploy, and changed pages on Publish now or product save (`server/indexNow.mjs`). |
| Icons | favicon.ico, 192/512 app icons, Apple touch icon and a web manifest. |
| Structured data | Store/LocalBusiness (address, hours, phones, geo), WebSite, BreadcrumbList, ItemList (price list, categories), Product with INR Offer and `priceValidUntil`, FAQPage (home), Article (guides). |
| Landing pages | 39 category pages, product pages, a Guides index and 5 guides, including pages written for the searches "buy crackers online" (/guides/buy-crackers-online), "best crackers for Diwali" (/guides/best-crackers-for-diwali) and "Sivakasi crackers wholesale price" (/guides/sivakasi-crackers-wholesale-price), FAQ, Track Order. |
| Readable product URLs | `/product/2-3-4-inch-kuruvi-zc-003` (name + code, always unique). Old `/product/zc-003` links and renamed products 301-redirect to the current address, keeping any `?utm` tags. |
| Title length | Automatic titles are shortened to fit Google's ~60 characters with "\| Zaro Crackers". Any title can be changed in Admin → SEO. |
| On-page | Keyword-led headings ("Sivakasi crackers…"), descriptive image alt text, Tamil names, internal links (category grid, footer). |
| Speed | WebP images, 192px copies for price-list thumbnails, compressed logo, admin sign-in code and checkout split out, fonts load without blocking, long cache headers. |
| Brand signals | Business and website structured data list the name plus alternate spellings (ZARO Crackers, Zaro Crackers Sivakasi, Zaro Crackers Traders, Zaro Fireworks, zarocrackers) and the logo; the home page shows "Zaro Crackers · Sivakasi" and an About Zaro Crackers section; FAQ answers "Where is Zaro Crackers located?". |
| Analytics hook | Google Analytics 4 page views and purchase events switch on as soon as an ID is saved in Admin → Settings. Admin pages are never tracked. |

When products change in the admin (price, name, new product, hidden, photo), titles,
structured data and the sitemap update as soon as the product is saved (Admin → SEO → Publish now
for page titles). No rebuild needed.

---

## Part 2 — Online work (owner)

### 1. Publish the current code (blocks everything else)
- [ ] GoDaddy → Node.js hosting → ZaroCrackers → **Update Preview** → check → **Publish to Live**.
- [ ] Check https://www.zarocrackers.com shows the title "Zaro Crackers | Sivakasi Crackers Online at Wholesale Prices".

### Brand search: "zaro" being corrected to "zara"
Google corrects "zaro" to "zara" only because it has not indexed www.zarocrackers.com yet and does not
know the brand exists. It stops once the site is indexed and other sites confirm the name. In order:
- [ ] Publish (step 1), then in Search Console **URL Inspection → Request indexing** for the home page and `/about`.
- [ ] Create the Google Business Profile with the name exactly **Zaro Crackers** (step 3). This is the strongest brand signal.
- [ ] Use the exact same name, address, phone and `https://www.zarocrackers.com` on Instagram, Facebook, Justdial and IndiaMART (step 5).
- [ ] Ask customers to search **"Zaro Crackers Sivakasi"** and leave a Google review; real searches and reviews teach Google the name.
- [ ] Check after 1–2 weeks: search `site:zarocrackers.com`. Pages listed = indexed. Then search "zaro crackers".

### 2. Google Search Console (day 1, ~15 min)
- [ ] https://search.google.com/search-console → **Add property** → **Domain** → `zarocrackers.com`.
- [ ] Copy the TXT record → GoDaddy → Domains → zarocrackers.com → **DNS** → Add → Type **TXT**, Name **@**, Value = the record → Save → back in Search Console click **Verify** (can take up to an hour).
- [ ] **Sitemaps** → submit `https://www.zarocrackers.com/sitemap.xml`.
- [ ] **URL Inspection** → request indexing for: `/`, `/price-list`, `/crackers/gift-box-net-rated`, `/crackers/10-cm-sparklers`, `/guides/diwali-crackers-buying-guide`.
- [ ] After a week: **Pages** report (fix anything "Not indexed" that should be), **Enhancements** (Products, Breadcrumbs, FAQ) should show valid items.

### 3. Google Business Profile (day 1–2; biggest impact for "crackers shop near me")
- [ ] https://business.google.com → **Add business** → name **Zaro Crackers**, category **Fireworks store** (add "Wholesaler" as a secondary category).
- [ ] Address exactly as on the site: *Sivakasi to Sattur Bypass Road, Sivakasi, Tamil Nadu 626189*. Phone +91 70109 35230, website https://www.zarocrackers.com.
- [ ] Hours: Mon–Sat 9:00–22:00, Sun 10:00–20:00 (add special hours for Diwali week).
- [ ] Verify (postcard, phone or video, whatever Google offers).
- [ ] Add 10+ photos: shop front, inside, product shelves, gift boxes, packing. Add the logo and a cover photo.
- [ ] Add products (gift boxes, combos) with prices and a link to each product page.
- [ ] Post an update weekly in October–November (offers, new arrivals).

### 4. Reviews (ongoing)
- [ ] In Business Profile, copy the **"Ask for reviews"** short link.
- [ ] Send it to happy customers on WhatsApp after delivery (the order page's WhatsApp button is a good moment).
- [ ] Reply to every review, good or bad, within a few days.
- [ ] Goal: 20+ reviews before next Diwali season. When there are genuine reviews on the site itself, ask for star ratings to be added to the structured data.

### 5. Same name, address, phone everywhere (week 1)
Use exactly the same details as the website on each:
- [ ] Justdial (https://www.justdial.com/Free-Listing)
- [ ] IndiaMART seller listing (https://seller.indiamart.com)
- [ ] Sulekha business listing
- [ ] Facebook page (with the website link and WhatsApp button)
- [ ] Instagram bio: link to https://www.zarocrackers.com (and a link to the price list PDF in highlights)
- [ ] Bing Places (https://www.bingplaces.com → import from Google Business Profile)

### 6. Bing Webmaster Tools (5 min)
- [ ] https://www.bing.com/webmasters → **Import from Google Search Console** → submit the same sitemap.

### 7. Google Analytics 4 (15 min)
- [ ] https://analytics.google.com → create a property "Zaro Crackers" → Web stream for `https://www.zarocrackers.com` → copy the **Measurement ID** (`G-…`).
- [ ] Paste it in **Admin → Settings → Google Analytics 4 measurement ID** → Save settings. It is live within a minute; no deploy needed.
- [ ] In GA4 Admin → **Search Console links** → link the property.

### 8. Links and mentions (ongoing, slow but compounding)
- [ ] Ask suppliers / brands you stock to list you as a dealer with a link.
- [ ] Local news or blogs doing "where to buy crackers in Sivakasi" or Diwali shopping guides.
- [ ] Share category and guide pages (not only the home page) on WhatsApp groups and social media in the season.

### 9. Before every Diwali season
- [ ] Update the price list PDF and product prices in the admin by mid-September.
- [ ] Refresh the buying guide year/dates (ask for the guide text to be updated).
- [ ] Check Search Console for errors and request indexing of the price list again.
- [ ] Update Business Profile special hours and post the season offer.

---

## Quick health checks (any time)
- https://www.zarocrackers.com/robots.txt → plain text
- https://www.zarocrackers.com/sitemap.xml → XML with ~250 URLs
- https://search.google.com/test/rich-results → paste a product URL → "Product" detected
- https://pagespeed.web.dev → paste the home page → aim for 80+ on mobile
