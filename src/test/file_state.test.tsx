import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { fsService, inMemoryFs } from '../services/fsService';

describe('open editor file state', () => {
  beforeEach(() => {
    inMemoryFs.reset();
    localStorage.removeItem('weave_workspace_path');
    localStorage.removeItem('weave_workspace_recent_files');
    localStorage.removeItem('weave_workspace_settings');
  });

  it('reloads clean tabs from disk but never overwrites a dirty editor buffer', async () => {
    render(<App />);
    const textarea = await screen.findByTestId('monaco-textarea');
    const mainFileRow = screen
      .getAllByText('main.wv')
      .map((element) => element.closest('div.group'))
      .find(Boolean);
    expect(mainFileRow).not.toBeNull();

    await inMemoryFs.writeFile('/workspace/src/main.wv', 'component ExternallyChanged {}');
    fireEvent.click(mainFileRow!);
    await waitFor(() => expect(textarea).toHaveValue('component ExternallyChanged {}'));

    fireEvent.change(textarea, { target: { value: 'component LocalUnsaved {}' } });
    await inMemoryFs.writeFile('/workspace/src/main.wv', 'component NewerDiskVersion {}');
    fireEvent.click(mainFileRow!);
    await waitFor(() => expect(textarea).toHaveValue('component LocalUnsaved {}'));
  });

  it('shows save failures inside the IDE and keeps the file dirty', async () => {
    render(<App />);
    const textarea = await screen.findByTestId('monaco-textarea');
    fireEvent.change(textarea, { target: { value: 'component Unsaved {}' } });
    const writeSpy = vi
      .spyOn(fsService, 'writeFile')
      .mockRejectedValueOnce(new Error('disk is read-only'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    fireEvent.click(screen.getByTitle('Save File (Ctrl+S)'));

    expect(await screen.findByRole('alert')).toHaveTextContent('disk is read-only');
    expect(screen.getAllByTitle('Unsaved changes').length).toBeGreaterThan(0);
    writeSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
