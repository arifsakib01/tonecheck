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
const hiddenIntent = document.querySelector("#hidden-intent");
const clapbackSection = document.querySelector("#clapback-section");
const clapbackList = document.querySelector("#clapback-list");
const flagCount = document.querySelector("#flag-count");
const temperatureLabel = document.querySelector("#temperature-label");
const temperatureBar = document.querySelector("#temperature-bar");
const categoryList = document.querySelector("#category-list");
const liveTone = document.querySelector("#live-tone");
const liveToneLabel = document.querySelector("#live-tone-label");
const liveToneBar = document.querySelector("#live-tone-bar");
const liveToneTip = document.querySelector("#live-tone-tip");
const historySection = document.querySelector("#history-section");
const historyList = document.querySelector("#history-list");
const scanCount = document.querySelector("#scan-count");
const HISTORY_KEY = "tonecheck_history";
let classifierPromise;

function riskColorClass(risk) {
  if (risk === "Biohazard" || risk === "Red Flag") return "text-red-300";
  if (risk === "Yellow") return "text-yellow-300";
  return "text-green-300";
}

const toneTrainingData = [
  ["manipulation", "If you loved me you would do this. Prove you care."],
  ["manipulation", "After everything I have done for you, this is how you treat me."],
  ["manipulation", "You owe me. Do what I say or I will make you regret it."],
  ["manipulation", "A real friend would never say no to me."],
  ["offensive language", "You are an idiot and a pathetic loser."],
  ["offensive language", "Shut up, you stupid asshole."],
  ["offensive language", "What a disgusting and worthless thing to say."],
  ["offensive language", "You are so damn selfish and useless."],
  ["passive aggression", "Fine, do whatever you want. I guess I do not matter."],
  ["passive aggression", "Apparently you are too busy to reply to me."],
  ["passive aggression", "No worries, I am used to being ignored."],
  ["passive aggression", "Sure, that is just perfect. Whatever."],
  ["threat or coercion", "If you leave, you will be sorry."],
  ["threat or coercion", "Do this now or I will expose you."],
  ["threat or coercion", "You better answer me or there will be consequences."],
  ["threat or coercion", "I will hurt myself if you do not stay."],
  ["defensiveness", "I did nothing wrong, you are the problem."],
  ["defensiveness", "Why are you attacking me? I was only trying to help."],
  ["defensiveness", "You always criticize me, so none of this is my fault."],
  ["defensiveness", "Stop bringing up the past and look at what you did."],
  ["sarcasm or mockery", "Wow, congratulations on finally doing the bare minimum."],
  ["sarcasm or mockery", "Sure, genius, explain that one again."],
  ["sarcasm or mockery", "That is cute. Did you really think that would work?"],
  ["sarcasm or mockery", "Great job ruining everything, as usual."],
  ["negging", "You look surprisingly nice today."],
  ["negging", "You are pretty smart for someone like you."],
  ["rage-baiting", "I knew this would make you angry, so I posted it anyway."],
  ["humiliation", "Everyone should see the embarrassing screenshot you sent me."],
  ["cyberbullying", "Keep posting that and nobody will ever like you."],
  ["harassment", "Answer me now. I will keep texting until you do."],
  ["roasting", "That haircut is terrible, but you know I am kidding."],
  ["healthy boundary", "I am not comfortable with that plan, so I need some time to think."],
  ["healthy boundary", "I felt hurt when that happened. Can we talk about it calmly?"],
  ["healthy boundary", "I cannot continue this conversation while we are insulting each other."],
  ["healthy boundary", "I need clearer communication and a respectful compromise."]
];

const toneLabels = [...new Set(toneTrainingData.map(([label]) => label))];

function featureTokens(text) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  const tokens = words.map((word) => word.length > 3 ? word.replace(/'s$/, "") : word);
  return [...tokens, ...tokens.slice(0, -1).map((word, index) => `${word}_${tokens[index + 1]}`)];
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}

function trainToneModel() {
  const documents = toneTrainingData.map(([, text]) => featureTokens(text));
  const documentFrequency = new Map();
  documents.forEach((tokens) => [...new Set(tokens)].forEach((token) => {
    documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }));
  const vocabulary = [...documentFrequency.keys()].filter((token) => documentFrequency.get(token) > 1);
  const index = new Map(vocabulary.map((token, position) => [token, position]));
  const idf = vocabulary.map((token) => Math.log((documents.length + 1) / (documentFrequency.get(token) + 1)) + 1);
  const vectorize = (text) => {
    const counts = new Map();
    featureTokens(text).forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
    const vector = new Float32Array(vocabulary.length);
    counts.forEach((count, token) => {
      const position = index.get(token);
      if (position !== undefined) vector[position] = (1 + Math.log(count)) * idf[position];
    });
    return vector;
  };
  const vectors = documents.map((tokens) => vectorize(tokens.join(" ")));
  const weights = new Map(toneLabels.map((label) => [label, new Float32Array(vocabulary.length + 1)]));
  toneLabels.forEach((label) => {
    const target = toneTrainingData.map(([itemLabel]) => itemLabel === label ? 1 : 0);
    const modelWeights = weights.get(label);
    for (let epoch = 0; epoch < 180; epoch += 1) {
      vectors.forEach((vector, row) => {
        let score = modelWeights[0];
        for (let feature = 0; feature < vector.length; feature += 1) score += modelWeights[feature + 1] * vector[feature];
        const error = sigmoid(score) - target[row];
        modelWeights[0] -= 0.08 * error;
        for (let feature = 0; feature < vector.length; feature += 1) {
          modelWeights[feature + 1] -= 0.08 * error * vector[feature];
        }
      });
    }
  });
  return { vectorize, weights, labels: toneLabels };
}

async function getOpenSourceClassifier() {
  if (!classifierPromise) classifierPromise = Promise.resolve().then(trainToneModel);
  return classifierPromise;
}

function predictTone(model, text) {
  const vector = model.vectorize(text);
  const scores = model.labels.map((label) => {
    const weights = model.weights.get(label);
    let value = weights[0];
    for (let feature = 0; feature < vector.length; feature += 1) value += weights[feature + 1] * vector[feature];
    return sigmoid(value);
  });
  return { labels: model.labels, scores };
}

function buildAiResult(text, prediction) {
  const local = analyzeLocally(text);
  const classifications = prediction.labels.map((label, index) => ({
    label,
    detected: prediction.scores[index] >= 0.55,
    score: Number(prediction.scores[index].toFixed(3)),
    explanation: prediction.scores[index] >= 0.55
      ? `The from-scratch browser classifier found language consistent with ${label.toLowerCase()}.`
      : `The classifier found limited evidence of ${label.toLowerCase()}.`
  }));
  const strongestRisk = Math.max(...prediction.labels
    .map((label, index) => label === "healthy boundary" ? 0 : prediction.scores[index]));
  const hasThreat = prediction.labels.some((label, index) => label === "threat or coercion" && prediction.scores[index] >= 0.62);
  const riskFindings = local.problematic_phrases.filter((phrase) => phrase.category !== "Roasting");
  const rank = hasThreat || riskFindings.length >= 4
    ? "Biohazard"
    : local.risk_level === "High" || strongestRisk >= 0.82
      ? "Red Flag"
      : local.risk_level === "Medium" || strongestRisk >= 0.62
        ? "Yellow"
        : "Green";
  const bangla = /[\u0980-\u09FF]/.test(text);
  const overallVibe = rank === "Biohazard"
    ? "This is not just bad phrasing; it combines pressure or disrespect with a serious boundary violation. Do not get pulled into proving yourself."
    : rank === "Red Flag"
      ? "The sender appears to be using blame, contempt, or emotional pressure to control the direction of the conversation."
      : rank === "Yellow"
        ? "The underlying concern may be real, but the wording uses enough pressure or sarcasm to make a calm conversation harder."
        : bangla ? "বার্তাটিতে বড় কোনো রেড ফ্ল্যাগ পাওয়া যায়নি।" : "No meaningful red flag was detected; this reads as ordinary communication.";
  const clapbacks = rank === "Green" ? [] : [
    "I’m happy to discuss the actual issue, but I’m not participating in guilt, insults, or mind games.",
    "That approach is loud, not convincing. Try saying what you need directly and respectfully.",
    "I understood the subtext. The answer is still no to pressure disguised as communication."
  ];
  const hiddenIntent = rank === "Green"
    ? "No hidden pressure detected."
    : rank === "Yellow"
      ? "The sender may be using sarcasm, guilt, or blame instead of stating the need plainly."
      : "The sender appears to be trying to shift control of the conversation through pressure or disrespect.";
  return { ...local, risk_level: rank, overall_vibe: overallVibe, hidden_intent: hiddenIntent, clapbacks, classifications };
}

const detectors = [
  { pattern: /\b(fine,?\s+do whatever you want|whatever|i don't care)\b/i, issue: "Dismissive wording hides a real boundary and can pressure the recipient through indirect resentment.", alternative: "I'm not comfortable with this, and I'd like us to discuss an option that works for both of us." },
  { pattern: /\b(always|never|every time|nothing you do)\b/i, issue: "Absolutist language makes the recipient feel judged and shifts the conversation toward arguing about exceptions.", alternative: "When this happens, I feel affected, and I want to talk about this specific situation." },
  { pattern: /\b(i guess|apparently|clearly)\b/i, issue: "This can sound sarcastic or passive-aggressive because it implies a negative conclusion instead of stating the need directly.", alternative: "I may be misunderstanding, so I'd like to check what you meant." },
  { pattern: /\b(you made me|your fault|because of you)\b/i, issue: "Total blame can trigger defensiveness and turns a shared problem into a personal accusation.", alternative: "I felt hurt when this happened, and I want us to work out what to do differently." },
  { pattern: /\b(you don't care|you clearly don't love me|ignoring me)\b/i, issue: "This uses guilt or mind-reading to make the recipient prove their care rather than addressing the immediate concern.", alternative: "I feel unheard right now, and I need more attentive communication." },
  { pattern: /\b(shut up|idiot|stupid|pathetic|selfish|loser)\b/i, issue: "Insults attack the person instead of describing the behavior, which can cause lasting harm.", alternative: "I'm too upset to have a productive conversation right now; I need a pause." },
  { pattern: /\b(fuck|fucking|shit|bullshit|bitch|asshole|dumbass)\b/i, issue: "Profanity can intensify the message and make the recipient focus on the attack instead of the underlying issue.", alternative: "I'm very upset about this, and I want to explain what hurt me without insulting you." },
  { pattern: /\b(if you loved me|prove you care|after all i've done)\b/i, issue: "This frames affection or past effort as leverage, creating guilt instead of inviting an honest choice.", alternative: "This matters to me, and I'd like to understand whether we can find a compromise.", category: "Guilt-tripping" },
  { pattern: /\b(surprisingly nice|pretty smart for|not bad for a|you clean up well)\b/i, issue: "This is a backhanded compliment that lowers the recipient's confidence while inviting them to seek approval.", alternative: "You look great today. I mean that sincerely.", category: "Negging" },
  { pattern: /\b(answer me now|keep texting until|won't stop messaging|respond or else)\b/i, issue: "Repeated unwanted contact or pressure to respond can cross into harassment and ignores the recipient's right to pause.", alternative: "Please reply when you have capacity. I will give you space for now.", category: "Harassment" },
  { pattern: /\b(everyone should see|post(?:ing)? your screenshot|share your secret|embarrass you)\b/i, issue: "This threatens public embarrassment or exposure, which is humiliation rather than consensual teasing.", alternative: "I am upset, but I will keep this private and discuss it with you directly.", category: "Humiliation" },
  { pattern: /\b(nobody will ever like you|ugly|loser|worthless|kill yourself)\b/i, issue: "Targeting someone's identity, appearance, or worth to intimidate or isolate them is cyberbullying or abuse, not a joke.", alternative: "I disagree with what happened, but I will address the behavior without attacking your worth.", category: "Cyberbullying" },
  { pattern: /\b(i posted it to make you angry|knew this would trigger you|just to get a reaction)\b/i, issue: "The message openly describes provoking an emotional reaction instead of seeking a genuine conversation.", alternative: "I want to discuss the issue directly rather than provoke a reaction.", category: "Rage-baiting" },
  { pattern: /\b(just kidding|only joking|i'm kidding)\b/i, issue: "A joke may be consensual roasting, but the text alone cannot establish consent or whether both people find it funny.", alternative: "I was trying to tease, but I will stop if that did not feel welcome.", category: "Roasting" },
  { pattern: /\b(delulu|be so for real|bsfr|fr|no cap|lowkey|highkey|it's giving|ick|sus|left me on read|left on read)\b/i, issue: "Slang can make the message sound mocking, dismissive, or harder to interpret during a serious conversation.", alternative: "I want to be clear about how this affected me, so I'll say it directly." },
  { pattern: /\b(you ate|go off|touch grass|lmao|lol|bruh|bestie)\b/i, issue: "This expression may be playful in context, but during conflict it can minimize feelings or sound sarcastic.", alternative: "I hear what you're saying, and I want to respond seriously." },
  { pattern: /(তুমি আমাকে ইগনোর|আমাকে ইগনোর|তুমি কি আমাকে ভালোবাসো না|তোমার জন্যই|সবসময়|কখনোই না|যা ইচ্ছা করো|তুমি বুঝবে না|চুপ করো|বাজে কথা|তুমি স্বার্থপর)/i, issue: "This Bangla wording can communicate blame, dismissal, or an absolute judgment instead of a specific feeling and request.", alternative: "তুমি যখন এভাবে করো, তখন আমার খারাপ লাগে। আমরা কি শান্তভাবে বিষয়টি নিয়ে কথা বলতে পারি?" },
  { pattern: /\b(tumi amake ignore|amake ignore|tumi ki amake bhalobasho na|tomar jonnoi|shobshomoy|sobshomoy|kokhonoই na|kokhono na|ja iccha koro|tumi bujhbe na|chup koro|tumi sharthopor)\b/i, issue: "This Banglish wording can sound blaming or dismissive and may hide the specific need behind the message.", alternative: "Tumi jokhon evabe koro, amar kharap lage. Amra ki shantovabe eta niye kotha bolte pari?" }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function getHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Local history is unavailable.", error);
    return [];
  }
}

function loadHistory() {
  const history = getHistory();
  scanCount.textContent = history.length;
  historySection.classList.toggle("hidden", !history.length);
  historyList.innerHTML = history.slice(0, 5).map((item) => `
    <button type="button" class="history-item w-full text-left" data-history="${escapeHtml(item.text)}">
      <span class="truncate">${escapeHtml(item.text)}</span><span class="shrink-0 font-bold ${riskColorClass(item.risk)}">${escapeHtml(item.risk)}</span>
    </button>`).join("");
  historyList.querySelectorAll("[data-history]").forEach((button) => {
    button.addEventListener("click", () => {
      draftInput.value = button.dataset.history;
      draftInput.dispatchEvent(new Event("input"));
      draftInput.focus();
    });
  });
}

function saveHistory(text, risk) {
  try {
    const next = [{ text, risk }, ...getHistory().filter((item) => item.text !== text)].slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    loadHistory();
  } catch (error) {
    console.warn("Could not save local history.", error);
  }
}

function analyzeLocally(text) {
  const sentences = text.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  const findings = [];
  const seen = new Set();
  sentences.forEach((sentence) => detectors.forEach((detector) => {
    if (detector.pattern.test(sentence) && !seen.has(detector.issue)) {
      seen.add(detector.issue);
      findings.push({ original_quote: sentence, issue: detector.issue, better_alternative: detector.alternative, category: detector.category });
    }
  }));
  const riskFindings = findings.filter((finding) => finding.category !== "Roasting");
  const intensity = riskFindings.length + (/\!{2,}|[A-Z]{5,}/.test(text) ? 1 : 0);
  const riskLevel = intensity >= 3 ? "High" : intensity >= 1 ? "Medium" : "Low";
  const bangla = /[\u0980-\u09FF]/.test(text);
  const banglish = !bangla && /\b(tumi|tomar|amar|amake|koro|korcho|bhalobasho|shobshomoy|shantovabe)\b/i.test(text);
  const overallVibe = riskLevel === "High"
    ? bangla ? "বার্তাটিতে দোষারোপ, চাপ বা ব্যক্তিগত আক্রমণের অনুভূতি তৈরি হতে পারে।" : "The draft may make the recipient feel blamed, pressured, or personally attacked."
    : riskLevel === "Medium"
      ? bangla ? "বার্তাটি একটি বাস্তব উদ্বেগ প্রকাশ করছে, তবে কিছু শব্দ অপর পক্ষকে আত্মরক্ষামূলক করে তুলতে পারে।" : "The draft communicates a real concern, but some wording may make the recipient defensive."
      : bangla ? "বার্তাটি তুলনামূলকভাবে সরাসরি এবং কম সংঘাতপূর্ণ মনে হচ্ছে।" : "The draft comes across as relatively direct and low-conflict.";
  let rewrite = text.trim();
  if (riskFindings.length) {
    if (bangla) {
      rewrite = `আমি শান্তভাবে এই বিষয়টি নিয়ে কথা বলতে চাই এবং দোষারোপ না করে আমার অনুভূতিটা বোঝাতে চাই। ${findings[0].better_alternative} তোমার মতামতও শুনতে চাই, যাতে আমরা দুজনের জন্য ভালো একটি সমাধান খুঁজে নিতে পারি।`;
    } else if (banglish) {
      rewrite = `Ami shantovabe ei bishoyta niye kotha bolte chai, ebong dosharop na kore amar onuvutita bojhate chai. ${findings[0].better_alternative} Tomar motamot-o shunte chai, jate amra dujoner jonno bhalo ekta solution khujte pari.`;
    } else {
      rewrite = `I want to talk about this calmly and be honest about how it affected me without blaming you. ${findings[0].better_alternative} I'd appreciate hearing your perspective so we can find a solution that works for both of us.`;
    }
  }
  return {
    risk_level: riskLevel,
    overall_vibe: overallVibe,
    problematic_phrases: findings,
    full_rewrite: rewrite,
    classifications: []
  };
}

function updateLiveTone(text) {
  if (!text.trim()) {
    liveTone.classList.add("hidden");
    return;
  }

  const findings = analyzeLocally(text).problematic_phrases.length;
  const intensity = Math.min(100, findings * 27 + (/\!{2,}|[A-Z]{5,}/.test(text) ? 18 : 0));
  const level = intensity >= 70 ? "High tension" : intensity >= 30 ? "Needs a softer touch" : "Calm and clear";
  liveTone.classList.remove("hidden");
  liveToneLabel.textContent = level;
  liveToneBar.style.width = `${Math.max(8, intensity)}%`;
  liveToneBar.style.background = intensity >= 70 ? "#fca5a5" : intensity >= 30 ? "#fde047" : "#c9f56a";
  liveToneLabel.style.color = liveToneBar.style.background;
  liveToneTip.textContent = intensity ? "You can still say this. ToneCheck will help you keep the feeling and lose the friction." : "This reads as relatively low-conflict. Scan it for a closer phrase-by-phrase check.";
}

function renderResults(data) {
  const normalized = {
    risk_level: ["Biohazard", "Red Flag", "Yellow", "Green"].includes(data.risk_level) ? data.risk_level : "Yellow",
    overall_vibe: data.overall_vibe || "The message may benefit from a closer look.",
    problematic_phrases: Array.isArray(data.problematic_phrases) ? data.problematic_phrases : [],
    full_rewrite: data.full_rewrite || draftInput.value.trim(),
    hidden_intent: data.hidden_intent || data.overall_vibe || "The message needs a closer look.",
    clapbacks: Array.isArray(data.clapbacks) ? data.clapbacks : [],
    classifications: Array.isArray(data.classifications) ? data.classifications : []
  };
  const rankIcon = { Green: "🟢", Yellow: "🟡", "Red Flag": "🔴", Biohazard: "☢️" };
  riskBadge.textContent = `${rankIcon[normalized.risk_level]} ${normalized.risk_level}`;
  riskBadge.className = `risk-badge risk-${normalized.risk_level.toLowerCase().replace(" ", "-")}`;
  overallVibe.textContent = normalized.overall_vibe;
  hiddenIntent.textContent = normalized.hidden_intent;
  const count = normalized.problematic_phrases.length;
  const intensity = Math.min(100, count * 28 + (["Red Flag", "Biohazard"].includes(normalized.risk_level) ? 15 : 0));
  flagCount.textContent = count;
  temperatureLabel.textContent = ["Red Flag", "Biohazard"].includes(normalized.risk_level) ? "Heated" : normalized.risk_level === "Yellow" ? "Warm" : "Calm";
  temperatureBar.style.width = `${Math.max(8, intensity)}%`;
  temperatureBar.style.background = ["Red Flag", "Biohazard"].includes(normalized.risk_level) ? "#ff8279" : normalized.risk_level === "Yellow" ? "#f2a96d" : "#9ee4a4";
  const categories = [...new Set(normalized.problematic_phrases.map((phrase) => {
    if (phrase.category) return phrase.category;
    const issue = `${phrase.issue} ${phrase.original_quote}`.toLowerCase();
    if (/guilt|leverage|prove|care/.test(issue)) return "Guilt-tripping";
    if (/absolute|always|never|blame|fault/.test(issue)) return "Blame language";
    if (/insult|attack|profan|cruel/.test(issue)) return "Disrespect";
    if (/sarcast|dismiss|slang|mock/.test(issue)) return "Dismissive tone";
    return "Emotional pressure";
  }))];
  const aiCategories = normalized.classifications
    .filter((item) => item && item.detected)
    .map((item) => `${item.label || "Flag"}${item.score !== undefined ? ` ${Math.round(Number(item.score) * 100)}%` : ""}`);
  const displayedCategories = [...new Set([...categories, ...aiCategories])];
  categoryList.innerHTML = displayedCategories
    .map((category) => `<span class="category-chip">${escapeHtml(category)}</span>`).join("");
  phraseList.innerHTML = normalized.problematic_phrases.length ? normalized.problematic_phrases.map((phrase) => `
    <article class="phrase-card"><p class="mb-3 font-semibold text-ink">“${escapeHtml(phrase.original_quote)}”</p>
    ${phrase.category ? `<p class="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f2a96d]">${escapeHtml(phrase.category)}</p>` : ""}
    <p class="mb-2 text-sm leading-6 text-muted"><span class="font-bold text-[#d9ded8]">Why it may land poorly:</span> ${escapeHtml(phrase.issue)}</p>
    <p class="text-sm leading-6 text-green-300"><span class="font-bold">Better alternative:</span> ${escapeHtml(phrase.better_alternative)}</p></article>`).join("") : '<p class="text-sm leading-6 text-muted">No clearly problematic phrases were identified.</p>';
  fullRewrite.textContent = normalized.full_rewrite;
  clapbackSection.classList.toggle("hidden", normalized.risk_level === "Green");
  clapbackList.innerHTML = normalized.clapbacks.map((reply) => `<li>${escapeHtml(reply)}</li>`).join("");
  resultsContainer.classList.remove("hidden");
  saveHistory(draftInput.value.trim(), normalized.risk_level);
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

draftInput.addEventListener("input", () => {
  characterCount.textContent = `${draftInput.value.length.toLocaleString()} / 10,000`;
  updateLiveTone(draftInput.value);
});

async function runAiScan() {
  const text = draftInput.value.trim();
  if (!text) {
    alert("Paste a draft message before scanning.");
    draftInput.focus();
    return;
  }
  scanButton.disabled = true;
  loadingSpinner.classList.remove("hidden");
  scanLabel.textContent = "Training classifier...";
  try {
    const model = await getOpenSourceClassifier();
    scanLabel.textContent = "Analyzing...";
    const prediction = predictTone(model, text);
    renderResults(buildAiResult(text, prediction));
  } catch (error) {
    alert(`The checker could not run: ${error.message}. Please try again.`);
  } finally {
    scanButton.disabled = false;
    loadingSpinner.classList.add("hidden");
    scanLabel.textContent = "Check my message";
  }
}

scanButton.addEventListener("click", runAiScan);

document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
  draftInput.value = button.dataset.example;
  draftInput.dispatchEvent(new Event("input"));
  draftInput.focus();
}));

document.querySelector("#clear-history").addEventListener("click", () => {
  try { localStorage.removeItem(HISTORY_KEY); } catch (error) { console.warn("Could not clear history.", error); }
  loadHistory();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(fullRewrite.textContent);
    copyButton.textContent = "Copied!";
    window.setTimeout(() => { copyButton.textContent = "Copy to Clipboard"; }, 1600);
  } catch (error) {
    alert("Could not copy the rewrite. Please select and copy it manually.");
  }
});

loadHistory();
