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
  sheets/                      liste, éditeur de fiche (caractéristiques, textes, contrôle, versions)
  templates/                   import, catalogue des balises
  ui/                          composants (statut, échelle 1-5, compteur, cépages, historique…)
  styles/vinidoc.scss          styles (préfixe vd-)
src/pages/                     HomePage (génération), OenologiePage, SheetPage, ValidationPage, ModelesPage, ModelePage
```

---|---|---|
| Œnologue | `/oenologie` — Données œnologiques | Saisit et met à jour les données techniques et œnologiques des vins |
| Administrateur | `/modeles` — Modèles PowerPoint | Dépose et gère les modèles `.pptx` et leurs balises de fusion |
| Marketing | `/` — Fiches techniques (accueil) | Choisit un vin et un modèle, puis génère la fiche technique |

Les pages d'administration (`/oenologie`, `/modeles`) sont réservées aux profils
`CAN_MODIFY` (cf. `VITE_MODIFY_PERMS`) : liens masqués dans la Nav et accès direct
par URL redirigé vers l'accueil (`requireModify` sur `PrivateRoute`).

---

## Stack

| Outil | Version |
|---|---|
| React | 19 |
| TypeScript | 5.7 |
| Vite | 6 |
| React Router | 7 |
| SCSS (modules) | via sass |
| UI | `@uvcdr/custom-form-system` |
| Icônes | FontAwesome Solid + Lucide |
| Tests | Vitest + Testing Library |

---

## Prérequis

- Node.js ≥ 20
- Accès au package local `@uvcdr/custom-form-system` (chemin : `../../custom-form-system/`)

---

## Installation

```bash
npm install
```

---

## Variables d'environnement

Chaque fichier `.env.*` correspond à un mode de build.

| Variable | Description |
|---|---|
| `VITE_APP_BASE` | Chemin de base de l'app (`/vinidoc/`) |
| `VITE_API_URL` | URL racine de l'API backend |
| `VITE_WS_URL` | URL du WebSocket |
| `VITE_UPLOADS_URL` | URL du service de fichiers |
| `VITE_APP_NAME` | Nom court de l'application (`VINIDOC`) |
| `VITE_APP_CODE` | Code court (`VINDOC`) |
| `VITE_LS_JWT` | Préfixe de la clé cookie JWT |
| `VITE_DOMAIN` | Domaine racine (utilisé pour les redirections auth) |
| `VITE_MODIFY_PERMS` | Permissions autorisées à modifier (ex: `DEV,SUPERADMIN,ADMIN`) |
| `VITE_PRODUCTION` | `1` en production, `0` sinon |

---

## Scripts

```bash
# Développement
npm run dev

# Développement en mode admin
npm run dev:admin

# Build production
npm run build

# Build test
npm run build:test

# Lint
npm run lint

# Prévisualisation du build
npm run preview
```

---

## Architecture

```
src/
├── app/
│   ├── api/              # Couche HTTP (apiRequest, apiRequestAll, websocket, hooks)
│   ├── context/          # WebSocketContext
│   ├── router/           # router.tsx — déclaration des routes
│   ├── App.tsx           # AuthProvider + WebSocketProvider + Router
│   ├── AppInitializers.tsx
│   ├── config.ts         # Variables d'env exportées
│   └── main.tsx          # Point d'entrée
│
├── entities/
│   ├── attachment/       # Attachment (fichiers)
│   ├── auth/             # JWTPayload, User, Permission, …
│   └── application.class.ts  # VersionClass, VersionDetailClass
│
├── features/
│   ├── auth/             # PrivateRoute (+ requireModify)
│   ├── home/             # (réservé) logique de la page d'accueil
│   ├── layout/
│   │   ├── Header/       # Header (non affiché)
│   │   ├── hooks/        # useAppVersion
│   │   └── Nav/          # Sidebar + modales (version, utilisateur, application)
│   └── notFound/
│
├── pages/
│   ├── HomePage.tsx      # /           Fiches techniques (marketing)
│   ├── OenologiePage.tsx # /oenologie  Données œnologiques (œnologue)
│   ├── ModelesPage.tsx   # /modeles    Modèles PowerPoint
│   ├── LoginPage.tsx     # /login      (hors production)
│   └── NotFoundPage.tsx
│
└── shared/
    ├── lib/
    │   ├── hooks/        # useStableLoading, useWebSocket
    │   ├── types/        # Types globaux (deep-diff, etc.)
    │   └── utils/        # Fonctions utilitaires (date, cache, storage, …)
    ├── styles/           # Variables SCSS globales
    └── ui/               # Composants UI partagés (ObjectTable, PageLayout, SectionCard, …)
```

---

## Authentification

L'auth repose sur un **JWT stocké en cookie** (clé : `${VITE_LS_JWT}-${VITE_APP_CODE}`).

- `AuthContext` vérifie le token au montage via `GET /auth/verify`.
- `PrivateRoute` consomme `useAuth()` — aucun appel réseau supplémentaire.
- En production, une déconnexion redirige vers `${VITE_DOMAIN}/login`.
- En développement, la redirection se fait vers `/login` en interne.

---

## Couche API

`apiRequest` et `apiRequestAll` (dans `src/app/api/api.tsx`) gèrent :

- JSON et multipart (fichiers)
- Confirmation avant requête (`confirms`)
- Gestion centralisée des erreurs (toast automatique)
- `setLoading`, `onStart`, `onSuccess`, `onError`, `onFinally`
- Upload de fichiers post-requête (`fileUploads`)

---

## Créer une nouvelle application depuis cette base

1. Copier ce dossier dans un nouveau répertoire.
2. Mettre à jour `package.json` : `name`, `version`.
3. Mettre à jour les fichiers `.env.*` : `VITE_APP_BASE`, `VITE_APP_NAME`, `VITE_APP_CODE`, URLs.
4. Adapter les entrées de navigation dans `src/features/layout/Nav/ui/Nav.tsx`.
5. Ajouter les routes dans `src/app/router/router.tsx` (lu aussi par `postbuild.js` via `extractRoutes.js`).
6. Lancer `npm install` puis `npm run dev`.
