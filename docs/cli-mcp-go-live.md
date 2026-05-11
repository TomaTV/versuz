# CLI + MCP — go-live checklist

Steps précis pour activer `npx versuz` et `npx -y @versuz/mcp` une fois que
`versuz.dev` est déployé et résout en HTTPS.

Tant que ces étapes ne sont pas faites, les deux packages tournent en mode
**localhost** (utilisable par toi en dev, pas par le grand public).

---

## 1. Pré-requis côté infra

- [ ] `versuz.dev` résout et sert HTTPS (cf. `docs/domain-go-live.md`)
- [ ] L'app Next est déployée sur Vercel avec les env vars (Supabase, Stripe, etc.)
- [ ] Les endpoints publics répondent en JSON :
  - `GET https://versuz.dev/api/v1/skills` → 200
  - `GET https://versuz.dev/api/v1/skills/<slug>` → 200
  - `GET https://versuz.dev/api/v1/skills/<slug>/content` → 200 (free) ou 402 (premium)
  - `GET https://versuz.dev/api/v1/claude-md` + variantes
  - `POST https://versuz.dev/api/v1/auth/whoami` (avec PAT) → 200
  - `POST https://versuz.dev/api/v1/submit` (avec PAT) → 200 / 401 / 403 / 429

Test rapide :
```bash
curl https://versuz.dev/api/v1/skills?limit=1
```

## 2. Bump default API dans les packages

Avant publish, **swap localhost → versuz.dev** :

- [ ] [`cli/src/api.js`](../cli/src/api.js) — `DEFAULT_BASE` :
  ```js
  const DEFAULT_BASE = process.env.VERSUZ_API || "https://versuz.dev";
  ```
- [ ] [`mcp-server/src/index.js`](../mcp-server/src/index.js) — `API_BASE` :
  ```js
  const API_BASE = (process.env.VERSUZ_API || "https://versuz.dev").replace(/\/$/, "");
  ```

## 3. Bump métadonnées des packages

- [ ] [`cli/package.json`](../cli/package.json) — `repository.url` → ton vrai
  GitHub repo. Optionnel : description, keywords, version `0.1.0`.
- [ ] [`mcp-server/package.json`](../mcp-server/package.json) — pareil.

## 4. Vérifier que les noms npm sont libres

```bash
npm view versuz       # doit retourner 404
npm view @versuz/mcp  # doit retourner 404
```

Si `versuz` est pris (vérifié libre au 11 mai 2026), fallback : `@versuz/cli`.

## 5. npm login + publish

```bash
npm login   # compte npm avec 2FA recommandé
cd cli
npm publish --access public
cd ../mcp-server
npm publish --access public
```

## 6. Smoke tests post-publish

Depuis n'importe quel poste neuf :

```bash
# CLI
npx versuz@latest --version
npx versuz@latest search pdf
npx versuz@latest info <some-slug>

# MCP server (manuel — normalement consommé par Claude Code)
npx -y @versuz/mcp < /dev/null  # devrait écrire "running on stdio · api=https://versuz.dev" puis attendre
```

Pour test auth :
```bash
npx versuz@latest login  # paste un PAT
npx versuz@latest whoami
```

## 7. Marketing / annonces

- [ ] Push un commit "ship: CLI + MCP v0.1.0" sur le repo public
- [ ] Update [README.md](../README.md) racine avec une section "Install" qui
  mentionne `npx versuz` + `claude mcp add versuz npx -y @versuz/mcp`
- [ ] Update [CLAUDE.md](../CLAUDE.md) ligne "Strategic posture" pour mentionner
  les deux surfaces additionnelles
- [ ] Tweet / Bluesky / wherever
- [ ] DM à 3-5 power-users pour smoke-test publique

## 8. Téléchargement bundle (premium)

Endpoint **non-encore implémenté** :
- `GET /api/v1/skills/<slug>/bundle.zip`

Bloque l'install des bundled premium via CLI. Pour v0.2 ajouter :
1. Stockage zip côté Supabase Storage (bucket `premium-content` existe déjà)
2. Endpoint qui mint une signed URL pour les `owned/authored` users
3. CLI download + unzip dans `.claude/skills/<slug>/`

## 9. Roll-back si besoin

```bash
# Unpublish une version (≤72h après publish)
npm unpublish versuz@0.1.0
npm unpublish @versuz/mcp@0.1.0

# Ou déprécier sans unpublish
npm deprecate versuz@0.1.0 "broken, use 0.1.1"
```

## 10. Plus tard — auth flow OAuth (v0.2)

Le PAT manuel est OK pour v0 mais friction. v0.2 :
- Register a GitHub OAuth App "Versuz CLI"
- Implement GitHub device flow dans le CLI :
  `versuz login` → user voit un code, visite `github.com/login/device`, le CLI
  poll, swap pour un token Versuz custom (longer TTL, scoped).
- Le PAT manuel reste supporté via `versuz login --token=ghp_xxx`.

---

## Recap des fichiers à toucher juste avant publish

```
cli/src/api.js              # DEFAULT_BASE
cli/package.json            # repository.url
mcp-server/src/index.js     # API_BASE
mcp-server/package.json     # repository.url
README.md (root)            # section Install
CLAUDE.md                   # mention CLI + MCP
```

Total : ~10 lignes à changer, 2 `npm publish`. Tout le reste est déjà en place.
