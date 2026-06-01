"use client";

import { useState } from "react";

const example = "Babciu, jestem w kłopotach. Potrzebuję szybko 800 zł BLIK-iem. Nie dzwoń, później wszystko wyjaśnię. Mój nowy numer to 600 123 456.";

export default function Home() {
 const [message, setMessage] = useState("");
const [imagePreview, setImagePreview] = useState("");
const [imageDataUrl, setImageDataUrl] = useState("");
const [result, setResult] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

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
    const result = reader.result;
    setImageDataUrl(result);
    setImagePreview(result);
    setError("");
  };

  reader.readAsDataURL(file);
}

function removeImage() {
  setImageDataUrl("");
  setImagePreview("");
}
  const riskClass =
    result?.riskColor === "red" ? "red" :
    result?.riskColor === "yellow" ? "orange" :
    "green";

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
          <a href="#pomoc">Pomoc</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Wersja z AI</p>
            <h1>Sprawdź, czy wiadomość jest bezpieczna</h1>
            <p className="lead">
              Wklej SMS, e-mail, link albo wiadomość z komunikatora. System przeanalizuje treść,
              numery telefonu i linki, a wynik pokaże prostym językiem.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#sprawdz">Sprawdź wiadomość</a>
              <a className="button secondary" href="#edukacja">Zobacz poradnik</a>
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
            <p className="eyebrow">Analiza wiadomości</p>
            <h2>Wklej podejrzaną wiadomość</h2>
            <p>
              Możesz wkleić SMS, e-mail, wiadomość z Messengera, WhatsAppa albo podejrzany link.
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
            Nie wpisuj tutaj haseł, numerów PESEL, danych karty ani loginów do banku.
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
              <div className="status">{result.riskLabel} — {result.riskScore}/10</div>
              <p>{result.simpleExplanation}</p>

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
                {result.reasons?.map((reason, index) => <li key={index}>{reason}</li>)}
              </ul>

              <h4>Co zrobić teraz?</h4>
              <ul>
                {result.actions?.map((action, index) => <li key={index}>{action}</li>)}
              </ul>

              <h4>Gotowa wiadomość do rodziny</h4>
              <p>{result.familyMessage}</p>
            </div>
          )}
        </section>

        <section id="edukacja" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Poradnik</p>
            <h2>Naucz się rozpoznawać oszustwa</h2>
            <p>Krótkie porady dla seniorów i ich rodzin.</p>
          </div>

          <div className="cards-grid">
            <article className="info-card">
              <h3>Oszustwo na wnuczka</h3>
              <p>Ktoś udaje bliską osobę, prosi o pieniądze i zniechęca do rozmowy telefonicznej.</p>
            </article>
            <article className="info-card">
              <h3>Fałszywy bank</h3>
              <p>Bank nigdy nie prosi w wiadomości o hasło, login, kod SMS ani kod BLIK.</p>
            </article>
            <article className="info-card">
              <h3>Podejrzany link</h3>
              <p>Link może prowadzić do fałszywej strony płatności lub logowania.</p>
            </article>
          </div>
        </section>

        <section id="pomoc" className="section-card">
          <div className="section-heading">
            <p className="eyebrow">Pomoc</p>
            <h2>Kiedy masz wątpliwości, zatrzymaj się</h2>
            <p>
              Nie klikaj, nie płać i nie podawaj danych. Zadzwoń do rodziny, banku albo zgłoś incydent.
            </p>
          </div>
        </section>
      </main>

      <footer>
        SeniorShield pomaga ocenić ryzyko, ale nie zastępuje kontaktu z bankiem, policją ani rodziną.
      </footer>
    </>
  );
}
