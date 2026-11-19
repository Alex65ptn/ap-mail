export type WorkspaceType = 'IMAP_ATTIVO' | 'ARCHIVIO_LOCALE';

export interface WorkspaceManifest {
  workspace_id: string;
  name: string;
  workspace_type: WorkspaceType;
  email_address?: string;
  created_at_epoch: number;
  is_pec: boolean;
  auto_delete_on_server: boolean;
  imap_server?: string;
  imap_port?: number;
  smtp_server?: string;
  smtp_port?: number;
  smtp_username?: string;
}

export interface Folder {
  id: number;
  name: string;
  display_name: string;
  parent_id: number | null;
  unread_count: number;
  total_count: number;
}

export type PecType = 
  | 'NONE'
  | 'POSTA_CERTIFICATA'
  | 'ACCETTAZIONE'
  | 'AVVENUTA_CONSEGNA'
  | 'PREAVVISO_ERRORE_CONSEGNA'
  | 'ERRORE_CONSEGNA'
  | 'RILEVAZIONE_VIRUS';

export interface MessageItem {
  id: number;
  folder_id: number;
  message_id: string;
  subject: string;
  sender_name?: string;
  from_addr: string;
  date_utc: string;
  snippet?: string;
  has_attachments: boolean;
  is_read: boolean;
  is_flagged: boolean;
  is_pec: boolean;
  pec_type: PecType;
  pec_identificativo?: string;
}

export interface AttachmentItem {
  id: number;
  message_id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  blob_sha256: string;
  is_p7m: boolean;
  extracted_payload_blob_hash?: string;
}

export interface ImportProgressEvent {
  total_processed: number;
  imported_count: number;
  duplicates_skipped: number;
  current_folder: string;
  bytes_processed: number;
  is_completed: boolean;
}
