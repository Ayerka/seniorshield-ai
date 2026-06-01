"use client";

import { useEffect, useState } from "react";

const example =
  "Babciu, jestem w kłopotach. Potrzebuję szybko 800 zł BLIK-iem. Nie dzwoń, później wszystko wyjaśnię. Mój nowy numer to 600 123 456.";

const aiExample =
  "Sensacyjne nagranie pokazuje, że od jutra wszystkie banki w Polsce zablokują konta seniorów. Udostępnij dalej, zanim usuną ten post.";

const scamCards = [
  {
    title: "Fałszywa dopłata do paczki",
    text: "SMS o dopłacie kilku złotych może prowadzić do fałszywej strony płatności."
  },
  {
    title: "Kod BLIK dla bliskiej osoby",
    text: "Ktoś udaje rodzinę i prosi o szybki kod BLIK. Często pisze, że nie może rozmawiać."
  },
  {
    title: "Fałszywy telefon z banku",
    text: "Oszust podaje się za bank i prosi o hasło, kod SMS albo instalację aplikacji."
  }
];

const faqItems = [
  {
    q: "Czy SeniorShield daje stuprocentową pewność?",
    a: "Nie. Aplikacja ocenia ryzyko na podstawie treści, linków, numerów i widocznych sygnałów. Jeśli masz wątpliwości, skontaktuj się z rodziną, bankiem albo odpowiednią instytucją."
  },
  {
    q: "Czy mogę wklejać dane bankowe albo PESEL?",
    a: "Nie. Nie wklejaj haseł, numeru PESEL, danych karty, loginu do banku ani kodów SMS. Do analizy wystarczy treść wiadomości bez wrażliwych danych."
  },
  {
    q: "Czy aplikacja rozpoznaje AI na 100%?",
    a: "Nie. Wykrywanie treści AI nie jest pewne w 100%. SeniorShield pokazuje sygnały manipulacji i mówi, czy treść wymaga sprawdzenia."
  },
  {
    q: "Co zrobić, jeśli kliknąłem/am podejrzany link?",
    a: "Nie podawaj żadnych danych. Jeśli podałeś/aś dane bankowe lub kod, natychmiast skontaktuj się z bankiem i bliską osobą."
  },
  {
    q: "Czy mogę wysłać wynik rodzinie?",
    a: "Tak. Po analizie możesz skopiować gotową wiadomość do rodziny albo otworzyć SMS lub WhatsApp."
  }
];

function analyzeLinkLocally(rawLink) {
  const link = rawLink.trim().toLowerCase();

  if (!link) {
    return {
      status: "Brak linku",
      color: "yellow",
      score: 0,
      reasons: ["Wklej link, który chcesz sprawdzić."]
    };
  }

  const suspiciousWords = [
    "doplat",
    "dopłata",
    "platnosc",
    "płatność",
    "payment",
    "verify",
    "login",
    "secure",
    "konto",
    "blokada",
    "odbior",
    "odbiór",
    "paczka",
    "inpost",
    "bank",
    "blik"
  ];

  const trustedDomains = [
    "inpost.pl",
    "allegro.pl",
    "olx.pl",
    "gov.pl",
    "mobywatel.gov.pl",
    "poczta-polska.pl",
    "pkobp.pl",
    "mbank.pl",
    "ing.pl",
    "santander.pl",
    "pekao.com.pl"
  ];

  let domain = "";
  let reasons = [];
  let score = 1;

  try {
    const normalized = link.startsWith("http") ? link : `https://${link}`;
    const url = new URL(normalized);
    domain = url.hostname.replace("www.", "");
  } catch {
    return {
      status: "Nieprawidłowy link",
      color: "red",
      score: 8,
      reasons: ["Ten tekst nie wygląda jak poprawny adres strony internetowej."]
    };
  }

  const isTrusted = trustedDomains.some(
    (trusted) => domain === trusted || domain.endsWith(`.${trusted}`)
  );

  if (isTrusted) {
    reasons.push("Domena wygląda jak oficjalna strona znanej instytucji lub firmy.");
    score = 2;
  } else {
    reasons.push("Domena nie znajduje się na liście przykładowych zaufanych domen.");
    score += 2;
  }

  if (suspiciousWords.some((word) => link.includes(word))) {
    reasons.push(
      "Link zawiera słowa często używane w oszustwach, np. płatność, login, paczka lub blokada."
    );
    score += 3;
  }

  if (domain.split(".").length > 3) {
    reasons.push(
      "Adres ma wiele części przed domeną, co czasem bywa używane do podszywania się pod znane marki."
    );
    score += 1;
  }

  if (domain.includes("-")) {
    reasons.push(
      "Domena zawiera myślnik. To nie zawsze oznacza oszustwo, ale bywa używane w fałszywych adresach."
    );
    score += 1;
  }

  if (!link.startsWith("https://") && !link.startsWith("http")) {
    reasons.push(
      "Link nie zawiera początku https://. Warto zachować ostrożność i nie klikać go bez sprawdzenia."
    );
    score += 1;
  }

  score = Math.min(10, Math.max(1, score));

  const color = score >= 7 ? "red" : score >= 4 ? "yellow" : "green";

  const status =
    color === "red"
      ? "Wysokie ryzyko"
      : color === "yellow"
      ? "Wymaga ostrożności"
      : "Niskie ryzyko";

  return { status, color, score, domain, reasons };
}

function RiskResult({ result, onCopy, onSms, onWhatsApp, onRead }) {
  if (!result) return null;

  const riskClass =
    result.riskColor === "red"
      ? "red"
      : result.riskColor === "yellow"
      ? "orange"
      : "green";

  return (
    <div className={`result ${riskClass}`}>
      <div className="result-head">
        <div>
          <p className="eyebrow">Raport bezpieczeństwa</p>
          <h3>{result.title}</h3>
          <div className="status">
            {result.riskLabel} — {result.riskScore}/10
          </div>
        </div>
        <div className="score-circle">{result.riskScore}/10</div>
      </div>

      <p>{result.simpleExplanation}</p>

      <div className="report-grid">
        <div className="report-card">
          <strong>Typ treści</strong>
          <span>{result.contentType || "Wiadomość"}</span>
        </div>
        <div className="report-card">
          <strong>Możliwe AI</strong>
          <span>{result.aiLikelihood || "Nie dotyczy"}</span>
        </div>
        <div className="report-card">
          <strong>Wiarygodność</strong>
          <span>{result.credibility || "Do sprawdzenia"}</span>
        </div>
      </div>

      {(result.detectedPhones?.length > 0 || result.detectedLinks?.length > 0) && (
        <div className="badge-list">
          {result.detectedPhones?.map((phone) => (
            <span className="badge" key={phone}>
              Telefon: {phone}
            </span>
          ))}
          {result.detectedLinks?.map((link) => (
            <span className="badge" key={link}>
              Link: {link}
            </span>
          ))}
        </div>
      )}

      <h4>Dlaczego ostrzegamy?</h4>
      <ul>
        {result.reasons?.map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>

      <h4>Co zrobić teraz?</h4>
      <ul>
        {result.actions?.map((action, index) => (
          <li key={index}>{action}</li>
        ))}
      </ul>

      <h4>Gotowa wiadomość do rodziny</h4>
      <p>{result.familyMessage}</p>

      <div className="buttons-row">
        <button className="button primary" onClick={onCopy}>
          Skopiuj do rodziny
        </button>
        <button className="button secondary" onClick={onSms}>
          Otwórz SMS
        </button>
        <button className="button secondary" onClick={onWhatsApp}>
          Otwórz WhatsApp
        </button>
        <button className="button secondary" onClick={onRead}>
          Czytaj na głos
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("scam");

  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [result, setResult] = useState(null);

  const [linkToCheck, setLinkToCheck] = useState("");
  const [linkResult, setLinkResult] = useState(null);

  const [aiText, setAiText] = useState("");
  const [aiPostLink, setAiPostLink] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState("");
  const [aiImageDataUrl, setAiImageDataUrl] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("seniorshield-history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("large-text-mode", largeText);
    document.body.classList.toggle("high-contrast-mode", highContrast);
  }, [largeText, highContrast]);

  async function analyzeScam() {
    setError("");
    setResult(null);

    if (!message.trim() && !imageDataUrl) {
      setError("Najpierw wklej wiadomość albo dodaj screenshot do sprawdzenia.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scam", message, imageDataUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się przeanalizować wiadomości.");
      }

      setResult(data);
      saveHistory(data, message ? message.slice(0, 80) : "Analiza screenshota wiadomości");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeAiContent() {
    setError("");
    setAiResult(null);

    if (!aiText.trim() && !aiPostLink.trim() && !aiImageDataUrl) {
      setError("Dodaj tekst, screenshot, zdjęcie albo link do posta.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ai_content",
          message: aiText,
          postLink: aiPostLink,
          imageDataUrl: aiImageDataUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się przeanalizować treści.");
      }

      setAiResult(data);
      saveHistory(
        data,
        aiText
          ? aiText.slice(0, 80)
          : aiPostLink
          ? aiPostLink.slice(0, 80)
          : "Analiza obrazu / screenshota"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function saveHistory(data, preview) {
    const newItem = {
      date: new Date().toLocaleString("pl-PL"),
      riskLabel: data.riskLabel,
      riskScore: data.riskScore,
      riskColor: data.riskColor,
      preview
    };

    const updatedHistory = [newItem, ...history].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem("seniorshield-history", JSON.stringify(updatedHistory));
  }


  function fileToJpegDataUrl(file, callback) {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        callback(jpegDataUrl);
      };

      img.onerror = () => {
        setError("Nie udało się odczytać obrazu. Spróbuj dodać inny screenshot albo zdjęcie.");
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Dodany plik musi być obrazem, np. screenshotem SMS-a.");
      return;
    }

    fileToJpegDataUrl(file, (jpegDataUrl) => {
      setImageDataUrl(jpegDataUrl);
      setImagePreview(jpegDataUrl);
      setError("");
    });
  }

  function handleAiImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Dodany plik musi być obrazem, np. screenshotem posta albo zdjęciem.");
      return;
    }

    fileToJpegDataUrl(file, (jpegDataUrl) => {
      setAiImageDataUrl(jpegDataUrl);
      setAiImagePreview(jpegDataUrl);
      setError("");
    });
  }

  function checkLink() {
    setError("");
    setLinkResult(analyzeLinkLocally(linkToCheck));
  }

  function readAloud(targetResult) {
    if (!targetResult) return;

    const text = `
      ${targetResult.title}.
      ${targetResult.riskLabel}. Ocena ${targetResult.riskScore} na 10.
      ${targetResult.simpleExplanation}.
      Co zrobić teraz: ${targetResult.actions?.join(". ")}
    `;

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "pl-PL";
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  }

  async function copyFamilyMessage(targetResult) {
    if (!targetResult?.familyMessage) return;

    await navigator.clipboard.writeText(targetResult.familyMessage);
    alert("Wiadomość do rodziny została skopiowana.");
  }

  function openSms(targetResult) {
    if (!targetResult?.familyMessage) return;
    window.location.href = `sms:?&body=${encodeURIComponent(targetResult.familyMessage)}`;
  }

  function openWhatsApp(targetResult) {
    if (!targetResult?.familyMessage) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(targetResult.familyMessage)}`, "_blank");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("seniorshield-history");
  }

  function clearAll() {
    setMessage("");
    setImagePreview("");
    setImageDataUrl("");
    setResult(null);
    setLinkToCheck("");
    setLinkResult(null);
    setAiText("");
    setAiPostLink("");
    setAiImagePreview("");
    setAiImageDataUrl("");
    setAiResult(null);
    setError("");
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="logo">🛡️</div>
          <div>
            <strong>SeniorShield</strong>
            <span>Bezpieczny Senior w sieci</span>
          </div>
        </div>

        <nav>
          <a href="#sprawdz">Sprawdź</a>
          <a href="#aktualne">Oszustwa</a>
          <a href="#faq">FAQ</a>
          <a href="#historia">Historia</a>
        </nav>
      </header>

      <div className="accessibility-bar">
        <button onClick={() => setLargeText(!largeText)}>
          {largeText ? "A− Normalny tekst" : "A+ Większy tekst"}
        </button>
        <button onClick={() => setHighContrast(!highContrast)}>
          {highContrast ? "Wyłącz kontrast" : "Wysoki kontrast"}
        </button>
        <button onClick={() => readAloud(result || aiResult)} disabled={!result && !aiResult}>
          Czytaj wynik na głos
        </button>
      </div>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">AI przeciw oszustwom i fake newsom</p>
            <h1>Sprawdź wiadomość, link albo treść z internetu</h1>
            <p className="lead">
              SeniorShield pomaga seniorom rozpoznać scam, podejrzany link oraz treści,
              które mogą być zmanipulowane lub wygenerowane przez AI.
            </p>

            <div className="hero-actions">
              <a className="button primary" href="#sprawdz">
                Rozpocznij sprawdzanie
              </a>
              <a className="button secondary" href="#faq">
                Jak to działa?
              </a>
            </div>
          </div>

          <div className="hero-card">
            <div className="trust-list">
              <div>✅ Wiadomości i SMS-y</div>
              <div>✅ Screenshoty rozmów</div>
              <div>✅ Podejrzane linki</div>
              <div>✅ Posty, zdjęcia i treści AI</div>
            </div>
          </div>
        </section>

        <section id="sprawdz" className="section-card checker-card">
          <div className="section-heading">
            <p className="eyebrow">Centrum sprawdzania</p>
            <h2>Wybierz, co chcesz sprawdzić</h2>
            <p>
              Trzy proste tryby w jednym miejscu. Wybierz zakładkę i wklej treść albo
              dodaj obraz.
            </p>
          </div>

          <div className="tabs">
            <button
              className={activeTab === "scam" ? "tab active" : "tab"}
              onClick={() => setActiveTab("scam")}
            >
              Wiadomość
            </button>
            <button
              className={activeTab === "link" ? "tab active" : "tab"}
              onClick={() => setActiveTab("link")}
            >
              Link
            </button>
            <button
              className={activeTab === "ai" ? "tab active" : "tab"}
              onClick={() => setActiveTab("ai")}
            >
              AI / Fake content
            </button>
          </div>

          {activeTab === "scam" && (
            <div className="tab-panel">
              <h3>Sprawdź wiadomość lub screenshot rozmowy</h3>
              <p className="muted">
                Wklej SMS, e-mail, wiadomość z Messengera albo dodaj screenshot.
              </p>

              <label htmlFor="message">Treść wiadomości:</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Np. „Babciu, pilnie wyślij mi kod BLIK. Nie mogę teraz rozmawiać.”"
              />

              <label htmlFor="screenshot">Albo dodaj screenshot wiadomości:</label>
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {imagePreview && (
                <div className="image-preview-box">
                  <p>Dodany screenshot:</p>
                  <img src={imagePreview} alt="Podgląd dodanego screenshota" />
                  <button
                    className="button secondary"
                    onClick={() => {
                      setImageDataUrl("");
                      setImagePreview("");
                    }}
                  >
                    Usuń screenshot
                  </button>
                </div>
              )}

              <p className="privacy-note">
                Nie wpisuj haseł, numerów PESEL, danych karty ani loginów do banku.
              </p>

              <div className="buttons-row">
                <button className="button primary" onClick={analyzeScam} disabled={loading}>
                  {loading ? "Analizujemy..." : "Sprawdź wiadomość"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setMessage(example);
                    setImageDataUrl("");
                    setImagePreview("");
                  }}
                >
                  Wklej przykład
                </button>
                <button className="button secondary" onClick={clearAll}>
                  Wyczyść
                </button>
              </div>

              <RiskResult
                result={result}
                onCopy={() => copyFamilyMessage(result)}
                onSms={() => openSms(result)}
                onWhatsApp={() => openWhatsApp(result)}
                onRead={() => readAloud(result)}
              />
            </div>
          )}

          {activeTab === "link" && (
            <div className="tab-panel">
              <h3>Sprawdź podejrzany link bez otwierania strony</h3>
              <p className="muted">
                Wklej adres z SMS-a, e-maila albo komunikatora. SeniorShield oceni wygląd domeny.
              </p>

              <label htmlFor="linkChecker">Podejrzany link:</label>
              <input
                id="linkChecker"
                className="link-input"
                value={linkToCheck}
                onChange={(e) => setLinkToCheck(e.target.value)}
                placeholder="Np. inpost-doplata24.pl/platnosc"
              />

              <div className="buttons-row">
                <button className="button primary" onClick={checkLink}>
                  Sprawdź link
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setLinkToCheck("inpost-doplata24.pl/platnosc");
                    setLinkResult(null);
                  }}
                >
                  Wklej przykład
                </button>
                <button className="button secondary" onClick={clearAll}>
                  Wyczyść
                </button>
              </div>

              {linkResult && (
                <div
                  className={`result ${
                    linkResult.color === "red"
                      ? "red"
                      : linkResult.color === "yellow"
                      ? "orange"
                      : "green"
                  }`}
                >
                  <div className="result-head">
                    <div>
                      <p className="eyebrow">Analiza linku</p>
                      <h3>{linkResult.status}</h3>
                      <div className="status">Ocena linku — {linkResult.score}/10</div>
                    </div>
                    <div className="score-circle">{linkResult.score}/10</div>
                  </div>

                  {linkResult.domain && (
                    <p>
                      <strong>Wykryta domena:</strong> {linkResult.domain}
                    </p>
                  )}

                  <h4>Dlaczego tak oceniliśmy link?</h4>
                  <ul>
                    {linkResult.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>

                  <h4>Co zrobić?</h4>
                  <ul>
                    <li>Nie klikaj linku, jeśli nie masz pewności, kto go wysłał.</li>
                    <li>Wejdź na stronę firmy samodzielnie, wpisując jej adres w przeglądarce.</li>
                    <li>Nie podawaj danych karty, loginu, hasła ani kodu SMS.</li>
                    <li>Jeśli link dotyczy banku, zadzwoń na oficjalną infolinię banku.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="tab-panel">
              <h3>Sprawdź post, zdjęcie lub treść wygenerowaną przez AI</h3>
              <p className="muted">
                Wklej treść posta, opis filmu, link do TikToka/Facebooka albo dodaj screenshot
                lub zdjęcie. System oceni ryzyko manipulacji, fake newsa i możliwego użycia AI.
              </p>

              <label htmlFor="aiText">Treść posta, opis filmu albo nagłówek:</label>
              <textarea
                id="aiText"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Np. „Sensacyjne nagranie pokazuje, że banki jutro zablokują konta...”"
              />

              <label htmlFor="aiPostLink">Link do posta lub artykułu, jeśli go masz:</label>
              <input
                id="aiPostLink"
                className="link-input"
                value={aiPostLink}
                onChange={(e) => setAiPostLink(e.target.value)}
                placeholder="Np. link do TikToka, Facebooka albo artykułu"
              />

              <label htmlFor="aiImage">Dodaj screenshot posta albo zdjęcie:</label>
              <input
                id="aiImage"
                type="file"
                accept="image/*"
                onChange={handleAiImageUpload}
              />

              {aiImagePreview && (
                <div className="image-preview-box">
                  <p>Dodany obraz:</p>
                  <img src={aiImagePreview} alt="Podgląd dodanego obrazu" />
                  <button
                    className="button secondary"
                    onClick={() => {
                      setAiImageDataUrl("");
                      setAiImagePreview("");
                    }}
                  >
                    Usuń obraz
                  </button>
                </div>
              )}

              <div className="buttons-row">
                <button
                  className="button primary"
                  onClick={analyzeAiContent}
                  disabled={loading}
                >
                  {loading ? "Analizujemy..." : "Sprawdź wiarygodność"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setAiText(aiExample);
                    setAiPostLink("");
                    setAiImageDataUrl("");
                    setAiImagePreview("");
                  }}
                >
                  Wklej przykład
                </button>
                <button className="button secondary" onClick={clearAll}>
                  Wyczyść
                </button>
              </div>

              <RiskResult
                result={aiResult}
                onCopy={() => copyFamilyMessage(aiResult)}
                onSms={() => openSms(aiResult)}
                onWhatsApp={() => openWhatsApp(aiResult)}
                onRead={() => readAloud(aiResult)}
              />
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </section>

        <section id="aktualne" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Aktualne zagrożenia</p>
            <h2>Na to szczególnie uważaj</h2>
            <p>
              Przykłady najczęstszych wiadomości, które mogą prowadzić do wyłudzenia
              pieniędzy lub danych.
            </p>
          </div>

          <div className="cards-grid">
            {scamCards.map((card) => (
              <article className="info-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Jak korzystać?</p>
            <h2>Trzy proste kroki</h2>
          </div>

          <ol className="steps-list">
            <li>Wybierz zakładkę: wiadomość, link albo AI / fake content.</li>
            <li>Wklej treść albo dodaj screenshot.</li>
            <li>Przeczytaj alert i skonsultuj wynik z rodziną, jeśli masz wątpliwości.</li>
          </ol>
        </section>

        <section id="faq" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Najczęstsze pytania</h2>
            <p>Krótko i prostym językiem.</p>
          </div>

          <div className="faq-list">
            {faqItems.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="historia" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Historia</p>
            <h2>Ostatnie analizy</h2>
            <p>Historia jest zapisywana tylko w tej przeglądarce, bez logowania.</p>
          </div>

          {history.length === 0 ? (
            <p>Nie ma jeszcze zapisanych analiz.</p>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div className={`history-item ${item.riskColor}`} key={index}>
                  <strong>
                    {item.riskLabel} — {item.riskScore}/10
                  </strong>
                  <span>{item.date}</span>
                  <p>{item.preview}</p>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <button className="button secondary" onClick={clearHistory}>
              Wyczyść historię
            </button>
          )}
        </section>
      </main>

      <footer>
        SeniorShield pomaga ocenić ryzyko, ale nie zastępuje kontaktu z bankiem, policją
        ani rodziną.
      </footer>
    </>
  );
}