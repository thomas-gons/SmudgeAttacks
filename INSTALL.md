# Installation

Ce projet est composé d’un **backend Django** et d’un **frontend React**. Suivez les étapes ci-dessous pour installer et exécuter correctement chaque partie.

---

## Prérequis

Avant de commencer, assurez-vous d’avoir installé :
- **Python 3.12**  
- **Node.js ≥ 11.2.0**  
- **npm** (fourni avec Node.js)  

---

## Poids des modèles

Avant de procéder à l'installation assurer-vous d'avoir téléchargé les poids des modèles et de les avoir mis dans le répertoire ``backend/resources/models``.
La configuration de ces derniers ainsi que de leur chemin d'accès peuvent être consultés dans ``backend/config.yaml``
## Installation du Backend (Django)

```bash
cd backend
```

### 1. Installation des paquets

```bash
python -m venv .venv
source .venv/bin/activate # venv\Scripts\activate sous Windows
pip install -r requiremnts.txt
```

**Remarque**: l'installation des paquets peut être grandement accélérée avec le gestionnaire de paquets [uv](https://docs.astral.sh/uv/)

```bash
uv venv --python 3.12
source .venv/bin/activate # venv\Scripts\activate sous Windows
uv pip install -r requiremnts.txt
```

### 2. Lancement du serveur 

```bash
python manage.py runserver
```

---

## Installation du Frontend (React)  

```bash
cd frontend
npm install # installer les dépendances
npm run dev # démarrer le serveur vite
```

