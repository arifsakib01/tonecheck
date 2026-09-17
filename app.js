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
const savageReply = document.querySelector("#savage-reply");
const copySavageButton = document.querySelector("#copy-savage-button");
const shareButton = document.querySelector("#share-button");
const aiScanButton = document.querySelector("#ai-scan-button");
const settingsModal = document.querySelector("#settings-modal");
const apiKeyInput = document.querySelector("#api-key-input");
const API_KEY_KEY = "tonecheck_gemini_key";
const liveTone = document.querySelector("#live-tone");
const liveToneLabel = document.querySelector("#live-tone-label");
const liveToneBar = document.querySelector("#live-tone-bar");
const liveToneTip = document.querySelector("#live-tone-tip");
const historySection = document.querySelector("#history-section");
const historyList = document.querySelector("#history-list");
const scanCount = document.querySelector("#scan-count");
const HISTORY_KEY = "tonecheck_history";

const detectors = [
  { pattern: /\b(fine,?\s+do whatever you want|whatever|i don't care)\b/i, issue: "Dismissive wording hides a real boundary and can pressure the recipient through indirect resentment.", alternative: "I'm not comfortable with this, and I'd like us to discuss an option that works for both of us." },
  { pattern: /\b(always|never|every time|nothing you do)\b/i, issue: "Absolutist language makes the recipient feel judged and shifts the conversation toward arguing about exceptions.", alternative: "When this happens, I feel affected, and I want to talk about this specific situation." },
  { pattern: /\b(i guess|apparently|clearly)\b/i, issue: "This can sound sarcastic or passive-aggressive because it implies a negative conclusion instead of stating the need directly.", alternative: "I may be misunderstanding, so I'd like to check what you meant." },
  { pattern: /\b(you made me|your fault|because of you)\b/i, issue: "Total blame can trigger defensiveness and turns a shared problem into a personal accusation.", alternative: "I felt hurt when this happened, and I want us to work out what to do differently." },
  { pattern: /\b(you don't care|you clearly don't love me|ignoring me)\b/i, issue: "This uses guilt or mind-reading to make the recipient prove their care rather than addressing the immediate concern.", alternative: "I feel unheard right now, and I need more attentive communication." },
  { pattern: /\b(shut up|idiot|stupid|pathetic|selfish|loser)\b/i, issue: "Insults attack the person instead of describing the behavior, which can cause lasting harm.", alternative: "I'm too upset to have a productive conversation right now; I need a pause." },
  { pattern: /\b(if you loved me|prove you care|after all i've done)\b/i, issue: "This frames affection or past effort as leverage, creating guilt instead of inviting an honest choice.", alternative: "This matters to me, and I'd like to understand whether we can find a compromise." },
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
      <span class="truncate">${escapeHtml(item.text)}</span><span class="shrink-0 font-bold ${item.risk === "High" ? "text-red-300" : item.risk === "Medium" ? "text-yellow-300" : "text-green-300"}">${item.risk}</span>
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
      findings.push({ original_quote: sentence, issue: detector.issue, better_alternative: detector.alternative });
    }
  }));
  const intensity = findings.length + (/\!{2,}|[A-Z]{5,}/.test(text) ? 1 : 0);
  const riskLevel = intensity >= 3 ? "High" : intensity >= 1 ? "Medium" : "Low";
  const bangla = /[\u0980-\u09FF]/.test(text);
  const banglish = !bangla && /\b(tumi|tomar|amar|amake|koro|korcho|bhalobasho|shobshomoy|shantovabe)\b/i.test(text);
  const overallVibe = riskLevel === "High"
    ? bangla ? "বার্তাটিতে দোষারোপ, চাপ বা ব্যক্তিগত আক্রমণের অনুভূতি তৈরি হতে পারে।" : "The draft may make the recipient feel blamed, pressured, or personally attacked."
    : riskLevel === "Medium"
      ? bangla ? "বার্তাটি একটি বাস্তব উদ্বেগ প্রকাশ করছে, তবে কিছু শব্দ অপর পক্ষকে আত্মরক্ষামূলক করে তুলতে পারে।" : "The draft communicates a real concern, but some wording may make the recipient defensive."
      : bangla ? "বার্তাটি তুলনামূলকভাবে সরাসরি এবং কম সংঘাতপূর্ণ মনে হচ্ছে।" : "The draft comes across as relatively direct and low-conflict.";
  let rewrite = text.trim();
  if (findings.length) {
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
    savage_reply: createSavageReply(riskLevel, bangla, banglish, findings)
  };
}

function createSavageReply(risk, bangla, banglish, findings) {
  if (bangla) {
    return risk === "High"
      ? "তোমার নাটকটা ভালো, কিন্তু আমি এই স্ক্রিপ্টে আর অভিনয় করছি না।"
      : "ইঙ্গিত না দিয়ে সরাসরি বললে কথাটা দুজনেরই সহজ হতো।";
  }
  if (banglish) {
    return risk === "High"
      ? "Tomar drama bhalo, kintu ami ei script-e ar acting kortesi na."
      : "Hint na diye directly bolle, dujoner-i kotha bola easy hoto.";
  }
  if (risk === "High") return "That was a lot of drama for a conversation that could have used one honest sentence.";
  if (risk === "Medium") return findings.length ? "I understood the subtext. Next time, the direct version will save us both the decoding." : "I’m listening—just leave the sarcasm at the door.";
  return "No red flags detected. You can send this without needing a courtroom defense.";
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
    risk_level: ["High", "Medium", "Low"].includes(data.risk_level) ? data.risk_level : "Medium",
    overall_vibe: data.overall_vibe || "The message may benefit from a closer look.",
    problematic_phrases: Array.isArray(data.problematic_phrases) ? data.problematic_phrases : [],
    full_rewrite: data.full_rewrite || draftInput.value.trim(),
    savage_reply: data.savage_reply || "The subtext is showing. Try saying the direct version next time."
  };
  riskBadge.textContent = `Risk: ${normalized.risk_level}`;
  riskBadge.className = `risk-badge risk-${normalized.risk_level.toLowerCase()}`;
  overallVibe.textContent = normalized.overall_vibe;
  phraseList.innerHTML = normalized.problematic_phrases.length ? normalized.problematic_phrases.map((phrase) => `
    <article class="phrase-card"><p class="mb-3 font-semibold text-ink">“${escapeHtml(phrase.original_quote)}”</p>
    <p class="mb-2 text-sm leading-6 text-muted"><span class="font-bold text-[#d9ded8]">Why it may land poorly:</span> ${escapeHtml(phrase.issue)}</p>
    <p class="text-sm leading-6 text-green-300"><span class="font-bold">Better alternative:</span> ${escapeHtml(phrase.better_alternative)}</p></article>`).join("") : '<p class="text-sm leading-6 text-muted">No clearly problematic phrases were identified.</p>';
  fullRewrite.textContent = normalized.full_rewrite;
  savageReply.textContent = normalized.savage_reply;
  resultsContainer.classList.remove("hidden");
  saveHistory(draftInput.value.trim(), normalized.risk_level);
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

draftInput.addEventListener("input", () => {
  characterCount.textContent = `${draftInput.value.length.toLocaleString()} / 10,000`;
  updateLiveTone(draftInput.value);
});

function openSettings() {
  apiKeyInput.value = localStorage.getItem(API_KEY_KEY) || "";
  settingsModal.classList.remove("hidden");
  settingsModal.classList.add("flex");
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.add("hidden");
  settingsModal.classList.remove("flex");
}

async function runAiScan() {
  const text = draftInput.value.trim();
  if (!text) {
    alert("Paste a draft message before scanning.");
    draftInput.focus();
    return;
  }
  const key = localStorage.getItem(API_KEY_KEY);
  if (!key) {
    openSettings();
    return;
  }
  aiScanButton.disabled = true;
  aiScanButton.textContent = "Thinking...";
  const instruction = `You are ToneCheck, an expert communication analyst. Analyze the user's draft for manipulation, guilt-tripping, gaslighting, passive aggression, insults, defensiveness, sarcasm, and emotional subtext. Understand English, Gen Z slang, Bangla script, Banglish, code-switching, and context. Return only valid JSON with exactly these fields: risk_level (High, Medium, or Low), overall_vibe (one sentence in the dominant language), problematic_phrases (array of objects with original_quote, issue, better_alternative), full_rewrite (a natural rewrite in the dominant language), savage_reply (one witty, concise, shareable comeback that is assertive and playful, not hateful, threatening, or abusive).`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.45 }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Gemini request failed (${response.status}).`);
    const output = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) throw new Error("Gemini returned no analysis.");
    renderResults(JSON.parse(output));
  } catch (error) {
    alert(`Deep scan failed: ${error.message}`);
  } finally {
    aiScanButton.disabled = false;
    aiScanButton.textContent = "Deep AI scan";
  }
}

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
    scanLabel.textContent = "Quick scan";
    loadingSpinner.classList.add("hidden");
  }, 350);
});

aiScanButton.addEventListener("click", runAiScan);
document.querySelector("#settings-button").addEventListener("click", openSettings);
document.querySelector("#close-settings").addEventListener("click", closeSettings);
document.querySelector("#cancel-settings").addEventListener("click", closeSettings);
document.querySelector("#save-settings").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) localStorage.setItem(API_KEY_KEY, key);
  else localStorage.removeItem(API_KEY_KEY);
  closeSettings();
});
settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) closeSettings();
});

document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => {
  draftInput.value = button.dataset.example;
  draftInput.dispatchEvent(new Event("input"));
  draftInput.focus();
}));

document.querySelector("#surprise-button").addEventListener("click", () => {
  const examples = [...document.querySelectorAll("[data-example]")];
  examples[Math.floor(Math.random() * examples.length)].click();
});

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

copySavageButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(savageReply.textContent);
    copySavageButton.textContent = "Copied!";
    window.setTimeout(() => { copySavageButton.textContent = "Copy savage reply"; }, 1600);
  } catch {
    alert("Could not copy the savage reply. Please select and copy it manually.");
  }
});

shareButton.addEventListener("click", async () => {
  const shareText = `ToneCheck found ${riskBadge.textContent.toLowerCase()} in my draft.\n\nSavage reply: “${savageReply.textContent}”\n\nTry it: ${window.location.href}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "ToneCheck result", text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      shareButton.textContent = "Share text copied!";
      window.setTimeout(() => { shareButton.textContent = "Share result"; }, 1800);
    }
  } catch (error) {
    if (error.name !== "AbortError") alert("Could not share this result.");
  }
});

loadHistory();
