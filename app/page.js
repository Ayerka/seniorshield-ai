"use client";

import { useEffect, useState } from "react";

const example =
  "Babciu, jestem w kłopotach. Potrzebuję szybko 800 zł BLIK-iem. Nie dzwoń, później wszystko wyjaśnię. Mój nowy numer to 600 123 456.";

const scamCards = [
  {
    title: "Fałszywa dopłata do paczki",
    text: "Oszust wysyła SMS o dopłacie kilku złotych do przesyłki. Link prowadzi do fałszywej strony płatności."
  },
  {
    title: "Kod BLIK dla bliskiej osoby",
    text: "Ktoś udaje członka rodziny i prosi o szybkie przesłanie kodu BLIK. Często pisze, że nie może rozmawiać."
  },
  {
    title: "Fałszywy telefon z banku",
    text: "Oszust podaje się za pracownika banku i prosi o hasło, kod SMS albo instalację aplikacji."
  }
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("seniorshield-history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("large-text-mode", largeText);
    document.body.classList.toggle("high-contrast-mode", highContrast);
  }, [largeText, highContrast]);

  async function analyze() {
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message, imageDataUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się przeanalizować wiadomości.");
      }

      setResult(data);

      const newItem = {
        date: new Date().toLocaleString("pl-PL"),
        riskLabel: data.riskLabel,
        riskScore: data.riskScore,
        riskColor: data.riskColor,
        preview: message ? message.slice(0, 80) : "Analiza screenshota"
      };

      const updatedHistory = [newItem, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem("seniorshield-history", JSON.stringify(updatedHistory));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Dodany plik musi być obrazem, np. screenshotem SMS-a.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const fileResult = reader.result;
      setImageDataUrl(fileResult);
      setImagePreview(fileResult);
      setError("");
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageDataUrl("");
    setImagePreview("");
  }

  function readResultAloud() {
    if (!result) return;

    const text = `
      ${result.title}.
      ${result.riskLabel}. Ocena ${result.riskScore} na 10.
      ${result.simpleExplanation}.
      Co zrobić teraz: ${result.actions?.join(". ")}
    `;

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "pl-PL";
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  }

  async function copyFamilyMessage() {
    if (!result?.familyMessage) return;

    await navigator.clipboard.writeText(result.familyMessage);
    alert("Wiadomość do rodziny została skopiowana.");
  }

  function openSms() {
    if (!result?.familyMessage) return;
    window.location.href = `sms:?&body=${encodeURIComponent(result.familyMessage)}`;
  }

  function openWhatsApp() {
    if (!result?.familyMessage) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(result.familyMessage)}`, "_blank");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("seniorshield-history");
  }

  const riskClass =
    result?.riskColor === "red"
      ? "red"
      : result?.riskColor === "yellow"
      ? "orange"
      : "green";

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
          <a href="#edukacja">Poradnik</a>
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
        <button onClick={readResultAloud} disabled={!result}>
          Czytaj wynik na głos
        </button>
      </div>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Ochrona przed oszustwami internetowymi</p>
            <h1>Sprawdź wiadomość albo screenshot</h1>
            <p className="lead">
              Wklej SMS, e-mail, wiadomość z komunikatora albo dodaj screenshot.
              SeniorShield przeanalizuje treść z pomocą AI i pokaże prosty wynik.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#sprawdz">Sprawdź wiadomość</a>
              <a className="button secondary" href="#aktualne">Aktualne oszustwa</a>
            </div>
          </div>

          <div className="hero-card">
            <div className="phone-card">
              <p className="message-preview">
                Babciu, pilnie wyślij mi kod BLIK. Nie mogę teraz rozmawiać.
              </p>
              <div className="mini-alert">⚠️ AI: wysokie ryzyko oszustwa</div>
            </div>
          </div>
        </section>

        <section id="sprawdz" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Analiza AI</p>
            <h2>Wklej treść albo dodaj screenshot</h2>
            <p>
              Możesz wkleić tekst wiadomości lub dodać screenshot SMS-a, Messengera,
              WhatsAppa albo e-maila.
            </p>
          </div>

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
              <button className="button secondary" onClick={removeImage}>
                Usuń screenshot
              </button>
            </div>
          )}

          <p className="privacy-note">
            Nie wpisuj haseł, numerów PESEL, danych karty ani loginów do banku.
          </p>

          <div className="buttons-row">
            <button className="button primary" onClick={analyze} disabled={loading}>
              {loading ? "Analizujemy..." : "Sprawdź teraz"}
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
          </div>

          {error && <p className="error">{error}</p>}

          {result && (
            <div className={`result ${riskClass}`}>
              <h3>{result.title}</h3>
              <div className="status">
                {result.riskLabel} — {result.riskScore}/10
              </div>
              <p>{result.simpleExplanation}</p>

              <div className="report-grid">
                <div className="report-card">
                  <strong>Ocena ryzyka</strong>
                  <span>{result.riskScore}/10</span>
                </div>
                <div className="report-card">
                  <strong>Wykryte telefony</strong>
                  <span>{result.detectedPhones?.length || 0}</span>
                </div>
                <div className="report-card">
                  <strong>Wykryte linki</strong>
                  <span>{result.detectedLinks?.length || 0}</span>
                </div>
              </div>

              <div className="badge-list">
                {result.detectedPhones?.map((phone) => (
                  <span className="badge" key={phone}>Telefon: {phone}</span>
                ))}
                {result.detectedLinks?.map((link) => (
                  <span className="badge" key={link}>Link: {link}</span>
                ))}
              </div>

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
                <button className="button primary" onClick={copyFamilyMessage}>
                  Skopiuj do rodziny
                </button>
                <button className="button secondary" onClick={openSms}>
                  Otwórz SMS
                </button>
                <button className="button secondary" onClick={openWhatsApp}>
                  Otwórz WhatsApp
                </button>
                <button className="button secondary" onClick={readResultAloud}>
                  Czytaj na głos
                </button>
              </div>
            </div>
          )}
        </section>

        <section id="aktualne" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Aktualne oszustwa</p>
            <h2>Na to szczególnie uważaj</h2>
            <p>Przykłady najczęstszych wiadomości, które mogą prowadzić do wyłudzenia pieniędzy lub danych.</p>
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

        <section id="edukacja" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Poradnik</p>
            <h2>Jak korzystać z SeniorShield?</h2>
          </div>

          <ol className="steps-list">
            <li>Wklej wiadomość albo dodaj screenshot.</li>
            <li>Kliknij „Sprawdź teraz”.</li>
            <li>Przeczytaj alert i powody ostrzeżenia.</li>
            <li>Nie klikaj linków i nie wysyłaj pieniędzy, jeśli wynik jest podejrzany.</li>
            <li>Skopiuj wiadomość do rodziny i poproś o pomoc.</li>
          </ol>
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
                  <strong>{item.riskLabel} — {item.riskScore}/10</strong>
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
        SeniorShield pomaga ocenić ryzyko, ale nie zastępuje kontaktu z bankiem, policją ani rodziną.
      </footer>
    </>
  );
}