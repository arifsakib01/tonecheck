# ToneCheck

ToneCheck is a frontend-only communication checker for messages someone sent you or a draft you are about to send. Its primary workflow runs an open-source DistilBERT MNLI model in the browser through Transformers.js to classify red flags, offensive language, manipulation, passive aggression, defensiveness, and risk. A deterministic phrase engine supplies exact evidence, rewrites, and playful replies.

Both scan modes are browser-only. Analyze on-device downloads and caches the open-source ONNX model on first use; Quick local scan uses JavaScript pattern matching and does not download a model. No backend, database, API key, or build tool is required.

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
- Open-source on-device AI verdicts plus a deterministic Quick local scan.
- Copy-to-clipboard support.
- One responsive AdSense placement using publisher `ca-pub-2623777966141033` and slot `8093693497`.
- An `ads.txt` file declaring the authorized AdSense seller.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, SEO metadata, model explanation, and AdSense markup |
| `style.css` | Component styles for the scanner, risk meter, results, and history |
| `app.js` | Local detectors, Transformers.js model scan, scoring, sharing, and clipboard behavior |
| `ads.txt` | Authorized AdSense seller declaration |
| `robots.txt` / `sitemap.xml` | Search crawler guidance |

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
- The page uses one standard AdSense `<ins class="adsbygoogle">` format. It is not an AMP document, so AMP-only markup is intentionally not used.

## Privacy and limitations

ToneCheck is a communication aid, not a therapist, mediator, or definitive toxicity classifier. The open-source model provides repeatable classification scores but can still miss context, dialect, code-switching, and unfamiliar slang. The model is downloaded from the jsDelivr and Hugging Face public CDNs and then cached by the browser; message text is processed in the browser.

The AdSense script is a third-party request and may use cookies or similar technologies. Publish a privacy notice and obtain consent where legally required.

## AI and privacy note

The primary scan uses `Xenova/distilbert-base-uncased-mnli`, an open-source ONNX model, through Transformers.js. It runs with deterministic settings and no remote inference API. The model is English-focused; the phrase engine remains responsible for Bangla and Banglish patterns. A first visit requires downloading the model files from public CDNs.
