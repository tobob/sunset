# Sunset — karta aplikacji

Plik studia: czytaj go zanim zaczniesz pracę nad aplikacją, a po każdej istotnej zmianie dopisz linijkę do **Historii**.

| | |
|---|---|
| Slug / folder | `sunset` · `studio/apps/sunset` (stara ścieżka `~/sunset` to symlink) |
| iOS bundle ID | `com.tobob.sunset` · widget `com.tobob.sunset.widget` · app group `group.com.tobob.sunset` |
| Android package | `com.tobob.sunset` (skonfigurowany, nigdy nie budowany) |
| EAS | konto `tobobu`, projectId `283e4f3d-a8b7-4072-805c-73b83b8a1197` |
| Repo | `git@github.com:tobob/sunset.git` (publiczne, MIT) |
| Expo SDK | 58 |

## Co robi

Godziny wschodu i zachodu słońca dla bieżącej lokalizacji, liczone offline na urządzeniu. Widget iOS na ekran główny (small/medium) i ekran blokady (rectangular/inline). Lokalizacja nie opuszcza telefonu (polityka: `PRIVACY.md`).

## Architektura i pułapki

- `src/hooks/use-sun-location.ts`: najpierw `getLastKnownPositionAsync` → zapis + push do widgetu od razu, potem świeża pozycja (`Accuracy.Low`, timeout 15 s), na końcu geokodowanie nazwy. Na powrocie z tła odświeża, jeśli lokalizacja starsza niż 30 min.
- Widget: `expo-widgets`, layout `src/widgets/SunWidget.tsx`, dane przez UserDefaults app group. Testując na symulatorze czytaj przez `xcrun simctl spawn booted defaults read <ścieżka>` (plik plist jest cache'owany przez cfprefsd).
- `ios/` jest generowany (CNG, w `.gitignore`). Po przeniesieniu folderu albo dziwnych błędach Pods: `npx expo prebuild --clean -p ios`.
- Brak `expo-updates` → każda poprawka wymaga nowego buildu sklepowego.

## Sklepy

- **iOS:** App Store Review. Build 1 dostał „Guideline 2.1 – Information Needed” (prośba o nagranie ekranu z działaniem aplikacji i widgetu). Build 2 (1.0.0, poprawka widgetu) jest na EAS. Do zrobienia przez Boba: `eas submit`, podmiana buildu w ASC, nagranie, odpowiedź w Resolution Center.
- **Android:** nie wydana (brak konta Google Play / service account w EAS).

## Historia

- 2026-11-02 — build 1 (1.0.0) → App Store Review
- 2026-11-03 — fix: widget od razu po pierwszym starcie pokazywał „Open Sunset to set location”; build 2 (1.0.0) na EAS (`eedf796d`)
- 2026-11-16 — przeniesiona do studio (`studio/apps/sunset`)
