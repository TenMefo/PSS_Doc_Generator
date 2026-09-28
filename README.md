### TO DO (zrealizowane):
- [x] dostosować json do form_zakupy oraz form_wyjazdy — uzupełniono brakujące pola `opis_oraz_cel`/`miejsce_oraz_adres` w `form_zakup` i `opis_oraz_cel` w `form_wyjazd` (wcześniej te tagi w `.docx` renderowały się puste dla tych dwóch typów wniosku).
- [x] tabela kosztów (+ zliczanie koszt_całkowity oraz koszt_wymagany) — `koszt_całkowity` liczony automatycznie (naprawiono błąd, przez który zawsze wychodził jako "0,00"); `koszt_wymagany` domyślnie równy sumie kosztów, edytowalny ręcznie (przycisk "Przywróć sumę" resetuje do automatu).
- [x] tabela uczestników (+ zliczanie liczba_uczestników) — nowa tabela (dostępna dla typów `wydarzenie` i `wyjazd`, patrz `form_uczestnicy` w JSON), analogiczna do tabeli kosztów. `liczba_uczestników` liczona automatycznie jako liczba wierszy z uzupełnionym imieniem i nazwiskiem. Wymagało też dodania pętli `{#uczestnicy}...{/uczestnicy}` w plikach `.docx`.
- [x] poprawić data_wyjazdu_start i data_wyjazdu_powrót — wcześniej wypełniane tylko dla typu `wyjazd`; teraz wypełniane dla każdego typu wniosku (dla wydarzenia/zakupu jako ta sama, pojedyncza data), bo zdanie w "Liście uczestników" korzysta z nich niezależnie od typu.
- [x] data_rozliczenia -> komunikat o terminie rozliczenia jeśli jest mniej niż 14 dni + timeskip do dnia roboczego — timeskip (pomijanie sobót/niedziel i środ, gdy rektorat zamknięty dla studentów) już działał dla wartości domyślnej; naprawiono błąd, przez który ręczna edycja tego pola była natychmiast nadpisywana automatem, i dodano ostrzeżenie przy zbyt krótkim terminie (analogiczne do ostrzeżenia dla daty przedsięwzięcia).
- [x] format wyjściowy = dd.mm.rrrr — formatowanie dat uogólnione na wszystkie pola typu `date` zadeklarowane w JSON (wcześniej tylko `data_wniosku` i `data_rozliczenia` były formatowane; `data_przedsięwzięcia` dla wydarzenia/zakupu trafiała do dokumentu jako surowy ISO).
- [x] wnioski dla kilku organizatorów — pole `wybor_organizacji` to teraz `select_complex_multi` (checkboxy); przy kilku zaznaczonych organizatorach ich nazwy łączone są w jednym wniosku w naturalny polski sposób (np. "Parlament Samorządu Studenckiego ZUT w Szczecinie oraz Sejmik Wydziałowy Samorządu Studenckiego Wydziału Informatyki").

Przy okazji naprawiono też literówkę w oryginalnym szablonie `.docx` (tag `{rok_preliminarz }` ze spacją w środku, przez co pole zawsze renderowało się puste).

---

### JSON:
- pole "id" musi być identyczne z polami w .docx
### INPUTY (JSON)
- text - zwykłe pole tekstowe
- number - pole liczbowe
- date - wybiera datę z kalendarza
- time - wybiera godzinę z zegara
- email - pole do wpisania adresu email
- --
- select_complex – Kod wyłapuje tę nazwę i zamiast zwykłego pola tekstowego renderuje listę rozwijaną, która potrafi wrzucić do pamięci od razu kilka tagów na raz (wybór JEDNEJ opcji).
- select_complex_multi – jak `select_complex`, ale renderuje checkboxy i pozwala zaznaczyć KILKA opcji naraz; tagi ze wszystkich zaznaczonych opcji są łączone (np. kilku organizatorów wspólnego wniosku). Aktualnie używane przez pole `wybor_organizacji`.
- select – zwykła lista rozwijana, która wrzuca do pamięci tylko jeden tag
- complex_date – wybór kilku dni pod rząd
- textarea – wieloliniowe pole tekstowe

### Tabele z dynamicznymi wierszami (koszty, uczestnicy)
- Konfiguracja w JSON: `form_koszty` i `form_uczestnicy` (tytuł, min/max liczba wierszy, etykiety kolumn, podpowiedzi).
- W `.docx` odpowiadają im pętle docxtemplater: `{#koszty}...{/koszty}` i `{#uczestnicy}...{/uczestnicy}` — pierwsza komórka wiersza w tabeli zawiera `{#nazwaPętli}`, ostatnia `{/nazwaPętli}`.
- `form_uczestnicy.availableFor` — lista typów wniosku (`wydarzenie`/`zakup`/`wyjazd`), dla których tabela uczestników ma się pojawiać.
- `form_koszty.requiredAmountLabel` / `requiredAmountHint` — etykieta i podpowiedź dla pola "koszt_wymagany" (domyślnie suma kosztów, edytowalna ręcznie).

### Szablony dokumentów
- Lista dostępnych dokumentów jest w `public/templates.json`.
- Każdy szablon ma własny plik JSON z polami formularza i własny plik `.docx`.
- Żeby dodać nowy dokument, dopisz wpis do `templates.json` i dodaj odpowiadające mu pliki do `public/`.
- Instrukcja dodawania template
