# Utils – Documentation Technique

Ensemble de fonctions utilitaires disponibles dans tout le projet React.  
Organisées par catégories : cache, data, dates, nombres, storage et strings.

## utils/cache.functions.ts
- setCache
- getCache
- clearCache
- forceCleanExpiredCache
- forceCleanAllCache

## utils/data.functions.ts
- diffCompare
- deepClone
- toBoolean
- findConflicts

## utils/date.functions.ts
- isValidIsoDateString
- formatDate
- getTimeSince

## utils/number.functions.ts
- isDecimal
- roundTo
- clamp
- toNumber
- isValidNumber
- nearlyEqual
- percent
- formatNumber

## utils/storage.functions.ts
- getLocalStorageSize
- getLocalStorageBreakdown
- getLocalStorageQuota
- getCookie
- setCookie
- removeCookie

## utils/string.functions.ts
- copyToClipboard
- capitalizeFirstLetter
- normalizeStr
- advancedSearch


---

# 1. Cache Functions (`utils/cache.functions.ts`)

## `setCache(key, value, ttlMs?)`
Stocke une valeur dans :
- un cache mémoire interne (Map)
- le `localStorage` (compressé via LZString)

Paramètres :
- `ttlMs` : durée de vie en ms (par défaut 5 min)

---

## `getCache(key, resetTTL?)`
Récupère une valeur depuis le cache.

Stratégie :
1. Lecture mémoire  
2. Si absent/expiré → lecture `localStorage`  
3. Si valide → réinitialisation du TTL selon `resetTTL`

Retour :
- Valeur `T` si valide
- `null` sinon

---

## `clearCache(key?)`
- Avec clé → supprime l’entrée ciblée (mémoire + localStorage)
- Sans clé → supprime toutes les entrées du cache et vide la Map interne

---

## `forceCleanExpiredCache`
Nettoyage manuel des entrées expirées du `localStorage`.

---

## `forceCleanAllCache()`
Suppression totale du cache (mémoire + localStorage).

---

# 2. Data Functions (`utils/data.functions.ts`)

## `diffCompare(lhs, rhs, options)`
Compare deux objets et normalise les diffs via deep-diff.

Options :
- `ignorePaths`
- `ignoreTypes`
- `respectArrayOrder`
- `respectAccents`, `respectCase`, `respectType`
- `customComparators`

Retour :
- Un tableau de diffs normalisés
- `undefined` si aucune différence significative

---

## `deepClone(value)`
Clone profond basé sur JSON.

Limitations :
- Perte des fonctions, dates, Map, Set  
- Réservé aux structures JSON-compatibles

---

## `toBoolean(v)`
Coercition simple :
- `true`, `1`, `"1"` → `true`
- Autres → `false`

---

## `findConflicts(items, codeKey, valueKey)`
Détecte les valeurs (`valueKey`) liées à plusieurs codes (`codeKey`).

Retour :  
`[{ value: string, codes: string[] }]`

---

# 3. Date Functions (`utils/date.functions.ts`)

## `isValidIsoDateString(value)`
Vérifie la validité d’une date ISO, y compris overflow non valable.

---

## `formatDate(date, tokensOrPreset)`
Formatte une date selon :
- un tableau de tokens personnalisés
- un preset (`iso`, `iso-date`, `date-time`, etc.)

Tokens supportés :
- `Y`, `YY`, `YYYY`  
- `M`, `MM`, `MMM`  
- `D`, `DD`  
- `h`, `hh`  
- `m`, `mm`  
- `s`, `ss`  
- `DAY`, `MONTH`

---

## `getTimeSince(date)`
Retourne un texte humain :
- À l’instant  
- Il y a X minutes  
- Il y a X heures  
- Il y a X jours  

---

# 4. Number Functions (`utils/number.functions.ts`)

## `isDecimal(n)`
Retourne `true` si le nombre n’est pas entier.

---

## `roundTo(value, decimals?)`
Arrondit à `decimals` (2 par défaut).

---

## `clamp(value, min, max)`
Contraint un nombre à l’intervalle `[min, max]`.

---

## `toNumber(input)`
Conversion FR avec prise en charge de la virgule.

Retour :
- nombre  
- `undefined` si échec

---

## `isValidNumber(value)`
Vérifie si la valeur est un nombre strictement valide (exclut NaN, Infinity…).

---

## `nearlyEqual(a, b, epsilon?)`
Compare deux nombres avec tolérance (`1e-6` par défaut).

---

## `percent(part, total)`
Retourne `(part / total) * 100`.  
Si `total = 0` → `0`.

---

## `formatNumber(value, decimals?, locale?)`
Formatte un nombre selon un locale (`fr-FR` par défaut).

---

# 5. Storage Functions (`utils/storage.functions.ts`)

## `getLocalStorageSize(pretty?)`
Retourne :
- une string formatée en Ko/Mo  
- la taille brute en octets si `pretty = false`

---

## `getLocalStorageBreakdown()`
Retourne `{ key, sizeKB }` triés par taille décroissante.

---

## `getLocalStorageQuota()`
Estime la capacité maximale du `localStorage`.

---

## `getCookie(name)`
Lit un cookie.  
Retourne `undefined` si absent.

---

## `setCookie(name, value, days?)`
Crée ou écrase un cookie.  
Durée par défaut : 7 jours.

---

## `removeCookie(name)`
Supprime un cookie en appliquant une expiration passée.

---

# 6. String Functions (`utils/string.functions.ts`)

## `copyToClipboard(text)`
Copie du texte dans le presse-papiers via l’API Clipboard.

---

## `capitalizeFirstLetter(str)`
Majuscule sur première lettre, reste en minuscules.

---

## `normalizeStr(str, respectAccents?, respectCase?)`
Normalise une string pour comparaisons flexibles.

---

## `advancedSearch(search, comparedValue, threshold?)`
Recherche textuelle intelligente :  
- normalisation  
- égalité  
- inclusion  
- similarité (Levenshtein)

Retour : `true` ou `false`.