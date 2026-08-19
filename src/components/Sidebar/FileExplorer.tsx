import React, { useState } from 'react';
import {
  FilePlus,
  FolderPlus,
  RotateCw,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Pencil,
} from 'lucide-react';
import { FileItem } from '../../types';
import { FileIcon } from '../Common/FileIcon';
import { Modal } from '../Common/Modal';

interface FileExplorerProps {
  rootItem: FileItem | null;
  activeFilePath: string | null;
  onFileSelect: (path: string) => void;
  onCreateFile: (parentPath: string, fileName: string) => Promise<void>;
  onCreateFolder: (parentPath: string, folderName: string) => Promise<void>;
  onDeleteEntry: (path: string) => Promise<void>;
  onRenameEntry: (path: string, newName: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenWorkspaceDialog?: () => void;
  isLoading?: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootItem,
  activeFilePath,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteEntry,
  onRenameEntry,
  onRefresh,
  onOpenWorkspaceDialog,
  isLoading,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/workspace', '/workspace/src', '/workspace/examples'])
  );
  const [modalState, setModalState] = useState<{
    type: 'file' | 'folder' | 'rename' | 'delete' | null;
    targetParentPath: string;
    targetName?: string;
  }>({ type: null, targetParentPath: '/workspace' });
  const [inputName, setInputName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const closeModal = () => {
    setInputName('');
    setOperationError(null);
    setModalState({ type: null, targetParentPath: rootItem?.path || '/workspace' });
  };

  const showOperationError = (error: unknown) => {
    setOperationError(error instanceof Error ? error.message : String(error));
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    if (/[\\/]/.test(inputName.trim())) {
      setOperationError('Names cannot contain path separators.');
      return;
    }

    setIsSubmitting(true);
    setOperationError(null);
    try {
      if (modalState.type === 'file') {
        const fullPath = `${modalState.targetParentPath}/${inputName.trim()}`.replace(/\/+/g, '/');
        await onCreateFile(modalState.targetParentPath, inputName.trim());
        onFileSelect(fullPath);
      } else if (modalState.type === 'folder') {
        await onCreateFolder(modalState.targetParentPath, inputName.trim());
        setExpandedFolders((prev) => new Set([...prev, `${modalState.targetParentPath}/${inputName.trim()}`]));
      } else if (modalState.type === 'rename') {
        await onRenameEntry(modalState.targetParentPath, inputName.trim());
      }
      closeModal();
    } catch (error) {
      showOperationError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!modalState.targetParentPath) return;
    setIsSubmitting(true);
    setOperationError(null);
    try {
      await onDeleteEntry(modalState.targetParentPath);
      closeModal();
    } catch (error) {
      showOperationError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTreeItem = (item: FileItem, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isActive = activeFilePath === item.path;
    const isWeave = item.name.endsWith('.wv') || item.name.endsWith('.weave');

    if (item.isDir) {
      return (
        <div key={item.path} className="select-none">
          <div
            className="group flex items-center justify-between py-1 px-2 hover:bg-editor-hover/70 rounded cursor-pointer text-xs text-editor-text transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(item.path)}
          >
            <div className="flex items-center space-x-1.5 overflow-hidden">
              <span className="text-editor-muted group-hover:text-editor-text">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
              <FileIcon isDir isOpen={isExpanded} className="w-4 h-4" />
              <span className="truncate font-medium">{item.name}</span>
            </div>

            {/* Folder hover actions */}
            <div
              className="hidden group-hover:flex items-center space-x-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setInputName('');
                  setModalState({ type: 'file', targetParentPath: item.path });
                }}
                className="p-0.5 text-editor-muted hover:text-amber-400 rounded"
                title="New File Here"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setInputName('');
                  setModalState({ type: 'folder', targetParentPath: item.path });
                }}
                className="p-0.5 text-editor-muted hover:text-amber-400 rounded"
                title="New Folder Here"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              {item.path !== '/workspace' && (
                <>
                  <button
                    onClick={() => {
                      setInputName(item.name);
                      setOperationError(null);
                      setModalState({
                        type: 'rename',
                        targetParentPath: item.path,
                        targetName: item.name,
                      });
                    }}
                    className="p-0.5 text-editor-muted hover:text-amber-400 rounded"
                    title="Rename Folder"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setOperationError(null);
                      setModalState({
                        type: 'delete',
                        targetParentPath: item.path,
                        targetName: item.name,
                      });
                    }}
                    className="p-0.5 text-editor-muted hover:text-red-400 rounded"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {isExpanded && item.children && (
            <div>
              {item.children.map((child) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs transition-colors select-none ${
          isActive
            ? 'bg-amber-500/20 text-amber-300 font-medium'
            : 'text-editor-text hover:bg-editor-hover/70'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
        onClick={() => onFileSelect(item.path)}
      >
        <div className="flex items-center space-x-2 overflow-hidden flex-1">
          <FileIcon name={item.name} extension={item.extension} className="w-4 h-4" />
          <span className="truncate">{item.name}</span>
          {isWeave && (
            <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-400 rounded font-mono font-semibold">
              wv
            </span>
          )}
        </div>

        <div
          className="hidden group-hover:flex items-center space-x-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setInputName(item.name);
              setOperationError(null);
              setModalState({
                type: 'rename',
                targetParentPath: item.path,
                targetName: item.name,
              });
            }}
            className="p-0.5 text-editor-muted hover:text-amber-400 rounded"
            title="Rename File"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setOperationError(null);
              setModalState({
                type: 'delete',
                targetParentPath: item.path,
                targetName: item.name,
              })
            }}
            className="p-0.5 text-editor-muted hover:text-red-400 rounded"
            title="Delete File"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none text-editor-text">
      {/* Explorer Section Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border bg-editor-panel/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-editor-muted">
          Explorer
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setInputName('');
              setOperationError(null);
              setModalState({ type: 'file', targetParentPath: rootItem?.path || '/workspace' });
            }}
            className="p-1 text-editor-muted hover:text-amber-400 hover:bg-editor-hover rounded transition-colors"
            title="New File (Root)"
            disabled={!rootItem}
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setInputName('');
              setOperationError(null);
              setModalState({ type: 'folder', targetParentPath: rootItem?.path || '/workspace' });
            }}
            className="p-1 text-editor-muted hover:text-amber-400 hover:bg-editor-hover rounded transition-colors"
            title="New Folder (Root)"
            disabled={!rootItem}
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className={`p-1 text-editor-muted hover:text-editor-text hover:bg-editor-hover rounded transition-colors ${
              isLoading ? 'animate-spin text-amber-400' : ''
            }`}
            title="Refresh Explorer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Root Workspace Folder Label */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-editor-muted bg-editor-panel/20 border-b border-editor-border/40">
        <div className="flex items-center space-x-1.5 truncate">
          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate uppercase tracking-wider text-[11px] font-bold text-editor-text">
            {rootItem?.name || 'Workspace'}
          </span>
        </div>
        {onOpenWorkspaceDialog && (
          <button
            onClick={onOpenWorkspaceDialog}
            className="text-[10px] text-amber-400 hover:underline shrink-0"
          >
            Open Folder
          </button>
        )}
      </div>

      {/* File Tree Items */}
      <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5 custom-scrollbar">
        {rootItem ? (
          rootItem.children && rootItem.children.length > 0 ? (
            rootItem.children.map((child) => renderTreeItem(child, 0))
          ) : (
            <div className="text-center py-6 text-xs text-editor-muted">
              Directory is empty. Create a `.wv` file to begin.
            </div>
          )
        ) : (
          <div className="text-center py-6 px-4 text-xs text-editor-muted">
            {isLoading ? 'Loading workspace…' : 'No folder is open. Choose Open Folder to begin.'}
          </div>
        )}
      </div>

      {/* New File / Folder / Rename Modal */}
      <Modal
        isOpen={modalState.type === 'file' || modalState.type === 'folder' || modalState.type === 'rename'}
        title={
          modalState.type === 'file'
            ? 'Create New File'
            : modalState.type === 'folder'
              ? 'Create New Folder'
              : 'Rename Entry'
        }
        onClose={closeModal}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-editor-muted mb-1">
              {modalState.type === 'file'
                ? 'File Name (e.g. pipeline.wv)'
                : modalState.type === 'folder'
                  ? 'Folder Name'
                  : 'New Name'}
            </label>
            <input
              type="text"
              autoFocus
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={modalState.type === 'file' ? 'module.wv' : 'utils'}
              className="w-full px-3 py-2 text-sm bg-editor-bg border border-editor-border rounded focus:border-amber-500 focus:outline-none text-editor-text"
            />
            <p className="text-[11px] text-editor-muted mt-1">
              {modalState.type === 'rename' ? 'Current path' : 'Target directory'}:{' '}
              <span className="font-mono text-amber-400">{modalState.targetParentPath}</span>
            </p>
            {operationError && (
              <p role="alert" className="text-[11px] text-red-400 mt-2 break-words">
                {operationError}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-3 py-1.5 text-xs text-editor-muted hover:text-editor-text rounded border border-editor-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !inputName.trim()}
              className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded shadow transition-colors"
            >
              {isSubmitting
                ? modalState.type === 'rename' ? 'Renaming...' : 'Creating...'
                : modalState.type === 'rename' ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalState.type === 'delete'}
        title="Confirm Deletion"
        onClose={closeModal}
      >
        <div className="space-y-4">
          <p className="text-sm text-editor-text">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-red-400 font-mono">
              {modalState.targetName || modalState.targetParentPath}
            </span>
            ?
          </p>
          <p className="text-xs text-editor-muted">
            This action cannot be undone.
          </p>
          {operationError && (
            <p role="alert" className="text-xs text-red-400 break-words">
              {operationError}
            </p>
          )}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-3 py-1.5 text-xs text-editor-muted hover:text-editor-text rounded border border-editor-border"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded shadow transition-colors"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
