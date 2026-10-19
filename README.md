# VINIDOC — UVCDR

Application de centralisation des informations techniques et œnologiques des vins
(caractéristiques, notes de dégustation, accords mets-vins, etc.) et de génération
automatique de **fiches techniques produits** à partir de modèles PowerPoint
personnalisables. Construite sur la **Base App UVCDR**.

## Fonctionnement

Backend : module `vinidoc` de l'API V1.1.0 (`/api/vinidoc`, cf. son README).

| Profil (droit API) | Page | Rôle |
|---|---|---|
| Tous | `/` — Fiches techniques | Choisit un vin **validé**, une langue et un modèle ; contrôle automatique des longueurs ; génère le PDF ou le PowerPoint |
| Tous (lecture) / Œnologie `EDIT` | `/oenologie` — Fiches œnologiques | Liste ; création (`/oenologie/new`) ; saisie des caractéristiques, des cépages et des textes **par langue** ; soumission au marketing |
| Marketing `VALIDATE` | `/validation` — À valider | Fiches soumises (badge dans la Nav) ; ouverture, relecture, **Valider** ou **Refuser** (motif obligatoire) |
| `TEMPLATES` | `/modeles` — Modèles PowerPoint | Import `.pptx` (balises détectées), longueur max / obligatoire par balise, remplacement du fichier, catalogue des balises |

### Droits

Les droits viennent de l'API (`GET /vinidoc/me`, services configurés côté
serveur : `VINIDOC_EDITOR_SERVICES`, `VINIDOC_VALIDATOR_SERVICES`,
`VINIDOC_TEMPLATE_SERVICES` + profils `MODIFY_PERMS`). Ils sont chargés une
fois par `VinidocProvider` (`src/features/vinidoc/context`) et pilotent :
les liens de la Nav, l'accès aux routes (`requireRight` sur `PrivateRoute`)
et les boutons d'action. L'API re-vérifie chaque action.

### Règles métier visibles dans l'interface

- **Validation de la fiche entière** (toutes langues) : toute modification
  repasse la fiche en brouillon ; la dernière **version validée** reste
  utilisée pour la génération tant que la nouvelle n'est pas validée.
- **Compteurs de caractères** sur chaque texte, comparés à la longueur max la
  plus stricte des modèles actifs (infobulle : détail par modèle). Un texte
  trop long pour un modèle bloque la génération avec ce modèle (jamais de
  troncature automatique).
- **Verrouillage optimiste** : si quelqu'un a modifié la fiche entre-temps,
  l'enregistrement est refusé (409) ; un bandeau propose de recharger quand
  une modification distante est reçue par WebSocket.

### Code

```
src/entities/vinidoc/          types de l'API
src/features/vinidoc/
  api/useVinidocApi.ts         client /vinidoc (token injecté, data renvoyée)
  context/VinidocContext.tsx   droits, langues, couleurs, balises, compteur "à valider"
  generation/                  formulaire de génération, aperçu, historique
  import/                      import CSV de fiches
  sheets/                      liste, éditeur de fiche (caractéristiques, textes, contrôle, versions)
  templates/                   import, réglage et catalogue des balises
  ui/                          composants (statut, échelle 1-5, compteur, historique…)
  styles/vinidoc.scss          styles (préfixe vd-)
src/pages/                     HomePage (génération), OenologiePage, ValidationPage, ModelesPage,
                               ParametresPage, LoginPage, NotFoundPage
```

---

## Stack

| Outil | Version |
|---|---|
| React | 19 |
| TypeScript | 6.0 |
| Vite | 8 (SWC) |
| React Router | 7 |
| SCSS | sass, variables injectées automatiquement par Vite |
| UI | `@uvcdr/custom-form-system` 0.2.0, `@uvcdr/modal`, `@uvcdr/confirm-notify-system` |
| Auth / API | `@uvcdr/api-auth-system` |
| Icônes | FontAwesome 7 (Solid) |

---

## Prérequis

- Node.js 20.19+ (LTS recommandé, requis par Vite 8)
- npm 12+ (prise en compte de `.npmrc` / `allowScripts`)

Les paquets internes `@uvcdr/*` sont installés depuis
`https://dev.union-vignerons.com/npm/uvcdr/<paquet>/<version>` ; le fichier
`.npmrc` (`allow-remote=root`) autorise ces URLs avec npm 12+.

---

## Installation et scripts

```bash
npm install
npm run dev
```

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de dev (`.env.development`), `http://localhost:5173/vinidoc/` |
| `npm run build` | Build de production (`.env.production`) |
| `npm run build:test` | Build de test (`.env.test`) |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | Linter ESLint |
| `npm run reload:node-modules` | Supprime `node_modules` + `package-lock.json` et réinstalle |

> Les builds exécutent `tsc -b && vite build`. `.claude/launch.json` lance le serveur de dev sur le port 5178.

---

## Variables d'environnement

Chaque fichier `.env.*` correspond à un mode de build. Ils ne sont pas versionnés,
sauf le modèle `.env.exemple`.

| Variable | Description |
|---|---|
| `VITE_APP_BASE` | Chemin de base de l'app (`/vinidoc/`) |
| `VITE_API_URL` | URL racine de l'API backend |
| `VITE_WS_URL` | URL du WebSocket |
| `VITE_UPLOADS_URL` | URL du service de fichiers |
| `VITE_APP_NAME` | Nom court de l'application (`VINIDOC`) |
| `VITE_APP_CODE` | Code court (`VINDOC`) |
| `VITE_LS_JWT` | Préfixe de la clé cookie JWT |
| `VITE_DOMAIN` | Domaine racine (redirection vers le portail en production) |
| `VITE_LOCAL_DOMAIN` | Domaine de l'API locale |
| `VITE_MODIFY_PERMS` | Permissions autorisées à modifier (ex: `DEV,SUPERADMIN,ADMIN`) |
| `VITE_PRODUCTION` | `1` en production, `0` sinon |

---

## Architecture

```
src/
├── app/
│   ├── api/              # Couche HTTP (apiRequest, apiRequestAll, websocket, hooks)
│   ├── context/          # WebSocketContext
│   ├── router/           # router.tsx — déclaration des routes
│   ├── App.tsx           # AuthProvider + WebSocketProvider + VinidocProvider + Router
│   ├── AppInitializers.tsx  # stores confirm/notify, messages API, thème utilisateur
│   ├── config.ts         # Variables d'env exportées
│   └── main.tsx          # Point d'entrée (providers, styles @uvcdr clair + sombre)
│
├── entities/             # application/versions, attachment, auth, vinidoc
├── features/
│   ├── auth/             # PrivateRoute (+ requireRight)
│   ├── layout/
│   │   ├── hooks/        # useAppVersion
│   │   └── Nav/          # Sidebar + modales (version, utilisateur, application)
│   ├── notFound/
│   └── vinidoc/          # cf. section Code
│
├── pages/                # cf. section Code
└── shared/
    ├── lib/
    │   ├── hooks/        # useWebSocket
    │   ├── theme/        # theme.ts (application du thème), userTheme.ts (préférence en base)
    │   ├── types/        # Types globaux (deep-diff, etc.)
    │   └── utils/        # Fonctions utilitaires (date, cache, storage, …)
    ├── styles/           # _variables.scss (palettes + tokens), _theme.scss, global.scss
    └── ui/               # PageLayout, SectionCard, ThemePicker
```

---

## Thème clair / sombre

- Thème appliqué par l'attribut `data-theme="dark"` sur `<html>`, le même que
  celui attendu par les feuilles « -dark » des paquets `@uvcdr/*`.
- Couleurs en variables CSS `--vinidoc-*` (palettes `$theme-light` / `$theme-dark`
  dans `_variables.scss`, émises par `_theme.scss`). Les variables Sass gardent
  leurs noms historiques ; comme ce sont des `var()`, utiliser `with-alpha()` et
  `shade()` au lieu de `rgba()` / `darken()`.
- Préférence enregistrée en base par utilisateur (`usersmanager/theme`,
  `APPCOD=VINDOC`), choisie dans **Paramètres** (`/parametres`) : Par défaut
  (thème par défaut de l'utilisateur, commun à toutes les applications), Clair, Sombre ou
  Système. Elle est mise en cache dans `localStorage` (`vinidoc-theme`) pour le
  script anti-flash de `index.html`.
- Le bouton « Modifier mon thème par défaut » ouvre les Paramètres de
  users-manager (`${VITE_DOMAIN}/users-manager/settings`) après avoir généré un
  token users-manager (`auth/app?appcode=USRMAN`) enregistré dans son cookie,
  pour éviter la page de connexion. Nécessite une permission sur users-manager
  et le même domaine que users-manager (test / production).

---

## Authentification

L'auth repose sur `@uvcdr/api-auth-system` (JWT stocké en cookie, clé
`${VITE_LS_JWT}-${VITE_APP_CODE}`) :

- `AuthProvider` vérifie le token au montage via `GET /auth/verify`.
- `PrivateRoute` consomme `useAuth()` — aucun appel réseau supplémentaire.
- En production, une déconnexion redirige vers le portail (`${VITE_DOMAIN}/home`).
- En développement, la redirection se fait vers `/login` en interne.

---

## Déploiement

Déployer le contenu de `dist/` sous `/vinidoc/`. Le serveur web doit renvoyer
`index.html` pour toutes les routes de l'application (fallback SPA : l'ancienne
étape `postbuild` qui dupliquait `index.html` par route a été supprimée).
