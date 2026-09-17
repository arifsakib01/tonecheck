const draftInput = document.querySelector("#draft-input");
const characterCount = document.querySelector("#character-count");
const scanButton = document.querySelector("#scan-button");
const scanLabel = document.querySelector("#scan-label");
const loadingSpinner = document.querySelector("#loading-spinner");
const resultsContainer = document.querySelector("#results-container");
const riskBadge = document.querySelector("#risk-badge");
const overallVibe = document.querySelector("#overall-vibe");
const phraseList = document.querySelector("#phrase-list");
const fullRewrite = document.querySelector("#full-rewrite");
const copyButton = document.querySelector("#copy-button");

document.querySelectorAll(".adsbygoogle").forEach(() => {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.warn("AdSense could not initialize:", error);
  }
});

const detectors = [
  {
    pattern: /\b(fine,?\s+do whatever you want|whatever|i don't care)\b/i,
    issue: "Dismissive wording hides a real boundary and can pressure the recipient through indirect resentment.",
    alternative: "I'm not comfortable with this, and I'd like us to discuss an option that works for both of us."
  },
  {
    pattern: /\b(always|never|every time|nothing you do)\b/i,
    issue: "Absolutist language makes the recipient feel judged and shifts the conversation toward arguing about exceptions.",
    alternative: "When this happens, I feel affected, and I want to talk about this specific situation."
  },
  {
    pattern: /\b(i guess|apparently|clearly)\b/i,
    issue: "This can sound sarcastic or passive-aggressive because it implies a negative conclusion instead of stating the need directly.",
    alternative: "I may be misunderstanding, so I'd like to check what you meant."
  },
  {
    pattern: /\b(you made me|your fault|because of you)\b/i,
    issue: "Total blame can trigger defensiveness and turns a shared problem into a personal accusation.",
    alternative: "I felt hurt when this happened, and I want us to work out what to do differently."
  },
  {
    pattern: /\b(you don't care|you clearly don't love me|ignoring me)\b/i,
    issue: "This uses guilt or mind-reading to make the recipient prove their care rather than addressing the immediate concern.",
    alternative: "I feel unheard right now, and I need more attentive communication."
  },
  {
    pattern: /\b(shut up|idiot|stupid|pathetic|selfish|loser)\b/i,
    issue: "Insults attack the person instead of describing the behavior, which can cause lasting harm.",
    alternative: "I'm too upset to have a productive conversation right now; I need a pause."
  },
  {
    pattern: /\b(if you loved me|prove you care|after all i've done)\b/i,
    issue: "This frames affection or past effort as leverage, creating guilt instead of inviting an honest choice.",
    alternative: "This matters to me, and I'd like to understand whether we can find a compromise."
  },
  {
    pattern: /\b(delulu|be so for real|bsfr|fr|no cap|lowkey|highkey|it's giving|ick|sus|left me on read|left on read)\b/i,
    issue: "Slang can make the message sound mocking, dismissive, or harder to interpret, especially during a serious conversation.",
    alternative: "I want to be clear about how this affected me, so I'll say it directly."
  },
  {
    pattern: /\b(you ate|go off|touch grass|lmao|lol|bruh|bestie)\b/i,
    issue: "This expression may be playful in context, but during conflict it can minimize the other person's feelings or sound sarcastic.",
    alternative: "I hear what you're saying, and I want to respond seriously."
  },
  {
    pattern: /(তুমি আমাকে ইগনোর|আমাকে ইগনোর|তুমি কি আমাকে ভালোবাসো না|তোমার জন্যই|সবসময়|কখনোই না|যা ইচ্ছা করো|তুমি বুঝবে না|চুপ করো|বাজে কথা|তুমি স্বার্থপর)/i,
    issue: "This Bangla wording can communicate blame, dismissal, or an absolute judgment rather than a specific feeling and request.",
    alternative: "তুমি যখন এভাবে করো, তখন আমার খারাপ লাগে। আমরা কি শান্তভাবে বিষয়টি নিয়ে কথা বলতে পারি?"
  },
  {
    pattern: /\b(tumi amake ignore|amake ignore|tumi ki amake bhalobasho na|tomar jonnoi|shobshomoy|sobshomoy|kokhonoই na|kokhono na|ja iccha koro|tumi bujhbe na|chup koro|tumi sharthopor)\b/i,
    issue: "This Banglish wording can sound blaming or dismissive and may hide the specific need behind the message.",
    alternative: "Tumi jokhon evabe koro, amar kharap lage. Amra ki shantovabe eta niye kotha bolte pari?"
  }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function sentences(text) {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

function analyzeLocally(text) {
  const findings = [];
  const seen = new Set();
  sentences(text).forEach((sentence) => {
    detectors.forEach((detector) => {
      if (detector.pattern.test(sentence) && !seen.has(detector.issue)) {
        seen.add(detector.issue);
        findings.push({
          original_quote: sentence,
          issue: detector.issue,
          better_alternative: detector.alternative
        });
      }
    });
  });

  const intensity = findings.length + (/\!{2,}|[A-Z]{5,}/.test(text) ? 1 : 0);
  const riskLevel = intensity >= 3 ? "High" : intensity >= 1 ? "Medium" : "Low";
  const containsBangla = /[\u0980-\u09FF]/.test(text);
  const overallVibe = riskLevel === "High"
    ? containsBangla
      ? "বার্তাটিতে দোষারোপ, চাপ বা ব্যক্তিগত আক্রমণের অনুভূতি তৈরি হতে পারে।"
      : "The draft may make the recipient feel blamed, pressured, or personally attacked."
    : riskLevel === "Medium"
      ? containsBangla
        ? "বার্তাটি একটি বাস্তব উদ্বেগ প্রকাশ করছে, তবে কিছু শব্দ অপর পক্ষকে আত্মরক্ষামূলক করে তুলতে পারে।"
        : "The draft communicates a real concern, but some wording may make the recipient defensive."
      : containsBangla
        ? "বার্তাটি তুলনামূলকভাবে সরাসরি এবং কম সংঘাতপূর্ণ মনে হচ্ছে।"
        : "The draft comes across as relatively direct and low-conflict.";
  const firstAlternative = findings[0]?.better_alternative;
  const rewrite = findings.length
    ? `I want to talk about this calmly and be honest about how it affected me without blaming you. ${firstAlternative} I'd appreciate hearing your perspective so we can find a solution that works for both of us.`
    : text.trim();

  return { risk_level: riskLevel, overall_vibe: overallVibe, problematic_phrases: findings, full_rewrite: rewrite };
}

function renderResults(data) {
  const risk = data.risk_level;
  riskBadge.textContent = `Risk: ${risk}`;
  riskBadge.className = `risk-badge risk-${risk.toLowerCase()}`;
  overallVibe.textContent = data.overall_vibe;
  const phrases = data.problematic_phrases;
  phraseList.innerHTML = phrases.length
    ? phrases.map((phrase) => `
      <article class="phrase-card">
        <p class="mb-3 font-semibold text-ink">“${escapeHtml(phrase.original_quote)}”</p>
        <p class="mb-2 text-sm leading-6 text-muted"><span class="font-bold text-[#d9ded8]">Why it may land poorly:</span> ${escapeHtml(phrase.issue)}</p>
        <p class="text-sm leading-6 text-green-300"><span class="font-bold">Better alternative:</span> ${escapeHtml(phrase.better_alternative)}</p>
      </article>`).join("")
    : '<p class="text-sm leading-6 text-muted">No clearly problematic phrases were identified.</p>';
  fullRewrite.textContent = data.full_rewrite;
  resultsContainer.classList.remove("hidden");
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

draftInput.addEventListener("input", () => {
  characterCount.textContent = `${draftInput.value.length.toLocaleString()} / 10,000`;
});

scanButton.addEventListener("click", () => {
  const text = draftInput.value.trim();
  if (!text) {
    alert("Paste a draft message before scanning.");
    draftInput.focus();
    return;
  }
  scanButton.disabled = true;
  scanLabel.textContent = "Scanning...";
  loadingSpinner.classList.remove("hidden");
  window.setTimeout(() => {
    renderResults(analyzeLocally(text));
    scanButton.disabled = false;
    scanLabel.textContent = "Scan for Red Flags";
    loadingSpinner.classList.add("hidden");
  }, 350);
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(fullRewrite.textContent);
    copyButton.textContent = "Copied!";
    window.setTimeout(() => { copyButton.textContent = "Copy to Clipboard"; }, 1600);
  } catch {
    alert("Could not copy the rewrite. Please select and copy it manually.");
  }
});
