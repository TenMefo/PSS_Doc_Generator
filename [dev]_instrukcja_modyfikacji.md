## INSTRUKCJA MODYFIKACJI OBECNEGO PROJEKTU (GITHUB PAGES)

> Używaj tej procedury za każdym razem, gdy chcesz dopisać coś nowego,
naprawić błąd lub zmienić wygląd w aktualnej aplikacji. <br><br>
> Instrukcja stworzona z myślą o środowisku **WebStorm** (ale wykonalna również bez niego).

### KROK 1: PRACA LOKALNA

Przed wprowadzeniem zmian odpal projekt na swoim komputerze,
zeby widziec wszystko na zywo. Wpisz w terminalu WebStorma:
```
npm run dev
```
Otworz adres w przegladarce (zazwyczaj http://localhost:5173)
i wprowadzaj zmiany w kodzie.


### KROK 2: ZAPISANIE ZMIAN W REPOZYTORIUM (GIT)

Gdy kod działa i chcesz go zapisać na GitHubie, użyj w terminalu
trzech klasycznych komend:

1. Dodaj wszystkie zmienione pliki do paczki:
   ``` 
   git add .
   ```

2. Zatwierdź zmiany i krótko opisz, co zrobiłeś:
   ```
   git commit -m "Dodano nowa funkcje / poprawiono interfejs"
   ```

3. Wyślij kod na glówny branch (main) na GitHubie:
   ```
   git push
   ```

### KROK 3: AKTUALIZACJA DZIAŁAJĄCEJ STRONY (DEPLOY)

Sam "git push" NIE odświeży Twojej strony internetowej.
Aby wrzucić nową wersję na GitHub Pages, wpisz w terminalu:
```
npm run deploy
```

[Skrypt](package.json#scripts) jest tak przygotowany, że sam zbuduje projekt na nowo
i zaktualizuje branch gh-pages.
Zmiany na stronie powinny pojawić się w ciagu 1-2 minut.
Z doświadczenia - nierzadko trwa to kilkanaście minut.
