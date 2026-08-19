import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileExplorer } from '../components/Sidebar/FileExplorer';
import { FileItem } from '../types';

const rootItem: FileItem = {
  name: 'workspace',
  path: '/workspace',
  isDir: true,
  children: [
    {
      name: 'main.wv',
      path: '/workspace/main.wv',
      isDir: false,
      extension: 'wv',
    },
  ],
};

const renderExplorer = (onRenameEntry: (path: string, newName: string) => Promise<void>) =>
  render(
    <FileExplorer
      rootItem={rootItem}
      activeFilePath="/workspace/main.wv"
      onFileSelect={() => {}}
      onCreateFile={async () => {}}
      onCreateFolder={async () => {}}
      onDeleteEntry={async () => {}}
      onRenameEntry={onRenameEntry}
      onRefresh={async () => {}}
    />
  );

describe('File explorer operations', () => {
  it('submits a real file rename with the source path and new name', async () => {
    const onRenameEntry = vi.fn().mockResolvedValue(undefined);
    renderExplorer(onRenameEntry);

    fireEvent.click(screen.getByTitle('Rename File'));
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'app.wv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    await waitFor(() =>
      expect(onRenameEntry).toHaveBeenCalledWith('/workspace/main.wv', 'app.wv')
    );
  });

  it('keeps the rename dialog open and shows filesystem errors', async () => {
    renderExplorer(async () => {
      throw new Error('Path already exists: /workspace/app.wv');
    });

    fireEvent.click(screen.getByTitle('Rename File'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'app.wv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Path already exists');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
