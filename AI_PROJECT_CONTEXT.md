# Contesto del Progetto "Matrice Eni" per AI

Questo file è destinato a un'altra AI per fornire una panoramica chiara e concisa di cosa sia questo progetto, della sua architettura, dei file che lo compongono e di come interagiscono tra loro.

## 1. Cosa è questo progetto
Questo progetto è una piattaforma web interattiva e dinamica creata per Eni C-Lab. L'obiettivo principale è fornire un sistema professionale di valutazione, confronto e monitoraggio per **Sensori Odorigeni** e **Stazioni Meteorologiche**.
La valutazione avviene tramite matrici **MCDA (Multi-Criteria Decision Analysis)**, che permettono agli esperti di variare i "pesi" dei criteri di valutazione (es. Compliance, Performance, Costo) in tempo reale tramite slider, ricalcolando i punteggi dinamicamente.
Il design dell'interfaccia è un dark-mode desaturato e professionale, ottimizzato per l'usabilità tecnica, e include un "AI Consultant" (chiamato ARIA) per l'interpretazione dei dati.

## 2. Architettura del Progetto
Il progetto segue una rigorosa architettura a 3 livelli concepita specificamente per agenti AI, documentata nel file `setup.md`:
1. **Livello 1: Direttive (`directives/`)**: File Markdown che contengono le procedure standard (SOP) per l'AI. Spiegano all'AI "Cosa fare".
2. **Livello 2: Orchestrazione**: Sei tu (l'AI). Il tuo compito è leggere le direttive, prendere decisioni, instradare i task e utilizzare gli strumenti a disposizione.
3. **Livello 3: Esecuzione (`execution/`)**: Script deterministici (solitamente Python) che svolgono il "lavoro sporco" e ripetitivo (es. conversione di file, parsing dei dati).

## 3. Cosa sono i file, come funzionano e cosa contengono

### A. I File Dati Sorgente (I contenuti)
- `Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx`: È il cuore dei dati sui sensori. Contiene i parametri tecnici, i punteggi base, le certificazioni ATEX, le configurazioni per sistemi ibridi e i pesi MCDA.
- `analisi_comparativa_stazioni_meteo (1).ods`: Contiene il dataset comparativo relativo alle diverse stazioni meteorologiche.
- `excel_structure.json`: Un file di riferimento che contiene un dump della struttura dei dati Excel per consultazione veloce.

### B. Livello Esecuzione (Script Backend)
Questi script estraggono i dati dai fogli di calcolo e li rendono leggibili dal frontend.
- `execution/update_excel_data.py`: Script Python che legge il file Excel `Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx`, converte i dati in un formato JSON strutturato, li salva in un dump temporaneo e genera il file Javascript `js/excel_data.js` assegnando i dati alla variabile globale `window.EXCEL_DATA`.
- `parse_meteo.py`: Script Python simile, progettato per leggere il file ODS delle stazioni meteo e farne un dump JSON temporaneo in `.tmp/`.

### C. Livello Frontend: HTML (Le Pagine)
L'applicativo si divide in tre dashboard principali:
- `index_mcda.html`: Interfaccia dedicata alla matrice dei Sensori Odorigeni.
- `index_meteo.html`: Interfaccia dedicata alla valutazione delle Stazioni Meteorologiche.
- `index_monitoraggio.html`: Dashboard generale per il monitoraggio continuo sul campo.

### D. Livello Frontend: CSS (`css/`)
Il sistema di design (Eni dark-mode):
- `palette.css`: Variabili CSS centralizzate per i colori del brand.
- `main.css` & `dashboard.css`: Regole di stile principali, layout e componenti grafici delle dashboard.
- `animations.css`: Animazioni e transizioni per rendere l'interfaccia "viva" e reattiva.

### E. Livello Frontend: Javascript (`js/`)
La logica dell'applicativo:
- **Dati Inclusi**: `excel_data.js`, `meteo_data.js` (generati dagli script Python e letti dal frontend).
- **Core delle Pagine**: `app_mcda.js`, `app_meteo.js`, `app_monitoraggio.js` (inizializzazione e gestione eventi delle rispettive dashboard).
- **Motore Logico**: `mcda-engine.js` (contiene la logica matematica MCDA per ricalcolare la classifica in base ai pesi scelti dall'utente).
- **Moduli UI**: `charts.js` (gestione grafici), `heatmap.js` (visualizzazioni spaziali).
- **Funzionalità Extra**: `ai-consultant.js` (logica per il componente ARIA), `report-generator.js` (funzioni per esportare i dati e generare report), `citizen-check.js`.

### F. Altre directory
- `.tmp/`: Cartella ignorata da Git che ospita file intermedi, log o dump di JSON generati dagli script.

## 4. Come funziona il flusso di lavoro
1. I dati vengono aggiornati dagli operatori all'interno dei file Excel o ODS.
2. Si esegue lo script Python appropriato (es. `python execution/update_excel_data.py`).
3. Lo script estrae i dati e genera o aggiorna i file Javascript (es. `js/excel_data.js`).
4. Quando l'utente apre le pagine HTML, il browser carica questi file JS aggiornati, popolando l'interfaccia.
5. All'interno della dashboard, l'utente può muovere gli slider per modificare i pesi. Il file `mcda-engine.js` intercetta questi cambiamenti e ricalcola all'istante l'intera matrice e classifica MCDA, riordinando le tabelle visive.
