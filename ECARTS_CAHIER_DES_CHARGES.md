# Vinidoc — Écarts entre le cahier des charges v1.1 et l'application actuelle

> Comparaison du document *Cahier des charges – Application Vinidoc v1.1* (27/10/2026) avec le code existant :
> - front : `FRONTs/REACT/vinidoc` (dont les modifications non commitées : `useArticle.ts`, `ArticleLogistics.tsx`…)
> - API : `BACKs/APIs/api.dev/V1.1.0/modules/vinidoc` (routes, controllers, services, utils, validators, `sql/VINIDOC.tables.sql`)
>
> Ce document liste les modifications à apporter. **Aucune modification n'a été faite.**
>
> Légende : ✅ conforme · ⚠️ partiel · ❌ absent · 🔁 comportement contraire au cahier des charges

---

## 1. Synthèse — les écarts structurants

| # | Sujet | Cahier des charges | Application actuelle | Impact |
|---|---|---|---|---|
| A | **Point d'entrée de la génération** | On part du **code PFI** ; le VHL et la fiche œnologique en découlent (§3.1, EF-50). | On choisit un **vin (fiche, `SHTID`)** ; l'article PFI est un complément (`COD_ARTICLE` facultatif côté API, sélection de fiche possible sans PFI). | 🔁 Refonte du parcours de génération et de `POST /generate`. |
| B | **Génération d'une fiche non validée** | **Interdite** (EF-52, RG-08, décision §8). | **Autorisée** depuis la saisie en cours, avec un avertissement (`getGenerationSource` → `SOURCE: "CURRENT"`, `GENERATIONS.VERNUM` nullable). | 🔁 Bloquant pour la recette (scénario 7). |
| C | **Modification d'une fiche validée** | Elle **reste Validée** ; bouton « Modifier » ; chaque enregistrement crée **une nouvelle version validée** (RG-01). | Toute modification par l'Œnologie **repasse la fiche en Brouillon** ; le Marketing ne peut pas modifier une fiche validée (erreur 50172). | ✅ **Réalisé le 29/10/2026** : bouton « Modifier », `PUT /sheets/:SHTID/validated` → nouvelle version, fiche toujours validée. |
| D | **Fiche œnologique = 1 code VHL** | Une seule fiche par code vrac ; caractéristiques du vrac (appellation, couleur, millésime, qualité, typologie, domaine, manipulation) **reprises de Sage X3, en lecture seule** (EF-20/21). | Unicité **code vrac + millésime** ; appellation, couleur, millésime, description vrac **saisis à la main** ; code vrac non contrôlé dans l'ERP. Typologie, spécificité, domaine/château, manipulation absents. | 🔁 Modèle de données + écran de saisie. |
| E | **Réservation d'une fiche ouverte (RG-04)** | Verrou pessimiste : 2ᵉ utilisateur prévenu **avant saisie**, avec nom + depuis quand ; libération à l'enregistrement / fermeture / inactivité. | Verrouillage **optimiste** seulement (`ROWVER` → 409 à l'enregistrement) + bandeau « modifiée par un autre utilisateur » après coup. | ✅ **Réalisé le 29/10/2026** : table `SHEETLOCKS`, bouton « Modifier » qui réserve, bandeau nom + heure, expiration paramétrable, 423 côté API. |
| F | **Désignation adaptée du PFI** | Modifiable, conservée dans Vinidoc par PFI, reproposée, tracée dans l'historique (EF-15, ENF-11). | **Inexistante.** | ❌ Table + écran + balise + historique (scénario 2). |
| G | **Poids pleins et hauteur palette calculés** | Calculés par Vinidoc à partir des poids à vide (EF-16/17), formules paramétrables. | `CASEWGT`, `PALHGT`, `PALWGT` = **valeurs de test codées en dur** dans `services.getArticle` ; poids bouteille = `POIDS_ARTICLE` du DWH ; aucun calcul. | ✅ **Réalisé le 29/10/2026** : calcul depuis les matières sèches du DWH, paramètres dans `PARAMS` (écran Paramètres). Unités et formules à valider avec le référent X3. |
| H | **Correction en ligne des textes trop longs (EF-53)** | Boîte de dialogue listant chaque texte (« DEGUST 412/350 ») **avec correction sur place**, enregistrée comme modification de fiche validée, puis reprise de la génération. | Contrôle affiché, génération bloquée, message « corrigez la fiche (œnologie) puis faites-la revalider ». Pas de correction sur place. | ✅ **Réalisé le 29/10/2026** : bouton « Corriger les textes et générer », correction tracée en nouvelle version, reprise automatique de la génération. |
| I | **Source Sage X3** | Lecture Sage X3 au moment de la génération (§3.2, EF-52, ENF-20/22). | Lecture de la base **DWH_BI** (`dbConnectionName: "dwhbi"`), copie décalée de l'ERP. | ⚠️ À arbitrer avec le référent Sage X3 (module `x3v12` existant dans l'API). |

---

## 2. Profils et habilitations (§2.2, §4, ENF-01/02)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| 5 profils cumulables (Générateur, Rédacteur, Traducteur, Valideur, Gestionnaire de modèles) | ⚠️ | 3 droits seulement : `EDIT` (Œnologie), `VALIDATE` (Marketing), `TEMPLATES` (Marketing) ; `GENERATE` = `true` pour tout utilisateur VINIDOC. Pas de profil « Traducteur » distinct du Valideur. | Ajouter les droits `GENERATE` (ŒNOLOGIE/MARKETING) et `TRANSLATE` (MARKETING) dans `utils.getRights`, les exposer dans `Rights` (front) et les contrôler côté API. |
| Services par profil paramétrables sans développement | ⚠️ | Variables d'environnement (`VINIDOC_EDITOR_SERVICES`, `VINIDOC_VALIDATOR_SERVICES`, `VINIDOC_TEMPLATE_SERVICES`) : nécessite un redémarrage de l'API. | Confirmer que c'est acceptable ; sinon table de paramétrage `PROFILESERVICES` en base VINIDOC. |
| RG-07 : FR saisi par l'Œnologie, EN par le Marketing | ❌ | Aucun contrôle par langue : un rédacteur peut saisir l'anglais ; le Marketing ne peut saisir l'anglais **que** sur une fiche Soumise. | Contrôler la langue dans `upsertTranslation` / `deleteTranslation` (langue par défaut ⇒ Rédacteur ; autres langues ⇒ Traducteur) et griser les onglets de langue en conséquence dans `SheetEditor` / `TextsCard`. |
| §5.1 : en Brouillon, le Marketing peut saisir la traduction anglaise | ❌ | `RESOLVE_EDIT_STATUS` refuse toute modification Marketing hors statut `SUBMITTED`. | Autoriser le Traducteur sur les fiches `DRAFT` (sans changer le statut) et `VALIDATED` (via « Modifier », cf. §5). |
| RG-06 : le soumissionnaire ne peut pas valider sa propre fiche | ❌ | Aucun contrôle dans `validateSheet` (un utilisateur ŒNOLOGIE + MARKETING ou un manager peut soumettre puis valider). | Ajouter `IF @SUBUSR = @USR THROW …` dans `services.validateSheet`, et masquer le bouton « Valider » côté front quand `sheet.SUBUSR === utilisateur courant`. |
| Accès direct par URL refusé | ✅ | `PrivateRoute requireRight` + contrôle API. | À étendre aux nouveaux droits (`GENERATE` sur `/`). |

---

## 3. Interface et menu (§4, EF-01 à EF-03)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-01 Connexion via le portail | ✅ | `@uvcdr/api-auth-system`. | — |
| EF-02 Menu rétractable, utilisateur, version + nouveautés, Retour au portail | ✅ | `Nav.tsx`, `VersionModal`. | — |
| Menu à 4 entrées : Générer une fiche technique / Données œnologiques / **À valider** / Modèles PowerPoint | ⚠️ | Entrées : « Fiches techniques », « Fiches œnologiques », « Modèles PowerPoint », « Paramètres ». La page `/validation` existe mais **n'a pas d'entrée dans le menu**. | Ajouter l'entrée « À valider » (`/validation`, `show: rights.VALIDATE`) ; renommer les libellés selon le CDC (« Générer une fiche technique », « Données œnologiques »). « Paramètres » (thème) peut rester. |
| EF-03 Compteur des fiches à valider pour les valideurs | ⚠️ | Le badge est sur « Fiches œnologiques ». | Le déplacer sur l'entrée « À valider ». |

---

## 4. Recherche d'un produit fini (§4.2, EF-10 à EF-17)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-10 Recherche par code ou désignation, PFI **ou BIB** | ⚠️ | Recherche assistée OK, mais filtrée sur `LIKE 'PFI%'` (`services.searchArticles`) : **les BIB sont exclus**. | Élargir le filtre aux codes BIB (à confirmer avec le référent X3 : préfixe `BIB%` ?). |
| EF-11 Affichage code, désignation, VHL, logistique | ⚠️ | `ArticleLogistics` affiche la logistique ; pas de carte « produit » claire avec le VHL rattaché. | Afficher un récapitulatif produit (code, désignation X3, désignation adaptée, VHL) en tête du parcours. |
| EF-12 Un PFI ⇒ un seul VHL, déterminé sans ambiguïté | 🔁 | L'API gère **plusieurs** codes vrac (`CODVRACS`, `STRING_AGG`) et choisit une fiche « même millésime d'abord » (`sortArticleSheets`), avec repli sur une fiche d'un **autre millésime** (alerte front « Aucune fiche du millésime… »). | Retenir le VHL unique de la nomenclature ; supprimer le repli sur un autre millésime ; erreur explicite si 0 ou >1 VHL. |
| EF-13 Messages : PFI inexistant / sans vrac / sans fiche œnologique | ⚠️ | Messages présents pour « sans fiche » ; à vérifier pour « sans vrac » (CODVRACS vide) et « PFI inexistant » (404 `VINIDOC_ARTICLE_NOT_FOUND`). Ajouter « fiche jamais validée ». | Uniformiser les 4 messages (inexistant, sans vrac, sans fiche, fiche non validée). |
| EF-14 Données logistiques manquantes signalées, génération possible | ⚠️ | Les champs vides sont rendus vides, mais aucun signalement explicite des manquants. | Marquer les champs vides dans `ArticleLogistics` (« non renseigné dans Sage X3 »). |
| EF-15 Désignation adaptée | ❌ | Voir écart **F**. | Table `PFIDESIGN (COD_ARTICLE, DESIGNATION, MODUSR, MODDAT)` ; champ pré-rempli avec la désignation X3 dans le formulaire ; balise `{{PFI.DESIGNATION}}` ; colonne dans `GENERATIONS`. |
| EF-16 Poids bouteille pleine / carton plein / palette chargée calculés | ❌ | Voir écart **G**. Valeurs de test codées en dur (`LOGISTICS_TEST_TAGS`). | Lire les poids à vide dans X3 et calculer : bouteille pleine = vide + volume × masse volumique ; carton plein = carton vide + n × bouteille pleine ; palette = support + n × carton plein. |
| EF-17 Hauteur palette chargée calculée, paramètres modifiables | ❌ | Valeur de test (160 cm). | Hauteur = support + couches × hauteur carton. Table de paramètres (masse volumique, poids et hauteur du support palette) + écran d'administration. |
| Liste des balises logistiques | ⚠️ | `{{LOG.BTLPAL}}` (bouteilles par palette) du CDC **absent** ; l'API expose `LOG.CASEPAL` (cartons/palette) et utilise `LOG.UNITPAL` = bouteilles/palette, alors que le CDC fait de `UNITPAL` les **cartons** par palette. | Aligner les noms : `LOG.UNITCASE` (btl/carton), `LOG.UNITPAL` (cartons/palette), `LOG.BTLPAL` (btl/palette) — à valider car cela impacte les modèles déjà déposés. |
| ENF-20 Recherche < 3 s | ⚠️ | Commentaire du code : une requête dépassait le délai de 15 s sur le DWH. | Mesurer ; indexer / passer par X3 selon l'arbitrage **I**. |

---

## 5. Données œnologiques (§4.3, EF-20 à EF-29)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-20 Code VHL obligatoire, **contrôlé dans Sage X3**, une seule fiche par code | 🔁 | Simple regex `^[A-Z0-9_.-]+$` ; unicité `(CODVRAC, MILLESIME)`. | Vérifier l'existence du VHL dans X3/DWH à la création ; index unique sur `CODVRAC` seul (`WHERE ISDEL = 0`). |
| EF-21 Caractéristiques du vrac reprises de X3, lecture seule | 🔁 | `APPELL`, `COLCOD`, `MILLESIME`, `DESCVRAC` saisis manuellement (`CommonFormFields`) ; typologie, spécificité typologie, domaine/château, manipulation absents. | Lire ces données depuis X3 à partir du VHL (affichage en lecture seule dans `CommonFieldsCard`) ; retirer ces champs des schémas `sheetCreateSchema` / `sheetUpdateSchema`. Prévoir la reprise des fiches existantes (millésime aujourd'hui sur la fiche). |
| EF-22 Textes par langue, FR obligatoire pour soumettre | ✅ | `SHEETTRANS` + contrôle à la soumission. | — |
| EF-23 / 24 / 25 Échelles 1 à 5, libellés bouche selon la couleur | ✅ | `COLORTRANS.BOUMIN/BOUMAX`. | Une fois la couleur lue dans X3, faire la correspondance couleur X3 → `COLCOD`. |
| EF-26 Température −5 à 30 °C, pas 0,5, min ≤ max | ✅ | `validators.temperature` + `CK_SHEETS_TEMP`. | — |
| EF-27 Création à partir du millésime antérieur | ❌ | Aucune reprise dans `SheetCreateForm` ni dans l'API (l'import Excel `SheetImportModal` est une autre fonction). | Champ « VHL du millésime précédent » à la création ; endpoint `POST /sheets` avec `FROM_CODVRAC` qui copie textes (toutes langues), échelles et température. |
| EF-28 Liste avec recherche, filtres statut / couleur / millésime, pagination | ✅ | `SheetsList`. | Le filtre millésime devra lire le millésime X3 (cf. EF-21). |
| EF-29 Historique des actions et versions ; suppression logique avec commentaire | ✅ | `EventsTimeline`, `VersionModal`, `ISDEL`. | — |

---

## 6. Textes multilingues (§4.4, EF-30 à EF-33)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-30 Saisie par langue de l'intitulé, cépages, terroir, vinification, dégustation, garde, accords, explication | ✅ | `SHEETTRANS` (LIBELLE, CEPAGES, TERROIR, VINIF, DEGUST, GARDE, ACCORDS, ACCEXPL). | — |
| EF-31 FR + EN seulement au démarrage, autres langues par paramétrage | ⚠️ | Le script SQL active **fr, en, de, es, it, nl** (`ACTIVE = 1`). | Passer `de`, `es`, `it`, `nl` à `ACTIVE = 0` dans le script de données de référence. |
| EF-32 Compteur de caractères vs longueur max la plus stricte des modèles actifs | ⚠️ | OK pour les textes ayant une balise (`LimitedTextarea` + `/merge-fields`). Mais CEPAGES, GARDE, ACCORDS, ACCEXPL n'ont **pas de balise** (cf. EF-42), donc pas de limite. | Résolu par l'ajout des balises manquantes (EF-42). |
| EF-33 Contrôle à la demande face aux modèles | ✅ | `POST /sheets/:SHTID/check`, `CheckReportModal`. | — |

---

## 7. Modèles PowerPoint (§4.5, EF-40 à EF-46)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-40 Import .pptx ≤ 30 Mo, nom unique, description, langue (vide = toutes) | ✅ | `upload.js` (`TEMPLATE_MAX_SIZE` 30 Mo), `UX_TEMPLATES_TPLNAM`. | — |
| EF-41 Détection `{{BALISE}}`, `{{BALISE-250}}`, `img:BOTTLEPHOTO`, `badge:` (couleur, jauges, HVE, BIO, BIOHVE) | ✅ | `ooxml-engine`, `utils.BADGE_PATTERNS`. | — |
| EF-42 Catalogue couvrant **toutes** les données œnologiques et X3 | ❌ | `TEXT_FIELDS` ne contient que APPELLATION, TEMP, DEGUST, TERROIR, VINIF et LOG.*. **Manquent** : CEPAGES, GARDE, ACCORDS, ACCEXPL, code PFI, désignation (X3 / adaptée), millésime, code VHL, appellation, typologie, domaine/château, etc. | Ajouter ces entrées à `TEXT_FIELDS` (avec `FIELD` pour les champs de traduction) ; elles apparaîtront dans `MergeFieldsCatalog`, les compteurs et le contrôle. |
| EF-43 Inspection avant enregistrement (reconnues / inconnues / manquantes) | ✅ | `POST /templates/inspect`, `TemplateInspectionView`. | — |
| EF-44 Longueur max 1 à 10 000 et caractère obligatoire par balise | ✅ | `PUT /templates/:TPLID/tags`. | — |
| EF-45 Remplacement du fichier en conservant les réglages ; anciens fichiers conservés | ⚠️ | Réglages conservés (`replaceTemplateFile`). Conservation de l'ancien fichier dans APPATTACHMENTS **à vérifier** (pas d'historique des fichiers modèle consultable). | Vérifier que l'ancien `FILECODE` n'est pas supprimé ; idéalement table `TEMPLATEFILES` (historique). |
| EF-46 Activation, désactivation, suppression logique | ✅ | `ACTIVE`, `ISDEL`. | — |

---

## 8. Génération des fiches techniques (§3.1, §4.6, EF-50 à EF-54)

| Exigence | État | Constat | Modification à apporter |
|---|---|---|---|
| EF-50 Génération à partir d'un **PFI**, langue, modèle, format (PDF par défaut) | 🔁 | Voir écart **A** : `generateSchema` exige `SHTID`, `COD_ARTICLE` est facultatif. | `POST /generate` : `COD_ARTICLE` obligatoire, `SHTID` déduit du VHL côté serveur. Front : supprimer la sélection directe d'un vin et le paramètre `?sheet=` ; le PFI pilote tout le parcours. |
| EF-51 Logos HVE / BIO, photo PNG/JPG/WEBP ≤ 15 Mo | ✅ | `PHOTO_MAX_SIZE`, `certificationBadges`. | Vérifier que le filtre d'extension photo est bien limité à png/jpg/jpeg/webp. Arbitrage §8 « photo stockée par PFI » non tranché. |
| EF-52 Dernière version validée uniquement ; interdit si jamais validée ; X3 lu à la génération | 🔁 | Voir écart **B**. De plus, une fiche validée puis modifiée (repassée en DRAFT aujourd'hui) est générée depuis la **saisie en cours** (`STATUS !== 'VALIDATED'` ⇒ `CURRENT`), en contradiction avec RG-03. | `getGenerationSource` : toujours `getSheetVersion(SHTID)` ; erreur `VINIDOC_SHEET_NOT_VALIDATED` si aucune version. Rétablir `GENERATIONS.VERNUM NOT NULL`. Front : retirer l'avertissement « Vin non validé… saisie en cours » et bloquer. |
| EF-53 Dialogue de correction (« DEGUST 412/350 », « TERROIR vide ») et reprise | ❌ | Voir écart **H**. | Nouvelle modale : un champ par texte en écart avec compteur ; enregistrement via « Modifier une fiche validée » (nouvelle version, RG-01) ; relance automatique de la génération. Réservé aux profils Rédacteur/Traducteur selon la langue. |
| EF-54 Aperçu, téléchargement, historique (PFI, **désignation utilisée**, version, modèle, langue, auteur, date) | ⚠️ | Historique présent (`GenerationHistory`) mais sans désignation ; PFI stocké (`COD_ARTICLE`) mais facultatif. | Ajouter `DESIGNATION` à `GENERATIONS` et à l'historique ; afficher le PFI en premier. |
| Aucune troncature automatique | ✅ | Génération bloquée en cas de dépassement. | — |

---

## 9. Workflow de validation (§5, RG-01 à RG-08)

| Règle | État | Constat | Modification à apporter |
|---|---|---|---|
| Statuts Brouillon / Soumise / Validée / Refusée | ✅ | `CK_SHEETS_STATUS`. | — |
| RG-01 Fiche validée jamais repassée en Brouillon ; « Modifier » crée une nouvelle version validée | 🔁 | Voir écart **C** ; texte du front : « Toute modification annule la soumission et repasse la fiche en brouillon ». | Bouton « Modifier » sur une fiche `VALIDATED` (Rédacteur ou Traducteur) ; à l'enregistrement : nouvelle ligne `SHEETVERS` + événement (nouveau type `VALIDATED_UPDATED`, commentaire), statut inchangé. Mettre à jour le commentaire d'en-tête du script SQL et `EVTTYP`. |
| RG-02 Version numérotée, non modifiable, complète | ✅ | `SHEETVERS` insert-only. | Ajouter un trigger `INSTEAD OF UPDATE, DELETE` (ENF-10) pour garantir l'immuabilité. |
| RG-03 Tant que la modification n'est pas enregistrée, la génération utilise la dernière version validée | ⚠️ | Vrai seulement si la fiche est encore `VALIDATED` (cf. EF-52). | Résolu par la correction EF-52. |
| RG-04 Réservation de la fiche ouverte | ❌ | Voir écart **E**. | Table `SHEETLOCKS (SHTID, USR, USRNAME, LOCKDAT, LASTSEEN)` ; `POST/DELETE /sheets/:SHTID/lock` + heartbeat ; expiration paramétrable ; message « Fiche en cours de modification par X depuis HH:MM » à l'ouverture ; lecture seule pour les autres ; conserver le `ROWVER` comme garde-fou. |
| RG-05 Journalisation de toutes les actions | ⚠️ | OK sauf « modification d'une fiche validée » (n'existe pas encore). | Ajouter le type d'événement correspondant. |
| RG-06 Soumissionnaire ≠ valideur | ❌ | Voir §2. | — |
| RG-07 FR par l'Œnologie, EN par le Marketing | ❌ | Voir §2. | — |
| RG-08 Génération uniquement si version validée | 🔁 | Voir écart **B**. | — |
| §5.2 Soumission avec commentaire facultatif, refus avec motif obligatoire | ✅ | `workflowCommentSchema`, `rejectSchema` (min 3). | — |
| Soumission en masse (`POST /sheets/submit-all`) | ➕ | Fonction **hors CDC** (utile pour la reprise des données). | À conserver ; la mentionner dans le CDC ou le mode opératoire. |

### Notifications email (§5.4)

| Évènement | État | Constat |
|---|---|---|
| Soumission → adresse Marketing paramétrable | ✅ | `VINIDOC_MARKETING_EMAIL` (+ notification récapitulative pour la soumission en masse). |
| Validation → soumissionnaire | ✅ | `SUBUSR`. |
| Refus avec motif → soumissionnaire | ✅ | `SUBUSR`. |
| Relance automatique du Marketing | — | Point §8 non arbitré : rien à faire tant que la décision n'est pas prise. |

---

## 10. Exigences non fonctionnelles (§7)

| Exigence | État | Constat / modification |
|---|---|---|
| ENF-01/02 Accès authentifié, droits revérifiés côté serveur | ✅ | `assertVinidocApp` + `assertCan*`. À compléter avec les nouveaux droits. |
| ENF-03 Validation des entrées | ✅ | zod. |
| ENF-04 Fichiers filtrés par type et taille | ✅ | `extensionFilter`, limites multer. Ajouter éventuellement un contrôle du type réel (signature) en plus de l'extension. |
| ENF-05 Fichiers générés et modèles réservés aux authentifiés | ⚠️ | Les fichiers et aperçus sont servis par URL statique (`API_BASE_UPLOAD_URL`, dossier `previews`). **Vérifier** que le service statique exige un token ; sinon passer par un endpoint authentifié. |
| ENF-06 Secrets hors du code | ✅ | Variables d'environnement. |
| ENF-10 Journal et versions non modifiables | ⚠️ | Insert-only par convention ; ajouter triggers / droits SQL (DENY UPDATE, DELETE sur `SHEETEVTS`, `SHEETVERS`). |
| ENF-11 Génération : PFI, **désignation**, version, fichier modèle, langue, options, auteur | ⚠️ | Manque la désignation ; `VERNUM` nullable et `COD_ARTICLE` facultatif à rendre obligatoires ; la photo bouteille n'est pas tracée (option). |
| ENF-12 Suppressions logiques uniquement | ⚠️ | OK fiches et modèles, mais `DELETE FROM dbo.SHEETTRANS` (suppression physique d'une traduction). Remplacer par une suppression logique ou s'appuyer sur l'historique des versions. |
| ENF-20 Recherche < 3 s | ⚠️ | Voir §4. |
| ENF-21 PDF < 30 s | ? | À mesurer en recette. |
| ENF-22 Indisponibilité Sage X3 signalée clairement | ❌ | Aucun message dédié en cas d'erreur DWH/X3. Ajouter une erreur métier `VINIDOC_ERP_UNAVAILABLE` + message front. |
| ENF-30/31 Interface en français, navigateurs du parc | ✅ | — |
| ENF-32 Tests automatisés : règles de gestion, génération, échanges X3 | ⚠️ | Tests unitaires `utils`, `validators`, `ooxml-engine` + intégration des routes. Ajouter des tests pour RG-01, RG-04, RG-06, RG-08, les calculs EF-16/17 et la lecture X3. Aucun test côté front. |
| ENF-33 Documentation technique + mode opératoire | ⚠️ | `modules/vinidoc/README.md` côté API ; pas de mode opératoire utilisateur. |

---

## 11. Données de référence et migration

- **Langues** : désactiver `de`, `es`, `it`, `nl` (EF-31).
- **Fiches** : passage de l'unicité `(CODVRAC, MILLESIME)` à `CODVRAC` seul ; suppression des colonnes saisies `APPELL`, `COLCOD`, `MILLESIME`, `DESCVRAC` (ou conservation en cache, non modifiable) au profit de la lecture X3. Prévoir un script de contrôle des doublons avant migration.
- **Générations** : `VERNUM NOT NULL`, `COD_ARTICLE NOT NULL`, ajout `DESIGNATION` (les générations antérieures non validées devront être purgées ou conservées avec une valeur par défaut).
- **Balises** : renommage éventuel `LOG.CASEPAL` / `LOG.UNITPAL` / `LOG.BTLPAL` ⇒ les modèles déjà déposés devront être redéposés (balises signalées comme inconnues).
- **Nouvelles tables** : `PFIDESIGN`, `SHEETLOCKS`, `PARAMS` (masse volumique, support palette, durée de réservation, services par profil si besoin).

---

## 12. Points du CDC encore à arbitrer (§8) ayant un impact sur le code

| Question | Décision CDC | Impact |
|---|---|---|
| Liste définitive des données logistiques et emplacement X3 | **Non tranchée** | Bloque EF-16/17 et le remplacement des valeurs de test. |
| Relance automatique du Marketing | **Non tranchée** | Tâche planifiée à prévoir si « oui ». |
| Photo bouteille : à chaque génération ou stockée par PFI | **Non tranchée** | Aujourd'hui : à chaque génération. Si stockée : table + écran par PFI. |
| Source des données : Sage X3 direct ou DWH | Non posée dans le CDC | Écart **I** : à ajouter aux points à arbitrer. |

---

## 13. Ordre de réalisation proposé

1. **Workflow** (bloquant recette) : interdire la génération non validée (B, EF-52/RG-08) ; « Modifier » une fiche validée sans repasser en Brouillon (C, RG-01) ; RG-06 ; droits par langue (RG-07) et Traducteur sur Brouillon.
2. **Parcours PFI** : génération pilotée par le PFI (A), VHL unique (EF-12), BIB (EF-10), messages EF-13/14, désignation adaptée (F), historique enrichi (EF-54, ENF-11).
3. **Fiche = VHL** : caractéristiques lues dans X3 en lecture seule (D, EF-20/21), migration des données, reprise du millésime antérieur (EF-27).
4. **Catalogue des balises** complet (EF-42) ⇒ compteurs EF-32 complets.
5. **Dialogue de correction** à la génération (H, EF-53).
6. **Réservation des fiches** (E, RG-04).
7. **Logistique calculée** (G, EF-16/17) — dès que le référent X3 a fourni la liste et les formules.
8. **Menu** (« À valider » + compteur, libellés) et **ENF** (immuabilité SQL, fichiers authentifiés, indisponibilité X3, tests, mode opératoire).
