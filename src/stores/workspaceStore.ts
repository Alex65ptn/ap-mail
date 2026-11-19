import { create } from 'zustand';
import { WorkspaceManifest, Folder, MessageItem } from '../types/mail';

interface WorkspaceState {
  workspaces: WorkspaceManifest[];
  activeWorkspaceId: string | null;
  folders: Folder[];
  activeFolderId: number | null;
  selectedMessage: MessageItem | null;
  searchQuery: string;
  
  setWorkspaces: (workspaces: WorkspaceManifest[]) => void;
  setActiveWorkspace: (id: string | null) => void;
  setFolders: (folders: Folder[]) => void;
  setActiveFolder: (id: number | null) => void;
  setSelectedMessage: (msg: MessageItem | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  folders: [],
  activeFolderId: null,
  selectedMessage: null,
  searchQuery: '',

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, activeFolderId: null, selectedMessage: null }),
  setFolders: (folders) => set({ folders }),
  setActiveFolder: (id) => set({ activeFolderId: id, selectedMessage: null }),
  setSelectedMessage: (selectedMessage) => set({ selectedMessage }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
