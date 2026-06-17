# Mässklar QR-kod för LBC Cargo Quest

För att QR-koden ska fungera för vem som helst på en mässa måste den peka på en publik `https`-adress.

Det här projektet är nu förberett för det.

## Rekommenderat upplägg

Använd en publik adress som till exempel:

`https://cargoquest.lbcfrakt.se/`

Undvik:

- `file:///...`
- OneDrive-länkar
- `localhost`
- interna LAN-adresser som `192.168.x.x`

## Så bygger du mässversionen

I PowerShell:

```powershell
$env:PUBLIC_GAME_URL="https://cargoquest.lbcfrakt.se/"
npm run build:fair
```

Detta gör tre saker:

1. Genererar en lokal QR-SVG i `public/fair-qr.svg`
2. Genererar `public/fair-config.json` med publik URL
3. Bygger hela spelet till `dist/`

## Vad du får

- Spelet på publik adressens rot, till exempel `https://cargoquest.lbcfrakt.se/`
- QR-affisch på `https://cargoquest.lbcfrakt.se/qr.html`

## Enkel hosting som passar Vite-projektet

Välj en av dessa:

1. Cloudflare Pages
2. Netlify
3. Vercel
4. Egen webbserver bakom valfri domän

Alla fungerar eftersom projektet är en statisk frontend efter build.

## Minsta säkra mässflöde

1. Peka subdomänen till din hosting
2. Kör `npm run build:fair` med rätt `PUBLIC_GAME_URL`
3. Ladda upp innehållet i `dist/`
4. Öppna `/qr.html` på skärm eller skriv ut den
5. Testa QR-koden med en mobil på mobilnät, inte bara på kontorets wifi

## Viktigt

Om du byter domän måste du köra `npm run build:fair` igen, annars kommer QR-koden att peka fel.