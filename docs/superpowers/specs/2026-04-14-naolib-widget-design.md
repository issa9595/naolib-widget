# Design Spec — Widget "État du réseau & perturbations" Naolib

**Date :** 2026-04-14  
**Statut :** Approuvé  
**Livrable :** `src/NaolibWidget.jsx` (fichier autonome) + projet Vite démo

---

## 1. Contexte & objectif

Widget React destiné à la page d'information voyageurs du site Naolib (opérateur de transports publics de Nantes Métropole). Il informe les usagers sur les perturbations en cours du réseau (tram, bus, navibus) de manière claire et en temps quasi-réel.

---

## 2. Architecture

### Approche retenue : fichier `.jsx` unique autonome

`NaolibWidget.jsx` contient en un seul fichier :
- Le hook `useFetch` (fetch + fallback mock + auto-refresh)
- La logique de normalisation des données API
- Les données mock intégrées
- Tous les sous-composants internes (fonctions JSX locales)
- L'export `default NaolibWidget`

Ce fichier peut être copié dans n'importe quel projet React + Tailwind sans aucune autre dépendance.

### Flux de données

```
useFetch()
  ├── Tente endpoint temps-réel ODS
  │     GET https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/
  │         244400404_info-trafic-tan-temps-reel/records?limit=20
  ├── Si CORS / erreur réseau / 4xx-5xx → bascule sur mockData[]
  ├── Normalise les records → Disruption[]
  ├── Auto-refresh toutes les 60 secondes (setInterval)
  └── Expose : { data, loading, error, isMock, lastUpdate, refresh }
```

### Type de données normalisées

```js
// Disruption
{
  id: string,
  type: "travaux" | "incident" | "deviation" | "autre",
  transport: "tram" | "bus" | "navibus",
  lines: string[],       // ex: ["Tram 1", "Tram 2"]
  title: string,
  description: string,
  startDate: string,     // ISO ou lisible
  endDate: string,
}
```

---

## 3. Composants internes

| Composant | Rôle |
|-----------|------|
| `Header` | Titre "État du réseau", horodatage dernière MAJ, bouton refresh |
| `GlobalStatus` | Badge coloré état général du réseau |
| `FilterBar` | Boutons filtre : Tout / Tram / Bus / Navibus |
| `DisruptionCard` | Carte d'une perturbation (badge type, lignes, titre, desc, dates) |
| `EmptyState` | Message rassurant quand 0 perturbation après filtre |
| `SkeletonCard` | Placeholder animé pendant le chargement (×3) |
| `MockBanner` | Bandeau jaune discret si données simulées actives |

---

## 4. Règles de l'indicateur global

| Perturbations actives | Statut | Couleur |
|-----------------------|--------|---------|
| 0 | Trafic normal | Vert (`#2E7D32`) |
| 1–2 | Réseau perturbé | Orange (`#E65100`) |
| 3+ | Réseau fortement perturbé | Rouge (`#C62828`) |

L'indicateur se base sur les perturbations **après application du filtre actif**.

---

## 5. Système de couleurs

### Charte Naolib
- Bleu principal : `#003189`
- Fond widget : blanc avec border subtile
- Fond page démo : gris clair `#F3F4F6`

### Badges transport
| Transport | Couleur | Tailwind approx. |
|-----------|---------|-----------------|
| Tram | Bleu `#003189` | `bg-blue-900` |
| Bus | Vert `#2E7D32` | `bg-green-800` |
| Navibus | Orange `#E65100` | `bg-orange-700` |

### Badges type de perturbation
| Type | Couleur |
|------|---------|
| Travaux | Jaune `#F9A825` + texte sombre |
| Incident | Rouge `#C62828` |
| Déviation | Violet `#6A1B9A` |
| Autre | Gris |

---

## 6. États UI

| État | Affichage |
|------|-----------|
| Chargement initial | 3 `SkeletonCard` animées (pulse) |
| Données en cours de refresh | Spinner discret dans le header (sans masquer la liste) |
| Erreur API + mock actif | `MockBanner` jaune en haut du widget |
| 0 perturbation (filtre actif) | `EmptyState` vert avec icône checkmark |
| 0 perturbation (aucun filtre) | `EmptyState` vert "Trafic normal sur l'ensemble du réseau" |

---

## 7. Données mock (5 perturbations)

| Transport | Ligne | Type | Titre |
|-----------|-------|------|-------|
| Tram | Tram 1 | Travaux | Interruption entre Manufacture et Commerce |
| Tram | Tram 2 | Déviation | Déviation suite à événement place Royale |
| Bus | C1 | Incident | Retards importants — accident sur le parcours |
| Bus | C6 | Travaux | Arrêts supprimés du 14 au 18 avril |
| Navibus | N | Incident | Service réduit — conditions météo défavorables |

---

## 8. Structure du projet Vite (démo)

```
naolib-widget/
├── index.html
├── package.json            ← React 18, Vite, Tailwind CSS, autoprefixer, postcss
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── index.css           ← @tailwind base/components/utilities
│   ├── App.jsx             ← fond gris, monte <NaolibWidget />
│   └── NaolibWidget.jsx    ← livrable principal
└── README.md
```

**Dépendances npm :**
- `react` + `react-dom` (^18)
- `vite` + `@vitejs/plugin-react`
- `tailwindcss` + `postcss` + `autoprefixer`

Aucune autre dépendance.

---

## 9. Contraintes techniques résumées

- React hooks uniquement : `useState`, `useEffect`
- Pas de lib externe sauf Tailwind CSS
- Composant nommé `NaolibWidget`, `export default`
- Refresh automatique toutes les 60 secondes
- Responsive mobile-first (grille 1 col → 2 col sur `md:`)
- Source de données : API publique ODS sans clé d'authentification

---

## 10. Hors périmètre

- Pas de carte géographique
- Pas de détail de trajet
- Pas de notifications push
- Pas de persistance locale (localStorage)
- Pas de tests unitaires dans ce livrable
