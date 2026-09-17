# ToneCheck

ToneCheck is a frontend-only communication checker for draft messages. It flags common toxic, passive-aggressive, dismissive, blaming, manipulative, and insulting phrases, then suggests a clearer alternative and a full rewrite.

The current implementation is deliberately browser-only: draft text is analyzed locally with JavaScript pattern matching. No Gemini API key, backend, database, build tool, or account is required to run the analyzer.

## Features

- Dark, responsive single-page interface.
- English phrase detection.
- Common Gen Z slang detection, including terms such as `delulu`, `no cap`, `lowkey`, `sus`, and `left on read`.
- Bangla-script detection for common blaming, dismissive, and absolute phrases.
- Banglish detection for common transliterated phrases.
- High, Medium, and Low risk scoring.
- Sentence-level phrase cards with explanation and healthier alternatives.
- Full rewrite generation.
- A shareable “savage mode” reply designed for playful social posts.
- Quick local verdicts plus an optional contextual AI deep read.
- Copy-to-clipboard support.
- AdSense placements using publisher `ca-pub-2623777966141033` and slot `8093693497`.
- An `ads.txt` file declaring the authorized AdSense seller.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, Tailwind CDN configuration, and AdSense markup |
| `style.css` | Spinner, risk badges, and phrase-card styles |
| `app.js` | Local detectors, scoring, rendering, and clipboard behavior |

## Run locally

No installation is needed. For the most reliable browser behavior, serve the folder over HTTP instead of opening `index.html` directly:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Opening with `file://` is useful for a quick visual preview, but clipboard permissions and advertising scripts may be restricted.

## Free deployment

### GitHub Pages

1. Create a **public** GitHub repository named `tonecheck`.
2. Upload `index.html`, `style.css`, `app.js`, and `README.md`.
3. Open **Settings → Pages**.
4. Set **Source** to `Deploy from a branch`.
5. Select the default branch and `/ (root)`, then save.
6. Wait for the Pages deployment and open the generated `https://<username>.github.io/tonecheck/` URL.

### Netlify

1. Create a free Netlify account.
2. Choose **Add new site → Import an existing project**.
3. Connect the GitHub repository.
4. Leave the build command empty.
5. Set the publish directory to `/` or the repository root.
6. Deploy.

### Cloudflare Pages

1. Create a free Cloudflare account.
2. Open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select the repository.
4. Use no framework, no build command, and `/` as the output directory.
5. Deploy.

## AdSense deployment checklist

- Ads normally do not render from a `file://` URL. Use the deployed HTTPS URL.
- Replace or confirm the ad slot IDs in `index.html` with the exact units approved in your AdSense account.
- Confirm that `https://arifsakib01.github.io/tonecheck/ads.txt` loads and contains the publisher declaration.
- Add the deployed site in AdSense and complete site review before expecting production ads.
- Add a privacy policy and cookie/consent notice appropriate to your visitors' regions before monetizing.
- Do not click your own ads or encourage visitors to click them.
- The page currently uses the standard AdSense `<ins class="adsbygoogle">` format. It is not an AMP document, so AMP-only markup is intentionally not used.

## Privacy and limitations

ToneCheck is a heuristic detector, not a therapist, mediator, or definitive toxicity classifier. It can miss context, sarcasm, dialect, code-switching, and unfamiliar slang. Text remains in the page memory and is not sent to an AI service by this version.

The AdSense script is a third-party request and may use cookies or similar technologies. Publish a privacy notice and obtain consent where legally required.

## Future open-source AI option

If a richer multilingual model is needed later, a local Ollama service or a self-hosted multilingual model can be added. A browser-only page should not contain a shared private model key; any hosted model integration should use a protected backend or a user-provided local endpoint.
