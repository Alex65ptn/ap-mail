# AP Mail — Client Email & PEC Forense
### Manuale Operativo, Istruzioni d'Uso & Note Legali di Conformità

**Prodotto di:** AP Consulting  
**Autore e Titolare dei Diritti:** Alessandro Patanè  
**Versione:** 1.0.0 (Piattaforma Nativa macOS Apple Silicon / Intel)  
**Data di Rilascio:** 2026  

---

## 1. Panoramica del Software & Architettura di Sicurezza

**AP Mail** è un'applicazione desktop professionale per macOS ideata e progettata da **Alessandro Patanè** per **AP Consulting**, rivolta a professionisti, studi legali, commercialisti e consulenti aziendali che necessitano della semplicità operativa di Microsoft Outlook unita al massimo rigore probatorio richiesto per le prove forensi e i depositi telematici giudiziari.

### Principi Architetturali Fondamentali:
1. **Elaborazione e Custodia 100% Locale**: A differenza dei client web o delle suite cloud, in AP Mail nessun messaggio, allegato, credenziale o metadato viene memorizzato su server remoti di terze parti o inviato a sistemi di telemetria. L'intero database relazionale (SQLite in modalità ad alte prestazioni `PRAGMA WAL`) e l'archivio immutabile dei messaggi risiedono esclusivamente sulla macchina dell'utente con permessi di accesso ristretti (`0600`).
2. **Content Addressable Storage (CAS)**: Ogni file `.eml` grezzo (MIME puro) viene archiviato con indirizzamento univoco basato sull'impronta crittografica **SHA-256**, impedendo qualsiasi manomissione o alterazione successiva dei byte del messaggio.
3. **Motore di Ricerca FTS5**: Indicizzazione Full-Text Search in millisecondi di mittente, destinatari, oggetto e testo del corpo, per reperire istantaneamente email storiche tra decine di migliaia di messaggi archiviati.

---

## 2. Istruzioni Operative d'Uso

### 2.1 Configurazione delle Caselle (PEC e Posta Ordinaria)
- Per collegare una nuova casella, cliccare sull'icona **`+ Profilo` (UserPlus)** nella barra laterale sinistra.
- **Riconoscimento Automatico**: Inserendo l'indirizzo email e la password, AP Mail rileva automaticamente i parametri IMAP/POP3, le porte (993 / 995 con SSL/TLS) e i server dei principali gestori (Aruba PEC, Legalmail, Namirial, Postecert, Register, Microsoft 365, Google Workspace, ecc.).
- **Credenziali Sicure**: Le password vengono cifrate nel vault locale di AP Mail senza generare fastidiosi pop-up o finestre di richiesta del portachiavi di sistema di macOS.

### 2.2 Navigazione Rapida da Tastiera (Senza Mouse)
Per gestire agevolmente centinaia di email in arrivo quotidiane, AP Mail dispone di scorciatoie da tastiera native con scorrimento automatico continuo:
- ⬇️ **Freccia Giù (`↓` oppure `j`)**: Passa alla mail successiva, la evidenzia, la fa scorrere visivamente in vista (`auto-scroll`), la segna all'istante come **letta** (il pallino blu scompare) e ne visualizza il contenuto nel riquadro di destra.
- ⬆️ **Freccia Su (`↑` oppure `k`)**: Torna alla mail precedente con marcatura automatica e scroll.
- ↵ **Invio (`Enter`)**: Apre la mail selezionata nella **finestra nativa dedicata** (visualizzatore indipendente a tutto schermo).
- **Doppio Clic**: Apre la mail fuori dal client nella finestra nativa.
- **Pallino Blu**: Cliccabile manualmente in ogni riga per invertire all'istante lo stato tra *Letto* e *Non Letto*.

### 2.3 Ordinamento Istantaneo e Filtri a Pillola
Sopra la lista dei messaggi sono presenti selettori rapidi con conteggi in tempo reale:
- **Tutte**: Mostra il volume complessivo della cartella o dell'archivio.
- **Non lette**: Isola in un clic solo i messaggi da leggere, con badge numerico aggiornato in tempo reale.
- **PEC**: Filtra esclusivamente le comunicazioni di Posta Elettronica Certificata.
- **Allegati**: Mostra solo le email contenenti documenti o file firmati digitalmente.
- **Ordinamento A-Z (Provenienza)**: Mette in ordine alfabetico istantaneo tutti i mittenti.
- **Ordinamento Data**: Dal più recente al più vecchio (e viceversa).
- **Ordinamento Dimensione**: Evidenzia subito le email e le PEC più pesanti (con etichetta esatta KB o MB su ogni riga).

### 2.4 Finestra Nativa Dedicata Stile macOS
Aprendo un messaggio con doppio clic o con il tasto *Apri*, si avvia la finestra nativa di AP Mail, dotata di:
- Barra superiore con i controlli rapidi: *Archivia*, *Cestino*, *Rispondi*, *Rispondi a tutti*, *Inoltra*, *Stampa / PDF*, *Bandierina* e *Sposta*.
- Sottobarra di contesto con indicazione della cartella e dell'account.
- Header formale con mittente in evidenza, oggetto e destinatario.
- Visualizzatore degli allegati con supporto integrato ai file firmati digitalmente **CAdES (`.p7m`)**.

### 2.5 Integrazione Calendario & Scadenzario Forense
- Cliccando su **`Aggiungi a Scadenze`** all'interno di una email o di una PEC, i dati del messaggio vengono pre-compilati in un evento dello scadenzario.
- Dalla barra laterale sinistra è possibile commutare con un clic dalla **Posta** al **Calendario Forense**, visualizzando udienze, scadenze di memorie difensive e riunioni con codice colore.

---

## 3. Depositi Giudiziari Telematici (PCT / PAT / PTT) & Normativa CAD

Uno dei punti di forza esclusivi di AP Mail è la funzione **"Salva .EML per Deposito"** (pulsante oro con bilancia della giustizia).

### 3.1 Estrazione Conforme e Impronta SHA-256
La funzione estrae direttamente dal CAS il file MIME originale (`.eml`) intatto, senza alcuna riscrittura degli header, calcola l'impronta crittografica **SHA-256** (digest a 64 caratteri esadecimali) e genera la formula di conformità pronta per essere allegata alla nota di deposito o inserita nell'atto principale.

### 3.2 Quadro Normativo di Riferimento
- **Art. 19-ter D.Lgs. 7 marzo 2005, n. 82 (Codice dell'Amministrazione Digitale - CAD)**:  
  *«Le copie informatiche di documenti informatici [...] hanno la stessa efficacia probatoria dell'originale da cui sono tratte se la loro conformità all'originale è attestata da un pubblico ufficiale ovvero da un difensore nei casi previsti dalla legge [...] mediante apposita dichiarazione recante l'impronta del documento informatico.»*
- **Art. 16-bis, comma 9-bis e Art. 16-undecies del D.L. 18 ottobre 2012, n. 179 (convertito con L. 221/2012)**:  
  Potere di autentica del difensore sugli atti e sui provvedimenti estratti dal fascicolo informatico e sui messaggi di posta elettronica certificata ricevuti o inviati.
- **Decreto del Presidente della Repubblica 11 febbraio 2005, n. 68**:  
  Regolamento recante disposizioni per l'utilizzo della Posta Elettronica Certificata (PEC). AP Mail conserva inalterate le ricevute di accettazione e di avvenuta consegna complete del file `daticert.xml`.
- **D.M. 21 febbraio 2011, n. 44**:  
  Regole tecniche per l'adozione nel processo civile e nel processo penale delle tecnologie dell'informazione e della comunicazione (Processo Civile Telematico - PCT).

### 3.3 Formula di Attestazione di Conformità (Pre-Compilata da AP Mail)
```text
ATTESTAZIONE DI CONFORMITÀ EX ART. 19-TER D.LGS. 82/2005 E ART. 16-UNDECIES D.L. 179/2012

Il sottoscritto Avv./Professionista attesta, ai sensi e per gli effetti degli artt. 16-bis, 
comma 9-bis e 16-undecies del D.L. 179/2012, nonché dell'art. 19-ter del D.Lgs. 82/2005 (CAD), 
che il messaggio di posta elettronica certificata (PEC) sopra identificato, comprensivo di tutti 
i relativi file allegati e delle ricevute telematiche AgID di accettazione e consegna, estratto 
tramite l'applicazione AP Mail, è copia informatica pienamente conforme al documento informatico 
originale custodito nell'archivio digitale.

Nome del file: [NOME_FILE].eml
Algoritmo di Hashing: SHA-256
Impronta Crittografica (Digest): [IMPRONTA_SHA256_GENERATA_DA_AP_MAIL]
Data di estrazione e calcolo: [DATA_E_ORA_CORRENTE]

Firma Digitale del Difensore
```

---

## 4. Note Legali, Riservatezza & Proprietà Intellettuale

### 4.1 Paternità dell'Opera & Titolarità dei Diritti
- Il software **AP Mail** (inclusi codice sorgente, algoritmi di verifica, architettura del vault crittografico, interfacce utente grafiche, icone e documentazione correlata) è un prodotto proprietario di **AP Consulting**.
- La paternità intellettuale, l'ideazione e la direzione tecnica sono dell'autore **Alessandro Patanè**.
- Il software è protetto dalle norme in materia di diritto d'autore (Legge 22 aprile 1941, n. 633 e successive modificazioni, e Direttiva 2009/24/CE del Parlamento europeo e del Consiglio).
- È vietata qualsiasi attività di reverse engineering non autorizzata, decompilazione, riproduzione, noleggio o distribuzione a terzi del software o di parti di esso senza l'espresso consenso scritto di AP Consulting e di Alessandro Patanè.

### 4.2 Rispetto del GDPR & Tutela del Segreto Professionale
- In piena osservanza del **Regolamento Generale sulla Protezione dei Dati (UE) 2016/679 (GDPR)** e del **D.Lgs. 196/2003 (Codice Privacy)**:
  - AP Mail rispetta rigorosamente i principi di *Privacy by Design* e *Privacy by Default*.
  - I dati restano sotto l'esclusivo e assoluto controllo dell'utente finale sul dispositivo locale.
  - Nessun server di AP Consulting o di terze parti ha accesso ai contenuti delle email, alle credenziali degli account o ai file allegati.
  - È garantita la piena conformità all'obbligo di custodia e riservatezza del segreto professionale forense (art. 200 c.p.p. e Codice Deontologico Forense).

### 4.3 Limitazione di Responsabilità (Disclaimer)
Il software AP Mail viene concesso quale strumento informatico di supporto alla gestione della corrispondenza e all'estrazione documentale. Resta a carico esclusivo dell'utente e del professionista delegato la verifica finale del rispetto dei termini di decadenza, della tempestività e regolarità dei depositi telematici giudiziari o amministrativi e della corretta indicazione dei codici fiscali o dei dati processuali nei rispettivi fascicoli telematici.

---
© 2026 **AP Consulting** — Autore: **Alessandro Patanè**. Tutti i diritti riservati.
