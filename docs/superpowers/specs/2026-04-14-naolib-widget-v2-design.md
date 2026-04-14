# Design Spec — Widget Naolib v2 : Criticité, Accordéon, Filtres avancés

**Date :** 2026-04-14  
**Statut :** Approuvé  
**Livrable :** `src/NaolibWidget.jsx` (fichier unique autonome, enrichi)

---

## 1. Contexte & objectif

Évolution du widget `NaolibWidget.jsx` existant pour ajouter :
- Des badges de criticité visuelle sur chaque perturbation
- Un tri automatique par criticité décroissante
- Un accordéon (expand/collapse) sur chaque carte
- Des filtres avancés : Statut, Durée, Favoris (localStorage)

La géolocalisation ("Autour de moi") est **hors périmètre** de cette itération — nécessiterait un second endpoint géo.

---

## 2. Approche retenue

**Option C — fichier unique `NaolibWidget.jsx` avec sections bien délimitées.**

- Tout reste dans un seul fichier autonome (copiable dans tout projet React + Tailwind)
- Sections séparées par des commentaires blocs
- Helpers purs (criticité, durée, favoris) en tête de fichier

---

## 3. Section 1 — Criticité

### Calcul

Nouveau champ `criticality` ajouté dans `normalizeRecord`, déduit du `type` normalisé :

```js
function getCriticality(type) {
  if (type === 'incident') return 'critique'
  if (type === 'travaux') return 'majeure'
  return 'mineure' // deviation, autre
}
```

Le champ `criticality` est ajouté au type `Disruption` : `'critique' | 'majeure' | 'mineure'`.

### Badges visuels (charte Naolib)

| Criticité | Hex bg | Texte | Label |
|-----------|--------|-------|-------|
| `critique` | `#ff8c12` (Orange Naolib) | `#ffffff` | CRITIQUE |
| `majeure` | `#e8c500` (Jaune Naolib) | `#002300` | MAJEURE |
| `mineure` | `#78d700` (Vert Pop Naolib) | `#002300` | MINEURE |

Le badge criticité s'affiche dans la vue réduite ET la vue dépliée de chaque carte.

### Tri

Les perturbations sont triées par criticité décroissante (`critique` > `majeure` > `mineure`) **après** application de tous les filtres actifs.

Ordre numérique interne : `critique = 0`, `majeure = 1`, `mineure = 2`.

### Bandeau global (`GlobalStatus`)

Le composant existant est mis à jour avec les couleurs Naolib :

| Perturbations actives | Statut | Couleur dot |
|-----------------------|--------|-------------|
| 0 | Trafic normal | `#78d700` Vert Pop |
| 1–2 | Réseau perturbé | `#e8c500` Jaune |
| 3+ | Réseau fortement perturbé | `#ff8c12` Orange |

---

## 4. Section 2 — Accordéon sur les cartes

### Vue réduite (défaut)

Affiche sur une ligne compacte :
- Badge criticité
- Badge(s) ligne(s)
- Badge type (travaux / incident / déviation / autre)
- Titre de la perturbation
- Chevron `▼` à droite

### Vue dépliée (au clic)

Révèle en plus :
- Description complète (suppression du `line-clamp-2`)
- Dates et heures précises : début → fin
- Chevron devient `▲`

### Comportement

- **Un seul accordéon ouvert à la fois** : ouvrir une carte ferme la précédente
- État géré dans `NaolibWidget` : `const [expandedId, setExpandedId] = useState(null)`
- `DisruptionCard` reçoit `isExpanded: bool` + `onToggle: () => void`
- Les cartes terminées (`isFinished`) ont le même comportement accordéon

---

## 5. Section 3 — Filtres avancés

### Organisation UI

```
Rangée 1 : [ Tout ] [ Tram ] [ Bus ] [ Navibus ]          ← existant
Rangée 2 : [ Statut ▾ ]  [ Durée ▾ ]  [ ⭐ Mes lignes ]  ← nouveau
```

### Dropdown Statut

État : `filterStatus` — valeurs : `'all' | 'en_cours' | 'a_venir'`

| Option | Logique |
|--------|---------|
| Tous (défaut) | aucun filtre |
| En cours | `startDate <= now && (!endDate \|\| endDate > now)` |
| À venir | `startDate > now` |

### Dropdown Durée

État : `filterDuration` — valeurs : `'all' | 'courte' | 'longue' | 'journee'`

| Option | Logique |
|--------|---------|
| Toute durée (défaut) | aucun filtre |
| Courte (< 2h) | `endDate - startDate < 2 * 3600 * 1000` |
| Longue (> 2h) | `endDate - startDate >= 2 * 3600 * 1000` |
| Toute la journée | pas d'heure précise OU durée ≥ 8h |

Si `endDate` absent → perturbation exclue des filtres Courte/Longue, incluse dans Toute la journée.

### Favoris

État : `favorites` — `Set<string>` (IDs de lignes), persisté dans `localStorage` sous la clé `naolib-favorites`.

- Étoile `☆` / `★` visible sur chaque carte (réduite et dépliée)
- Clic sur l'étoile : toggle l'ID de la **première ligne** de la perturbation dans `favorites`
- Bouton "Mes lignes" dans la rangée 2 : active `filterFavorites = true`
- Quand actif : ne garde que les perturbations dont au moins une ligne est dans `favorites`

### Combinaison des filtres

Tous les filtres s'appliquent en **AND** dans cet ordre :
1. Transport (existant)
2. Statut
3. Durée
4. Favoris
5. Tri par criticité

---

## 6. Composants modifiés / ajoutés

| Composant | Modification |
|-----------|--------------|
| `normalizeRecord` | + champ `criticality` |
| `getNetworkStatus` | couleurs mises à jour (charte Naolib) |
| `filterDisruptions` | remplacé par `applyFilters(disruptions, filters)` qui gère transport + statut + durée + favoris + tri |
| `GlobalStatus` | couleurs dot mises à jour |
| `FilterBar` | + rangée 2 : dropdowns Statut/Durée + bouton Mes lignes |
| `DisruptionCard` | + props `isExpanded`/`onToggle`, vue réduite/dépliée, badge criticité, étoile favori |
| `CriticalityBadge` | nouveau composant badge criticité |
| `NaolibWidget` | + états `expandedId`, `filterStatus`, `filterDuration`, `filterFavorites`, `favorites` |

---

## 7. Contraintes techniques

- React hooks uniquement : `useState`, `useEffect`, `useRef` (+ `useMemo` pour le tri/filtre si besoin de perf)
- `localStorage` pour la persistance des favoris — clé `naolib-favorites`, format JSON array d'IDs
- Aucune lib externe ajoutée
- Fichier autonome conservé

---

## 8. Hors périmètre

- Géolocalisation "Autour de moi" — reporter à la prochaine itération
- Notifications push
- Tests unitaires dans ce livrable
