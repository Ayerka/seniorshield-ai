import OpenAI from "openai";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    if (pattern.test(text)) signals.push(reason);
  }

  if (links.length) signals.push("Wiadomość zawiera link.");
  if (phones.length) signals.push("Wiadomość zawiera numer telefonu.");

  return [...new Set(signals)];
}

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Brak wiadomości do analizy." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Brakuje OPENAI_API_KEY w pliku .env.local." },
        { status: 500 }
      );
    }

    const detectedLinks = extractLinks(message);
    const detectedPhones = extractPhones(message);
    const localSignals = ruleBasedSignals(message, detectedPhones, detectedLinks);

    const prompt = `
Przeanalizuj wiadomość pod kątem oszustwa internetowego skierowanego do seniorów.

Wiadomość:
${message}

Dodatkowo wykryte elementy:
- Numery telefonu: ${detectedPhones.length ? detectedPhones.join(", ") : "brak"}
- Linki: ${detectedLinks.length ? detectedLinks.join(", ") : "brak"}
- Sygnały regułowe: ${localSignals.length ? localSignals.join("; ") : "brak"}

Zwróć wyłącznie JSON zgodny ze schematem.
Nie strasz użytkownika bez powodu.
Pisz bardzo prostym językiem, jak do osoby starszej.
Nie twierdź, że coś jest na pewno oszustwem, jeżeli nie ma pewności.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Jesteś ostrożnym asystentem cyberbezpieczeństwa dla seniorów. Oceniasz ryzyko scamów, phishingu, podszywania się pod rodzinę, bank, kuriera i próśb o pieniądze. Zawsze dajesz praktyczne, bezpieczne kroki."
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "senior_scam_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              riskScore: { type: "number", minimum: 1, maximum: 10 },
              riskColor: { type: "string", enum: ["green", "yellow", "red"] },
              riskLabel: { type: "string" },
              title: { type: "string" },
              simpleExplanation: { type: "string" },
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
              "reasons",
              "actions",
              "familyMessage"
            ]
          }
        }
      }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

const safeRiskScore = Math.max(
  1,
  Math.min(10, Number(aiResult.riskScore) > 10 ? Math.round(Number(aiResult.riskScore) / 10) : Number(aiResult.riskScore))
);

const safeRiskColor =
  safeRiskScore >= 7 ? "red" :
  safeRiskScore >= 4 ? "yellow" :
  "green";

const safeRiskLabel =
  safeRiskColor === "red" ? "Wysokie ryzyko oszustwa" :
  safeRiskColor === "yellow" ? "Średnie ryzyko" :
  "Niskie ryzyko";

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
      { error: "Wystąpił błąd podczas analizy wiadomości." },
      { status: 500 }
    );
  }
}
