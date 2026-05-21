# Matrice Eni - Piattaforma C-Lab

Benvenuto nel progetto **Matrice Eni**, una piattaforma web interattiva e dinamica sviluppata per l'**Eni C-Lab**. 
L'obiettivo principale di questo strumento è fornire un sistema professionale di valutazione, confronto e monitoraggio per **Sensori Odorigeni** e **Stazioni Meteorologiche**.

## 🎯 Funzionalità Principali

- **Analisi MCDA (Multi-Criteria Decision Analysis)**: Valutazione dei dispositivi tramite matrici decisionali. Gli esperti possono variare i "pesi" dei criteri (es. Compliance, Performance, Costo) in tempo reale tramite slider, ricalcolando i punteggi dinamicamente.
- **Interfaccia Professionale**: Design in dark-mode desaturato ottimizzato per l'usabilità tecnica, in linea con i colori del brand Eni.
- **Monitoraggio Continuo**: Dashboard dedicata per il monitoraggio sul campo.
- **AI Consultant (ARIA)**: Assistente virtuale integrato per supportare l'interpretazione dei dati.

## 📁 Struttura del Progetto

Il progetto segue un'architettura modulare:
- I dati sorgente sono gestiti tramite fogli di calcolo (`Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx` e `analisi_comparativa_stazioni_meteo (1).ods`).
- Script Python (nella cartella `execution/` e `parse_meteo.py`) si occupano di estrarre i dati dai fogli di calcolo e convertirli per renderli leggibili dall'interfaccia (frontend).
- L'interfaccia utente è composta da 3 dashboard principali:
  - `index_mcda.html`: Dashboard dei Sensori Odorigeni.
  - `index_meteo.html`: Dashboard delle Stazioni Meteorologiche.
  - `index_monitoraggio.html`: Dashboard di monitoraggio generale.

## 🚀 Come usare il progetto (Guida per l'Utente)

### Prerequisiti
- Un browser web moderno (Chrome, Firefox, Edge, Safari).
- Python 3.x (necessario solo se si devono aggiornare i dati base modificando i file Excel/ODS).

### 1. Avvio e Utilizzo Base
Se i dati di partenza non richiedono aggiornamenti e vuoi solo esplorare la piattaforma, è sufficiente aprire le pagine HTML:
1. Fai doppio clic su `index_mcda.html`, `index_meteo.html` o `index_monitoraggio.html` per aprire la relativa dashboard direttamente nel tuo browser.
2. Interagisci con le tabelle: usa gli slider presenti nell'interfaccia per modificare i "pesi" dei criteri decisionali in tempo reale e osserva come la classifica si aggiorna automaticamente.

### 2. Aggiornamento dei Dati (Per Analisti/Sviluppatori)
Se vengono effettuate modifiche ai file sorgente (`.xlsx` o `.ods`), è necessario rigenerare i dati per il frontend:
1. Salva le modifiche al file `Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx` o `analisi_comparativa_stazioni_meteo (1).ods`.
2. Apri il terminale (Prompt dei comandi o PowerShell) nella cartella principale del progetto.
3. Esegui lo script Python per aggiornare i dati dei sensori odorigeni:
   ```bash
   python execution/update_excel_data.py
   ```
4. Esegui lo script Python per aggiornare i dati meteo:
   ```bash
   python parse_meteo.py
   ```
5. Ricarica la pagina HTML nel browser per visualizzare la piattaforma popolata con i nuovi dati.
