### AI Slop - ale działa... poniekąd

### TO DO:
- dostosować json do form_zakupy oraz form_wyjazdy
- tabela kosztów (+ zliczanie koszt_całkowity oraz koszt_wymagany)
- tabela uczestników (+ zliczanie liczba_uczestników)
- poprawić data_wyjazdu_start i data_wyjazdu_powrót
- data_rozliczenia -> komunikat o terminie rozliczenia jeśli jest mniej niż 14 dni. Dodatkowo timeskip do dnia roboczego
- format wyjściowy = dd.mm.rrrr
- wnioski dla kilku organizatorów

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
- select_complex – Kod wyłapuje tę nazwę i zamiast zwykłego pola tekstowego renderuje listę rozwijaną, która potrafi wrzucić do pamięci od razu kilka tagów na raz.
- select – zwykła lista rozwijana, która wrzuca do pamięci tylko jeden tag
- complex_date – wybór kilku dni pod rząd
