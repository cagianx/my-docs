---
sidebar_position: 1
---

# Regole sul Dominio

## Decisioni long-term

Le decisioni sul dominio hanno un impatto a lungo termine su tutto il sistema. Il margine di errore deve essere minimo, preferibilmente nullo.

Prima di introdurre o modificare qualsiasi concetto del dominio è necessaria un'analisi approfondita: un errore in questa fase si propaga in ogni strato del software e diventa costoso da correggere nel tempo.

## Ubiquitous Language

Se una cosa ha un nome nel dominio, quel nome deve essere usato ovunque nel codice: variabili, funzioni, classi, tabelle, API. Non si inventano sinonimi, non si abbrevia per comodità, non si traduce.

Il linguaggio del dominio è l'unico linguaggio del codice.

## Correttezza dei dati

I dati nel dominio si danno per scontati come corretti. Scrivere codice difensivo che mette in dubbio la loro integrità è un segnale che il modello non è adeguato.

Il dominio va modellato in modo che sia difficile — preferibilmente impossibile — inserire dati inconsistenti. A tal fine si privilegiano le funzionalità native del database: **chiavi esterne** e **constraint**. L'integrità si garantisce a livello strutturale, non applicativo.

## Stabilità dei nomi e dei significati

Nel dominio non si rinomina e non si cambia il significato a nulla.

Quando un concetto diventa obsoleto o viene sostituito, si preferisce marcarlo come **deprecato** piuttosto che modificarlo o rimuoverlo. Questo preserva la leggibilità della storia del sistema e la compatibilità con tutto ciò che già lo usa.
