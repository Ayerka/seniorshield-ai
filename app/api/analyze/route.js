import OpenAI from "openai";
import { parsePhoneNumberFromString } from "libphonenumber-js";

function extractLinks(text) {
  const matches = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi);
  return matches ? [...new Set(matches)] : [];
}

function extractPhones(text) {
  const roughMatches = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) || [];
  const cleaned = roughMatches
    .map((raw) => {
      const phone = parsePhoneNumberFromString(raw, "PL");
      if (phone && phone.isValid()) {
        return phone.formatInternational();
      }
      return null;
    })
    .filter(Boolean);

  return [...new Set(cleaned)];
}

function ruleBasedSignals(text, phones, links) {
  const signals = [];
  const patterns = [
    [/blik|kod blik/i, "Wiadomość wspomina o kodzie BLIK."],
    [/pilnie|natychmiast|szybko|zaraz|teraz/i, "Wiadomość wywiera presję czasu."],
    [/nie dzwoń|nie mogę rozmawiać|nie dzwon/i, "Nadawca zniechęca do rozmowy telefonicznej."],
    [/bank|konto|logowanie|hasło|kod sms|potwierdź dane/i, "Wiadomość może podszywać się pod bank lub usługę finansową."],
    [/dopłata|paczka|kurier|inpost|dostawa/i, "Wiadomość może podszywać się pod firmę kurierską."],
    [/przelew|pieniądze|zapłać|opłać|zł/i, "Wiadomość dotyczy pieniędzy lub płatności."],
    [/wnucz|babciu|dziadku|mamo|tato|córko|synu/i, "Ktoś może podszywać się pod bliską osobę."]
  ];

  for (const [pattern, reason] of patterns) {
    if (pattern.test(text)) {
      signals.push(reason);
    }
  }

  if (links.length) signals.push("Wiadomość zawiera link.");
  if (phones.length) signals.push("Wiadomość zawiera numer telefonu.");

  return [...new Set(signals)];
}

function normalizeRiskScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 5;

  if (number > 10) {
    return Math.max(1, Math.min(10, Math.round(number / 10)));
  }

  return Math.max(1, Math.min(10, Math.round(number)));
}

function getRiskColor(score) {
  if (score >= 7) return "red";
  if (score >= 4) return "yellow";
  return "green";
}

function getRiskLabel(color, mode) {
  if (mode === "ai_content") {
    if (color === "red") return "Wysokie ryzyko manipulacji";
    if (color === "yellow") return "Wymaga sprawdzenia";
    return "Niskie ryzyko manipulacji";
  }

  if (color === "red") return "Wysokie ryzyko oszustwa";
  if (color === "yellow") return "Średnie ryzyko";
  return "Niskie ryzyko";
}

function buildPrompt({ mode, message, postLink, detectedPhones, detectedLinks, localSignals }) {
  if (mode === "ai_content") {
    return `
Przeanalizuj treść, screenshot, zdjęcie albo link do posta pod kątem manipulacji, fake newsa i możliwego użycia AI.

Użytkownik może wkleić:
- treść posta,
- opis filmu,
- nagłówek,
- link do TikToka, Facebooka, Instagrama albo artykułu,
- screenshot posta,
- zdjęcie.

WAŻNE:
Nie jesteś zwykłym opisującym obraz. Twoim głównym zadaniem jest wykrywanie manipulacji, deepfake, fake newsów i możliwych treści AI.

Nie mów, że coś jest na pewno wygenerowane przez AI, jeśli nie ma pewności.
Używaj sformułowań: "może być", "wygląda podejrzanie", "wymaga sprawdzenia".

Jeśli analizujesz obraz, sprawdzaj szczególnie:
- nienaturalnie idealną kompozycję,
- powtarzalne wzory,
- dziwne detale architektury,
- nielogiczne światło i cienie,
- zniekształcone napisy,
- nienaturalne dłonie, twarze, oczy,
- elementy, które wyglądają dekoracyjnie, ale fizycznie są mało realne,
- obraz wyglądający jak viralowy post, clickbait albo wygenerowana grafika.

Jeśli obraz wygląda estetycznie, bajkowo, zbyt idealnie lub viralowo, NIE dawaj automatycznie zielonego wyniku.
W takiej sytuacji ustaw co najmniej:
riskScore: 5
riskColor: "yellow"
riskLabel: "Wymaga sprawdzenia"
aiLikelihood: "możliwe użycie AI lub obróbki"
credibility: "niepotwierdzone — wymaga sprawdzenia w innych źródłach"

Zielony wynik możesz dać tylko wtedy, gdy obraz wygląda naturalnie i nie ma widocznych sygnałów manipulacji.
Jeśli nie możesz potwierdzić źródła zdjęcia, napisz to wprost.

Jeśli podano tylko link, zaznacz, że nie pobierasz automatycznie treści posta i najlepiej dodać screenshot lub wkleić opis.

Treść wpisana przez użytkownika:
${message || "brak"}

Link do posta lub strony:
${postLink || "brak"}

Wykryte linki:
${detectedLinks.length ? detectedLinks.join(", ") : "brak"}

Zwróć wyłącznie JSON zgodny ze schematem.
Pisz prostym językiem dla seniora.
`;
  }

  return `
Przeanalizuj wiadomość albo screenshot pod kątem oszustwa internetowego skierowanego do seniorów.

Jeśli dodano screenshot:
1. Najpierw odczytaj tekst widoczny na obrazie.
2. Następnie oceń, czy treść wygląda na scam, phishing, podszywanie się pod bank, kuriera, sklep, pracodawcę albo bliską osobę.
3. W odpowiedzi uwzględnij, że analiza opiera się na treści widocznej na screenie.

Wiadomość wpisana ręcznie:
${message || "brak"}

Dodatkowo wykryte elementy z tekstu wpisanego ręcznie:
- Numery telefonu: ${detectedPhones.length ? detectedPhones.join(", ") : "brak"}
- Linki: ${detectedLinks.length ? detectedLinks.join(", ") : "brak"}
- Sygnały regułowe: ${localSignals.length ? localSignals.join("; ") : "brak"}

Zwróć wyłącznie JSON zgodny ze schematem.
Nie strasz użytkownika bez powodu.
Pisz bardzo prostym językiem, jak do osoby starszej.
Nie twierdź, że coś jest na pewno oszustwem, jeżeli nie ma pewności.
`;
}

export async function POST(request) {
  try {
    const {
      mode = "scam",
      message = "",
      imageDataUrl = "",
      postLink = ""
    } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Brakuje OPENAI_API_KEY w ustawieniach środowiska." },
        { status: 500 }
      );
    }

    if (mode === "scam" && !message.trim() && !imageDataUrl) {
      return Response.json(
        { error: "Brak wiadomości lub screenshota do analizy." },
        { status: 400 }
      );
    }

    if (mode === "ai_content" && !message.trim() && !imageDataUrl && !postLink.trim()) {
      return Response.json(
        { error: "Dodaj tekst, screenshot, zdjęcie albo link do posta." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const textForRules = `${message || ""} ${postLink || ""}`;
    const detectedLinks = extractLinks(textForRules);
    const detectedPhones = extractPhones(textForRules);
    const localSignals = ruleBasedSignals(textForRules, detectedPhones, detectedLinks);

    const prompt = buildPrompt({
      mode,
      message,
      postLink,
      detectedPhones,
      detectedLinks,
      localSignals
    });

    const userContent = imageDataUrl
      ? [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl
            }
          }
        ]
      : prompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            mode === "ai_content"
              ? "Jesteś bardzo ostrożnym asystentem fact-checkingu i bezpieczeństwa cyfrowego dla seniorów. Analizujesz posty, screenshoty i zdjęcia pod kątem manipulacji, fake newsów, clickbaitu, deepfake oraz możliwego użycia AI. Przy obrazach viralowych, bajkowych, zbyt idealnych lub bez potwierdzonego źródła nie dawaj zielonego wyniku. Minimum to żółte ostrzeżenie i sugestia sprawdzenia w innych źródłach. Nigdy nie twierdzisz, że coś jest na pewno wygenerowane przez AI, jeśli nie ma pewności."
              : "Jesteś ostrożnym asystentem cyberbezpieczeństwa dla seniorów. Oceniasz ryzyko scamów, phishingu, podszywania się pod rodzinę, bank, kuriera, sklepy, pracodawców i próśb o pieniądze. Potrafisz analizować tekst oraz screenshoty wiadomości. Zawsze dajesz praktyczne, bezpieczne kroki."
        },
        { role: "user", content: userContent }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "senior_safety_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              riskScore: { type: "number", minimum: 1, maximum: 10 },
              riskColor: { type: "string", enum: ["green", "yellow", "red"] },
              riskLabel: { type: "string" },
              title: { type: "string" },
              simpleExplanation: { type: "string" },
              contentType: { type: "string" },
              aiLikelihood: { type: "string" },
              credibility: { type: "string" },
              reasons: {
                type: "array",
                items: { type: "string" }
              },
              actions: {
                type: "array",
                items: { type: "string" }
              },
              familyMessage: { type: "string" }
            },
            required: [
              "riskScore",
              "riskColor",
              "riskLabel",
              "title",
              "simpleExplanation",
              "contentType",
              "aiLikelihood",
              "credibility",
              "reasons",
              "actions",
              "familyMessage"
            ]
          }
        }
      }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

    const safeRiskScore = normalizeRiskScore(aiResult.riskScore);
    const safeRiskColor = getRiskColor(safeRiskScore);
    const safeRiskLabel = getRiskLabel(safeRiskColor, mode);

    return Response.json({
      ...aiResult,
      riskScore: safeRiskScore,
      riskColor: safeRiskColor,
      riskLabel: safeRiskLabel,
      detectedLinks,
      detectedPhones,
      localSignals
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Wystąpił błąd podczas analizy." },
      { status: 500 }
    );
  }
}