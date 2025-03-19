# Extraction de codes PIN à partir de traces d'utilisation  

## Introduction  

Avec l’essor des technologies mobiles, les smartphones stockent une quantité croissante d’informations sensibles, protégées par des mécanismes d’authentification comme les codes PIN et la biométrie (reconnaissance faciale, empreintes digitales, etc.). Cependant, le code PIN reste un élément central, requis après plusieurs échecs ou une période d’inactivité.  

Dans un cadre d’analyse numérique, l’accès aux appareils verrouillés représente un défi majeur. Les solutions actuelles permettant de contourner ces protections sont souvent limitées à certains modèles et nécessitent des ressources considérables en temps et en puissance de calcul.  

Ce projet vise à explorer une approche alternative basée sur l’extraction et l’analyse des traces laissées sur l’écran. L’objectif est de concevoir un algorithme capable de :  
- Identifier les traces pertinentes liées à l’authentification,  
- Détecter les superpositions indiquant des répétitions de saisie,  
- Déterminer les codes PIN les plus probables.


## Installation  

Les instructions d’installation sont disponibles dans **[INSTALL.md](INSTALL.md)**.

## Fonctionnalités

- Évaluation des séquences les plus "probables" : Classement des codes PIN potentiels en fonction des métriques sélectionnées.
- Modification de la longueur du code PIN attendu.
- Possibilités de donner des indices pour le code PIN : Intégration de pistes ou restrictions pouvant orienter l'analyse.
- Correction des traces inférées si le nombre de traces est incorrecte :
  - mode manuel : ajout, suppression et répétition de chiffres pour atteindre la longueur attendue ;
  - mode automatique : identification des codes PIN les plus "probables" dans l'espace étendu ou restreint formé par les nombres inférés.

NB : Les métriques permettant de définir des statistiques sur les codes PINs les plus probables en s'appuyant sur de
grands jeux de données, notamment ceux issus de la fuite de mots de passe RockYou (Bonneau et al., 2012 ; Wang et al., 2017)
ainsi que sur les codes PIN collectés anonymement via l'application iOS Big Brother Camera Security développée par Daniel Amitay (2011).
Ces datasets concernent uniquement les codes PINs à 4 et 6 chiffres.

![Exemple](docs/inference.png)
*Exemple d'inférence (code attendu 180734)*

Des détails supplémentaires sur le fonctionnement et l'utilisation de l'outil sont disponibles dans [MANUAL.md](MANUAL.md)

## Citation

```latex
@article{markert-21-unlock-pins,
    author = {Markert, Philipp and Bailey, Daniel V. and Golla, Maximilian and D\"{u}rmuth, Markus and Aviv, Adam J.},
    title = {{On the Security of Smartphone Unlock PINs}},
    journal = {ACM Transactions on Privacy and Security},
    year = {2021},
    volume = {24},
    number = {4},
    pages = {30:1--30:36},
    month = nov,
    publisher = {ACM}
}
```