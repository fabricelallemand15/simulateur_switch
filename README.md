# Simulateur de Switch

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Licence MIT](https://img.shields.io/badge/Licence-MIT-green)

Application React/Vite pour visualiser simplement le fonctionnement d'un switch Ethernet: apprentissage de la table SAT (MAC -> port), recherche de destination, unicast et flooding. 🚦

## Aperçu

Ce projet est pensé pour l'apprentissage réseau: vous choisissez un poste source et une destination, puis la simulation détaille chaque étape de circulation d'une trame. 🧠

## Fonctionnalités

- Simulation pas à pas de l'envoi d'une trame Ethernet.
- Visualisation de l'apprentissage de la table SAT du switch.
- Cas connus: transmission unicast vers le bon port.
- Cas inconnus: flooding sur les autres ports.
- Interface pédagogique avec indications visuelles. ✨

## Stack technique

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icônes)
- Motion (animations)

## Installation et lancement

Prérequis: Node.js 18+ et npm.

```bash
npm install
npm run dev
```

L'application est ensuite disponible sur http://localhost:3000. 🚀

## Licence

Projet distribué sous licence MIT. Voir le fichier LICENSE. 📄
