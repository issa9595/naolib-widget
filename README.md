# Naolib Widget — État du réseau & perturbations

Widget React autonome affichant les perturbations en temps réel du réseau Naolib (Nantes Métropole).

## Démo rapide

```bash
git clone https://github.com/issa9595/naolib-widget.git
cd naolib-widget
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## Intégration dans votre projet

Copiez `src/NaolibWidget.jsx` dans votre projet React + Tailwind CSS :

```jsx
import NaolibWidget from './NaolibWidget'

export default function App() {
  return <NaolibWidget />
}
```

**Prérequis :** React 18+, Tailwind CSS 3+

## Fonctionnalités

- Perturbations en temps réel via l'Open Data Nantes Métropole
- Fallback automatique sur des données simulées si l'API est indisponible
- Rafraîchissement automatique toutes les 60 secondes
- Filtre par type de transport : Tram, Bus, Navibus
- Indicateur global d'état du réseau
- Responsive mobile-first

## Source des données

[Open Data Nantes Métropole — Info-trafic TAN temps réel](https://data.nantesmetropole.fr/explore/dataset/244400404_info-trafic-tan-temps-reel/)
