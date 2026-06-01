# SeniorShield AI — wersja z prawdziwym API

To jest wersja aplikacji SeniorShield oparta o Next.js i OpenAI API.

## Co robi

- Senior wkleja wiadomość.
- System wyciąga numery telefonu i linki.
- OpenAI API analizuje treść pod kątem oszustwa.
- Aplikacja pokazuje wynik prostym językiem: czerwony / żółty / zielony.
- Wynik zawiera powody ostrzeżenia i konkretne kroki, co zrobić.

## Jak uruchomić

1. Zainstaluj Node.js.
2. W terminalu wejdź do folderu projektu.
3. Uruchom:
   npm install
4. Skopiuj `.env.example` jako `.env.local`.
5. W `.env.local` wpisz swój klucz:
   OPENAI_API_KEY=...
6. Uruchom:
   npm run dev
7. Wejdź na:
   http://localhost:3000

## Jak wrzucić online

Najłatwiej przez Vercel:

1. Wrzuć projekt na GitHub.
2. Połącz repozytorium z Vercel.
3. W Vercel dodaj zmienną środowiskową:
   OPENAI_API_KEY
4. Kliknij Deploy.

## Ważne

Aplikacja nie wydaje prawnej ani policyjnej decyzji. Wynik jest oceną ryzyka i ma pomagać użytkownikowi zachować ostrożność.
