-- ============================================================================
-- SCHEMA AP MAIL: index.db con PRAGMA WAL & synchronous FULL
-- ============================================================================

CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    delimiter TEXT DEFAULT '/',
    attributes TEXT,
    uid_validity INTEGER,
    uid_next INTEGER,
    highest_mod_seq INTEGER,
    unread_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_remote_parent 
ON folders(remote_name, ifnull(parent_id, -1));

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    imap_uid INTEGER,
    message_id TEXT,
    in_reply_to TEXT,
    references_header TEXT,
    thread_id TEXT,
    subject TEXT,
    sender_name TEXT,
    sender_address TEXT NOT NULL,
    recipients_to TEXT,
    recipients_cc TEXT,
    recipients_bcc TEXT,
    reply_to TEXT,
    date_epoch INTEGER NOT NULL,
    date_iso TEXT NOT NULL,
    snippet TEXT,
    raw_eml_blob_hash TEXT NOT NULL,
    raw_size_bytes INTEGER NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT 0,
    is_draft BOOLEAN NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    has_attachments BOOLEAN NOT NULL DEFAULT 0,
    
    is_pec BOOLEAN NOT NULL DEFAULT 0,
    pec_type TEXT CHECK(pec_type IN (
        'NONE', 
        'POSTA_CERTIFICATA', 
        'ACCETTAZIONE', 
        'AVVENUTA_CONSEGNA', 
        'PREAVVISO_ERRORE_CONSEGNA', 
        'ERRORE_CONSEGNA', 
        'RILEVAZIONE_VIRUS'
    )) DEFAULT 'NONE',
    pec_identificativo TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_keyset_desc 
ON messages(folder_id, date_epoch DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_keyset_asc 
ON messages(folder_id, date_epoch ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(folder_id, is_read, date_epoch DESC);

CREATE INDEX IF NOT EXISTS idx_messages_message_id 
ON messages(message_id);

CREATE INDEX IF NOT EXISTS idx_messages_pec_identificativo 
ON messages(pec_identificativo) WHERE pec_identificativo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_imap_uid 
ON messages(folder_id, imap_uid) WHERE imap_uid IS NOT NULL;

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    blob_hash TEXT NOT NULL,
    filename TEXT NOT NULL,
    extension TEXT,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    content_id TEXT,
    is_inline BOOLEAN NOT NULL DEFAULT 0,
    is_p7m BOOLEAN NOT NULL DEFAULT 0,
    extracted_payload_blob_hash TEXT,
    extraction_status TEXT CHECK(extraction_status IN (
        'PENDING', 
        'INDEXED', 
        'FAILED', 
        'UNSUPPORTED'
    )) DEFAULT 'PENDING',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_blob_hash ON attachments(blob_hash);

CREATE TABLE IF NOT EXISTS pec_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificativo TEXT NOT NULL,
    receipt_message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    original_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    receipt_type TEXT NOT NULL,
    ricezione_timestamp TEXT,
    gestore_emittente TEXT,
    daticert_xml_raw TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_pec_receipts_identificativo ON pec_receipts(identificativo);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_messages USING fts5(
    subject,
    sender,
    recipients,
    body_content,
    content=messages,
    content_rowid=id,
    tokenize='unicode61 remove_diacritics 2'
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_attachments USING fts5(
    attachment_id UNINDEXED,
    filename,
    content_text,
    tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS trg_messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO fts_messages(rowid, subject, sender, recipients, body_content)
    VALUES (new.id, new.subject, new.sender_address || ' ' || ifnull(new.sender_name, ''), 
            ifnull(new.recipients_to, '') || ' ' || ifnull(new.recipients_cc, ''), 
            ifnull(new.snippet, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO fts_messages(fts_messages, rowid, subject, sender, recipients, body_content)
    VALUES('delete', old.id, old.subject, old.sender_address || ' ' || ifnull(old.sender_name, ''), 
           ifnull(old.recipients_to, '') || ' ' || ifnull(old.recipients_cc, ''), 
           ifnull(old.snippet, ''));
END;
