# Direttiva: Aggiornamento Dati Excel (MCDA)

**Obiettivo:** Trasformare il file Excel "Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx" in formato JSON/JS leggibile dalla Web App frontend, assicurando che le modifiche dell'utente vengano riflesse nell'interfaccia.

**Quando eseguirla:**
- Ogni volta che l'utente modifica o sostituisce il file Excel `Matrice_MCDA_Sensori_Odorigeni_Eni_CLab_V2.xlsx`.
- Quando l'utente chiede esplicitamente di "aggiornare la matrice con i nuovi dati".

**Script da utilizzare (Livello 3):**
`execution/update_excel_data.py`

**Prerequisiti:**
- Il file Excel deve trovarsi nella root del progetto.
- Python deve essere installato con i moduli `pandas` e `openpyxl`.

**Flusso operativo:**
1. Conferma all'utente che stai per elaborare l'aggiornamento Excel.
2. Esegui il comando: `python execution/update_excel_data.py`
3. Lo script genererà:
   - Un dump intermedio: `.tmp/excel_dump.json`
   - Il file finale utilizzato dall'app: `js/excel_data.js`
4. Leggi l'output dello script.
5. Invia un Rapporto di Stato in chat indicando che l'app è stata aggiornata con successo.

**Gestione Errori:**
- Se pandas/openpyxl mancano: Esegui `pip install pandas openpyxl` e riprova.
- Se il file Excel non viene trovato: Chiedi all'utente di caricare o verificare il nome del file.
- Se lo script rileva errori di codifica/formattazione: Analizza `.tmp/excel_dump.json` per trovare la riga/colonna problematica e aggiorna questa direttiva se necessario.
