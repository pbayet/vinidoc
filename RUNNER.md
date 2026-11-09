# Mode opératoire — Runner GitHub Actions (vinidoc)

Ce document explique comment installer et configurer les **runners GitHub Actions auto-hébergés** qui publient ce projet sur les serveurs web Windows, via `npm run deploy:test` / `npm run deploy`.

Il est identique dans tous les projets UNIS (`fsa`, `portal`, `ticketing`…). Seule la section [Ce projet](#ce-projet) change d'un projet à l'autre.

---

## Sommaire

- [Ce projet](#ce-projet)
1. [Principe](#1-principe)
2. [Ce qu'il faut savoir avant de commencer](#2-ce-quil-faut-savoir-avant-de-commencer)
3. [Prérequis sur le serveur](#3-prérequis-sur-le-serveur)
4. [Installation du runner](#4-installation-du-runner)
5. [Droits sur les dossiers du site](#5-droits-sur-les-dossiers-du-site)
6. [Brancher un nouveau projet](#6-brancher-un-nouveau-projet)
7. [Vérification et premier déploiement](#7-vérification-et-premier-déploiement)
8. [Maintenance](#8-maintenance)
9. [Dépannage](#9-dépannage)
10. [Check-list nouveau projet](#10-check-list-nouveau-projet)

---

## Ce projet

- Dépôt GitHub : `pbayet/vinidoc`
- Dossier des runners sur chaque serveur : `C:\actions-runners\vinidoc`

| Cible | Commande | Build | Serveur | Label du runner | Dossier du site | Sauvegardes |
|---|---|---|---|---|---|---|
| `test` | `npm run deploy:test` | `npm run build:test` | VM-DEV | `test` | `E:\SITES\vinidoc` | `E:\SITES\_backups\vinidoc` |
| `prod` | `npm run deploy` | `npm run build` | VM-APPS | `prod` | `D:\SITES\vinidoc` | `D:\SITES\_backups\vinidoc` |

Il faut donc installer **un runner par ligne** de ce tableau (§ 4), avec le label indiqué.

---

## 1. Principe

```
Poste développeur                    GitHub                         Serveur web de la cible
─────────────────                    ──────                         ───────────────────────
npm run deploy[:<cible>]
  1. build local (dist/)
  2. push de la branche courante ──▶ main
  3. push de dist/ ───────────────▶ branche deploy-<cible>
  4. gh workflow run deploy.yml ──▶ workflow "Deploy" ──(job)──▶ runner label <cible>
  5. suivi du run                                                  ├─ sauvegarde du site en ligne
                                                                   └─ robocopy deploy-<cible> → dossier du site
```

- **Le build se fait en local**, car les paquets `@uvcdr/*` ne sont accessibles que depuis le réseau interne. Le serveur ne fait que copier des fichiers.
- Chaque cible a son runner, reconnu par son **label** (`test`, `prod`, éventuellement `admin`). Les cibles, serveurs et dossiers de ce projet sont dans le tableau [Ce projet](#ce-projet).
- Le workflow `ci.yml` (lint, build…) tourne **uniquement sur le runner `test`**. Les runners des autres cibles ne font jamais de CI.

---

## 2. Ce qu'il faut savoir avant de commencer

- **Un runner par dépôt et par serveur.** Les dépôts sont sur un compte personnel GitHub (`pbayet/...`). Or seule une organisation GitHub peut partager un runner entre plusieurs dépôts. Pour chaque projet, il faut donc installer un runner sur **chaque serveur** où il est publié.
- Plusieurs runners cohabitent sans problème sur une même machine, à condition d'avoir **un dossier par runner**. Chacun crée son propre service Windows, nommé `actions.runner.pbayet-<projet>.<machine>`.
- Convention de dossiers : **`C:\actions-runners\<projet>`** (ex. `C:\actions-runners\fsa`, `C:\actions-runners\portal`).
- Le dossier du site porte le nom du **chemin de base** de l'application (`base` dans `vite.config.ts` ou `VITE_APP_BASE`). Ce n'est pas toujours le nom du projet : par exemple, `portal` est publié dans `SITES\home`.
- Le **jeton d'enregistrement** affiché par GitHub expire au bout d'**une heure** et ne sert qu'une fois. Il n'est pas sensible une fois utilisé, mais on évite de le committer.

---

## 3. Prérequis sur le serveur

À vérifier une seule fois par serveur, dans une session PowerShell **en administrateur** :

| Élément | Commande de vérification | Pourquoi |
|---|---|---|
| Accès HTTPS sortant vers GitHub | `Test-NetConnection github.com -Port 443` | Le runner interroge GitHub en permanence. |
| Git for Windows | `git --version` | `actions/checkout` et l'étape « Vérification du build » utilisent `git`. |
| Node 26 (**serveur de test uniquement**) | `node --version` | Nécessaire pour la CI (`ci.yml`). Inutile ailleurs. |

> Si Git ou Node est installé **après** le runner, le service ne le voit pas. Il faut alors lancer `.\config.cmd` à nouveau, ou ajouter le chemin dans le fichier `.path` du dossier du runner, puis redémarrer le service (voir [Maintenance](#8-maintenance)).

Domaines à autoriser si un pare-feu filtre les sorties (en particulier pour un serveur en **DMZ**) : `github.com`, `api.github.com`, `codeload.github.com`, `*.actions.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `github-cloud.githubusercontent.com`, `*.blob.core.windows.net`. Seules les connexions **sortantes** en 443 sont nécessaires : GitHub n'a jamais besoin de joindre le serveur.

---

## 4. Installation du runner

### Script complet (recommandé)

Ce script fait d'un coup toutes les étapes des § 4.2, 4.3 et 5. Pour l'utiliser :
1. récupère le jeton, la version et le SHA-256 sur GitHub (§ 4.1) ;
2. renseigne les variables en tête du script, à partir du tableau [Ce projet](#ce-projet) ;
3. colle le script **en entier** dans un PowerShell **en administrateur**.

Le script est placé dans un bloc `& { ... }`. Ainsi, une erreur (checksum incorrect, jeton expiré…) arrête **tout** le script, au lieu de passer à la ligne suivante comme le ferait un copier-coller ligne par ligne.

```powershell
& {
  # ── À renseigner (voir le tableau « Ce projet ») ───────────────
  $projet  = "vinidoc"                 # nom du dépôt GitHub : pbayet/<projet>
  $dossier = "vinidoc"                 # dossier du site dans <disque>\SITES
  $label   = "prod"                    # "test" (VM-DEV), "prod" (VM-APPS)
  $disque  = "D:"                      # E: sur VM-DEV, D: sur VM-APPS
  $token   = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   # jeton GitHub, valable 1 h
  $version = "2.338.2"                 # version affichée par GitHub
  $sha256  = "a1f17aa987fc8158bc7521d284912267a0d01b7c2c4684b33c86783b5e8221cc"
  # ───────────────────────────────────────────────────────────────

  $ErrorActionPreference = 'Stop'
  $runnerDir = "C:\actions-runners\$projet"
  $site      = "$disque\SITES\$dossier"
  $backups   = "$disque\SITES\_backups\$dossier"
  $zip       = "$runnerDir\actions-runner-win-x64-$version.zip"

  if (Test-Path "$runnerDir\.runner") {
    throw "Un runner est déjà configuré dans $runnerDir (le supprimer d'abord : § 8)"
  }
  New-Item -ItemType Directory -Force $runnerDir | Out-Null
  Set-Location $runnerDir

  # 1. Téléchargement (via l'API : le lien direct répond parfois 504)
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $ProgressPreference = 'SilentlyContinue'
  $rel   = Invoke-RestMethod "https://api.github.com/repos/actions/runner/releases/tags/v$version" -UseBasicParsing
  $asset = $rel.assets | Where-Object name -eq (Split-Path $zip -Leaf)
  if (-not $asset) { throw "Archive introuvable dans la release v$version" }
  Invoke-WebRequest $asset.url -Headers @{ Accept = 'application/octet-stream' } -OutFile $zip -UseBasicParsing
  Write-Host "V Téléchargé" -ForegroundColor Green

  # 2. Contrôle et extraction
  if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $sha256) { throw "Checksum incorrect" }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $runnerDir)
  Remove-Item $zip
  Write-Host "V Extrait dans $runnerDir" -ForegroundColor Green

  # 3. Enregistrement sur GitHub et installation du service (compte SERVICE RÉSEAU)
  $configArgs = @(
    '--unattended',
    '--url',    "https://github.com/pbayet/$projet",
    '--token',  $token,
    '--name',   $env:COMPUTERNAME,
    '--labels', $label,
    '--work',   '_work',
    '--runasservice'
  )
  & "$runnerDir\config.cmd" @configArgs
  if ($LASTEXITCODE -ne 0) { throw "config.cmd a échoué (code $LASTEXITCODE)" }

  # 4. Dossiers du site et droits pour SERVICE RÉSEAU (SID S-1-5-20)
  New-Item -ItemType Directory -Force $site, $backups | Out-Null
  foreach ($dir in $site, $backups) {
    icacls $dir /grant "*S-1-5-20:(OI)(CI)M" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "icacls a échoué sur $dir" }
  }
  Write-Host "V Droits accordés sur $site et $backups" -ForegroundColor Green

  # 5. Vérification
  Get-Service "actions.runner.pbayet-$projet.*" | Format-Table Name, Status, StartType
}
```

> Si le script s'arrête sur `Checksum incorrect` ou sur une erreur de téléchargement, il suffit de le relancer. En revanche, s'il s'arrête **après** l'extraction, par exemple sur un jeton expiré, il faut supprimer `C:\actions-runners\<projet>` avant de le relancer avec un nouveau jeton.

Les sous-sections suivantes détaillent chaque étape, pour comprendre ce que fait le script ou pour le faire à la main.

### 4.1 Récupérer le jeton sur GitHub

Dans le dépôt du projet : **Settings → Actions → Runners → New self-hosted runner**, puis choisir **Windows** / **x64**.

La page affiche :
- la **version** du runner et son **SHA-256** ;
- la commande `config.cmd` avec l'**URL** et le **jeton** (`--token XXXXX`).

Garde cette page ouverte.

### 4.2 Télécharger et extraire

Dans PowerShell **en administrateur**, sur le serveur. Remplace la version et le SHA-256 par ceux affichés sur GitHub :

```powershell
$projet  = "vinidoc"
$version = "2.338.2"
$sha256  = "a1f17aa987fc8158bc7521d284912267a0d01b7c2c4684b33c86783b5e8221cc"

New-Item -ItemType Directory -Force "C:\actions-runners\$projet" | Out-Null
Set-Location "C:\actions-runners\$projet"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
$zip = "actions-runner-win-x64-$version.zip"
```

> ⚠️ Un PowerShell lancé **en administrateur** démarre dans `C:\Windows\system32`. Il faut toujours utiliser des **chemins absolus**, comme ci-dessus. Un `mkdir actions-runner\<projet>` relatif créerait le runner dans `system32`, et l'installation du service échouerait (`Exit code -2146232576 ... RunnerService.exe init`).

**Téléchargement.** Le lien direct `github.com/.../releases/download/...` répond parfois `504 Gateway Time-out`. Dans ce cas, l'erreur vient de GitHub et non du réseau. Passer par l'API fonctionne :

```powershell
$rel   = Invoke-RestMethod "https://api.github.com/repos/actions/runner/releases/tags/v$version" -UseBasicParsing
$asset = $rel.assets | Where-Object name -eq $zip
Invoke-WebRequest $asset.url -Headers @{ Accept = 'application/octet-stream' } -OutFile $zip -UseBasicParsing
```

**Contrôle et extraction :**

```powershell
if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $sha256) { throw "Checksum incorrect" }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\$zip", "$PWD")
Remove-Item $zip
```

### 4.3 Enregistrer le runner et l'installer en service

**Option A : en une commande.** Remplace `<label>` par le label de la cible (tableau [Ce projet](#ce-projet)) :

```powershell
.\config.cmd --unattended --url "https://github.com/pbayet/$projet" --token "<JETON_AFFICHÉ_PAR_GITHUB>" --name $env:COMPUTERNAME --labels "<label>" --work _work --runasservice
```

**Option B : en interactif**, avec `.\config.cmd --url https://github.com/pbayet/<projet> --token <JETON>`. Réponses à donner :

| Question | Réponse |
|---|---|
| Runner group | *Entrée* (Default) |
| Name of runner | *Entrée* (nom de la machine, ex. `VM-APPS`) |
| Additional labels | le label de la cible : `test`, `prod`… |
| Work folder | *Entrée* (`_work`) |
| Run as service? | `Y` |
| User account | *Entrée* (`AUTORITE NT\SERVICE RÉSEAU`) |

Résultat attendu :

```
V Runner successfully added
V Settings Saved.
Service actions.runner.pbayet-<projet>.<MACHINE> successfully installed
Service actions.runner.pbayet-<projet>.<MACHINE> started successfully
```

> ⚠️ **Le label est essentiel.** `deploy.yml` choisit son runner avec `runs-on: [self-hosted, <cible>]`. Un runner sans le bon label ne recevra jamais les déploiements de sa cible, et un runner étiqueté par erreur `test` recevrait la CI.

---

## 5. Droits sur les dossiers du site

Le service tourne sous **SERVICE RÉSEAU** (SID `S-1-5-20`). Ce compte doit pouvoir écrire dans le dossier du site et dans celui des sauvegardes. On utilise le SID plutôt que le nom, qui change selon la langue de Windows.

Exemple pour la cible `prod` de ce projet :

```powershell
$site    = "D:\SITES\vinidoc"
$backups = "D:\SITES\_backups\vinidoc"

New-Item -ItemType Directory -Force $site, $backups | Out-Null
icacls $site    /grant "*S-1-5-20:(OI)(CI)M"
icacls $backups /grant "*S-1-5-20:(OI)(CI)M"
```

`(OI)(CI)M` donne le droit **Modification** sur le dossier et tout ce qu'il contient, et ce droit s'applique aussi aux fichiers et dossiers créés ensuite.

> Le `web.config` du site n'est jamais écrasé ni supprimé par le déploiement (`robocopy /XF web.config`). Il reste géré à la main sur chaque serveur.

---

## 6. Brancher un nouveau projet

Partir des fichiers d'un projet déjà branché (par exemple `fsa`) et les adapter.

### 6.1 Workflows

Copier `.github/workflows/deploy.yml` et `.github/workflows/ci.yml` dans `<projet>/.github/workflows/`.

Dans `deploy.yml`, adapter :
- la liste `options` de l'entrée `target` (les cibles du projet) ;
- l'étape « Configuration », qui donne les dossiers de chaque cible :

```powershell
switch ("${{ inputs.target }}") {
  "test" { $site = "E:\SITES\<dossier>"; $backups = "E:\SITES\_backups\<dossier>" }
  "prod" { $site = "D:\SITES\<dossier>"; $backups = "D:\SITES\_backups\<dossier>" }
}
```

`ci.yml` se copie tel quel. Vérifier qu'il contient bien `runs-on: [self-hosted, test]` et qu'il n'appelle que des scripts npm présents dans le projet.

### 6.2 Scripts npm

Dans le `package.json` du projet :

```json
"build:test": "tsc -b && vite build --mode test",
"deploy": "node ../scripts/deploy.mjs prod",
"deploy:test": "node ../scripts/deploy.mjs test"
```

Le script commun est `UNIS/scripts/deploy.mjs`. Il ne demande aucune configuration propre au projet.

### 6.3 Cible supplémentaire (ex. `admin`)

Un projet qui a une version admin (comme `declaration-ingredients`) peut ajouter une cible `admin` :
1. dans `package.json` : `"deploy:admin": "node ../scripts/deploy.mjs admin"`. Ce script lance `npm run build:admin` ;
2. dans `deploy.yml` : ajouter `admin` aux `options` et une ligne `"admin" { ... }` dans l'étape « Configuration » ;
3. sur le serveur de la version admin : installer un runner avec le label `admin`.

Les cibles connues de `deploy.mjs` sont `test`, `prod` et `admin` (objet `TARGETS`). Pour une autre cible, il faut l'y ajouter avec son script de build.

### 6.4 Poste du développeur

GitHub CLI doit être installée et connectée, une seule fois par poste :

```powershell
winget install GitHub.cli
gh auth login
```

### 6.5 Pousser sur `main`

GitHub lance toujours la version de `deploy.yml` présente sur **`main`**. Il faut donc pousser les workflows sur `main` avant le premier déploiement :

```powershell
git add .github/workflows package.json
git commit -m "ci: ajoute les workflows de déploiement"
git push origin main
```

---

## 7. Vérification et premier déploiement

1. **Côté GitHub** : *Settings → Actions → Runners*. Chaque runner apparaît avec le statut **Idle** et les labels `self-hosted, Windows, X64, <label>`.
2. **Côté serveur** :

   ```powershell
   Get-Service "actions.runner.*" | Format-Table Name, Status, StartType
   ```

   Le service doit être `Running`, en `Automatic` (démarrage différé).
3. **Premier déploiement**, depuis le dossier du projet sur le poste :

   ```powershell
   npm run deploy:test   # puis, une fois validé :
   npm run deploy
   ```

   Le script suit le run jusqu'au bout et affiche **EN LIGNE** quand les fichiers sont publiés. On peut aussi suivre le run dans l'onglet **Actions** du dépôt.
4. Vérifier que `<disque>\SITES\_backups\<dossier>\<date>` a été créé. Il est vide au tout premier déploiement si le site n'existait pas encore.

---

## 8. Maintenance

| Action | Commande (dans le dossier du runner, PowerShell admin) |
|---|---|
| État du service | `Get-Service "actions.runner.*"` |
| Redémarrer | `Restart-Service "actions.runner.pbayet-<projet>.<MACHINE>"` |
| Journaux du runner | dossier `_diag\` (`Runner_*.log`, `Worker_*.log`) |
| Mise à jour | automatique : le runner se met à jour seul quand GitHub publie une version |
| Changer de label | GitHub → *Settings → Actions → Runners →* le runner *→* modifier les labels (pas besoin de réinstaller) |
| Prise en compte d'un nouvel outil dans le PATH | ajouter le chemin dans le fichier `.path`, puis redémarrer le service |

**Désinstaller un runner.** Récupérer un jeton de suppression sur GitHub (*Runners → le runner → Remove*), puis :

```powershell
.\config.cmd remove --token "<JETON_DE_SUPPRESSION>"
```

Cette commande arrête et supprime le service, puis désenregistre le runner. On peut ensuite effacer le dossier.

**Restaurer une version précédente** du site : recopier une sauvegarde par-dessus le site.

```powershell
robocopy "<disque>\SITES\_backups\<dossier>\<yyyyMMdd-HHmmss>" "<disque>\SITES\<dossier>" /MIR /XF web.config
```

---

## 9. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Exit code -2146232576 ... RunnerService.exe init` à l'installation du service | Runner installé dans `C:\Windows\System32\...` à cause d'un chemin relatif dans un PowerShell admin. | `config.cmd remove`, puis réinstaller dans `C:\actions-runners\<projet>` (§ 4.2). |
| `config.sh` non reconnu | Commande Linux/macOS affichée par GitHub. | Sous Windows, utiliser `.\config.cmd`. |
| `504 Gateway Time-out` au téléchargement du runner | Incident côté GitHub sur les releases. Les en-têtes `X-GitHub-Request-Id` le confirment. | Télécharger via l'API (§ 4.2), ou depuis un poste puis copier le fichier sur le serveur. |
| Le run reste **Queued** indéfiniment | Aucun runner en ligne avec le bon label. | Vérifier le service (§ 8) et les labels sur GitHub. Pour un serveur en DMZ, vérifier aussi l'accès sortant vers GitHub (§ 3). |
| `Dossier du site non configuré pour la cible ...` | Cible absente de l'étape « Configuration » de `deploy.yml`. | La renseigner (§ 6.1) et pousser sur `main`. |
| `Cible attendue : test ou prod ou admin` | Cible inconnue de `deploy.mjs`. | L'ajouter à `TARGETS` dans `UNIS/scripts/deploy.mjs` (§ 6.3). |
| `index.html absent de la branche deploy-<cible>` | La branche n'a pas été poussée, ou le build est vide. | Relancer `npm run deploy[:<cible>]` et vérifier `dist/index.html`. |
| `Accès refusé` / `robocopy 16` | SERVICE RÉSEAU n'a pas le droit d'écrire. | Refaire les `icacls` (§ 5). |
| `git : terme non reconnu` dans le job | Git absent, ou installé après le runner. | Installer Git, l'ajouter au fichier `.path`, puis redémarrer le service. |
| `Impossible de lancer le workflow avec gh` | GitHub CLI absente ou non connectée sur le poste. | `gh auth login`. |
| La CI tourne sur un serveur autre que celui de test | `ci.yml` utilise `runs-on: self-hosted` sans label. | Remplacer par `runs-on: [self-hosted, test]`. |

Codes `robocopy` : **0 à 7 = succès** (fichiers copiés ou rien à faire), **8 et plus = erreur**. Le workflow ne lève une erreur qu'à partir de 8.

---

## 10. Check-list nouveau projet

**Une fois par serveur**
- [ ] Accès sortant vers GitHub (443)
- [ ] Git for Windows installé
- [ ] Node 26 installé (serveur de test uniquement)

**Pour chaque projet, sur chaque serveur cible**
- [ ] Jeton récupéré : *Settings → Actions → Runners → New self-hosted runner*
- [ ] Runner téléchargé et extrait dans `C:\actions-runners\<projet>`
- [ ] `config.cmd` lancé avec le label de la cible, installé en service
- [ ] Dossiers du site et des sauvegardes créés, droits `icacls` donnés à `S-1-5-20`
- [ ] Runner **Idle** sur GitHub

**Dans le dépôt du projet**
- [ ] `deploy.yml` copié, `options` et dossiers des cibles renseignés
- [ ] `ci.yml` copié (`runs-on: [self-hosted, test]`)
- [ ] Scripts `deploy`, `deploy:test` (et `deploy:admin` si besoin) dans `package.json`
- [ ] Workflows poussés sur `main`
- [ ] `npm run deploy:test` OK, puis les autres cibles

---

## Sécurité

- Les runners auto-hébergés s'utilisent **uniquement avec des dépôts privés**. Sur un dépôt public, n'importe quelle PR venant d'un fork pourrait exécuter du code sur le serveur.
- Le service tourne sous **SERVICE RÉSEAU**, avec des droits limités, et non sous `LocalSystem` ou un compte administrateur.
- Chaque runner n'a des droits d'écriture que sur les dossiers des sites qu'il publie.
