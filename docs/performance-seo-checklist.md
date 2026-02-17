# ToolNexus Performance & SEO Checklist

## Performance checklist

- [x] Enabled Brotli and Gzip response compression for Web and API.
- [x] Enabled safe output caching for public GET pages (`/`, `/tools`, `/tools/{segment}`, `/sitemap.xml`).
- [x] Enabled HTTP/2 on Kestrel endpoint defaults.
- [x] Switched core shared static assets to minified variants (`site.min.css`, `tool-page.min.js`).
- [x] Added long-lived cache headers for static assets (`Cache-Control: public,max-age=31536000,immutable`).
- [x] Optimized middleware order to run compression before response generation and static handling.
- [x] Added `robots.txt` to allow crawling and advertise sitemap.
- [x] Confirmed dynamic `sitemap.xml` generation remains active.

## Lighthouse optimization report guidance

Use this flow to measure impact consistently:

1. Run both services in Release mode.
2. Open Chrome DevTools Lighthouse (or PageSpeed Insights against deployed URL).
3. Test key routes:
   - `/`
   - `/tools`
   - `/tools/json-formatter` (or another high-traffic tool page)
4. Use these settings:
   - Mode: Navigation
   - Device: Mobile and Desktop (run both)
   - Categories: Performance, SEO, Best Practices
   - Throttling: Simulated Slow 4G + 4x CPU slowdown (default)
5. Capture before/after metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Speed Index
   - Time to Interactive (TTI)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)
   - SEO score and crawlability checks
6. Verify with network panel:
   - `content-encoding` is `br` or `gzip`
   - static assets return `cache-control` with long max-age
   - `sitemap.xml` and `robots.txt` return 200

## Updated configuration summary

- Web/API Kestrel endpoint defaults now include HTTP/2.
- Web app now uses:
  - Response compression (Brotli + Gzip)
  - Output cache middleware
  - Static file cache header policy
- API now uses response compression (Brotli + Gzip).
- SEO crawl configuration now includes `robots.txt` + dynamic sitemap endpoint.
