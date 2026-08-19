import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from '../App';
import { QuickSwitcher } from '../components/QuickSwitcher';
import { InlinePromptBar } from '../components/Editor/InlinePromptBar';
import { InlineDiffReview } from '../components/Editor/InlineDiffReview';
import { AIPatch } from '../services/aiService';

describe('Anti-Gravity 2.0 & Cursor-Inspired AI-First Studio Overhaul', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Cursor-style workbench layout', () => {
    it('renders the explorer, center editor, and right agent dock with preview closed by default', async () => {
      render(<App />);

      expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('agent-dock')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Weave Agent').length).toBeGreaterThan(0);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor-container')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('live-preview-container')).not.toBeInTheDocument();
    });

    it('toggles Collapsible Terminal Overlay with Cmd+~ or close button', async () => {
      render(<App />);

      // Initially terminal panel overlay is closed by default in the new 3-zone layout
      expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument();

      // Trigger Cmd+` / Cmd+~ keyboard event
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', metaKey: true }));
      });

      // Verify terminal overlay appears
      await waitFor(() => {
        expect(screen.getByTestId('terminal-panel')).toBeInTheDocument();
      });
      expect(screen.getByText('Interactive Terminal')).toBeInTheDocument();

      // Close terminal overlay via header close button
      const closeBtn = screen.getByTitle(/Close Terminal Overlay/i);
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('2. Floating Quick Switcher (Cmd/Ctrl + P)', () => {
    it('opens Quick Switcher modal on Cmd+P and filters workspace files', async () => {
      const handleSelectFile = vi.fn();
      const handleClose = vi.fn();

      render(
        <QuickSwitcher
          isOpen={true}
          onClose={handleClose}
          onSelectFile={handleSelectFile}
          activeFilePath="/workspace/src/main.wv"
        />
      );

      // Verify modal is visible
      expect(screen.getByTestId('quick-switcher-modal')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Quick open file by name or path/i)).toBeInTheDocument();

      // Wait for files to be indexed
      await waitFor(() => {
        expect(screen.getByText('main.wv')).toBeInTheDocument();
      });

      // Search query
      const input = screen.getByPlaceholderText(/Quick open file by name or path/i);
      fireEvent.change(input, { target: { value: 'counter' } });

      await waitFor(() => {
        expect(screen.getByText('counter.wv')).toBeInTheDocument();
      });

      // Click on counter.wv
      const counterItem = screen.getByText('counter.wv');
      fireEvent.click(counterItem);

      expect(handleSelectFile).toHaveBeenCalledWith('/workspace/examples/counter.wv');
      expect(handleClose).toHaveBeenCalled();
    });

    it('navigates Quick Switcher with keyboard (ArrowDown, Enter, Esc)', async () => {
      const handleSelectFile = vi.fn();
      const handleClose = vi.fn();

      render(
        <QuickSwitcher
          isOpen={true}
          onClose={handleClose}
          onSelectFile={handleSelectFile}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('main.wv')).toBeInTheDocument();
      });

      // Arrow down
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      });

      // Press Enter to open
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(handleSelectFile).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();

      // Press Escape to close
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Cursor / Anti-Gravity Inline Prompting System (Cmd+K)', () => {
    it('renders InlinePromptBar with active model badge and quick suggestion chips', () => {
      const handleClose = vi.fn();
      const handleSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <InlinePromptBar
          isOpen={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          activeFilePath="/workspace/src/main.wv"
          lineNumber={12}
        />
      );

      expect(screen.getByTestId('monaco-inline-prompt-bar')).toBeInTheDocument();
      expect(screen.getByText(/🎨 Theme Block/i)).toBeInTheDocument();
      expect(screen.getByText(/⚡ REST Resource/i)).toBeInTheDocument();
      expect(screen.getByText(/🔄 Reset Handler/i)).toBeInTheDocument();

      // Click quick chip
      const themeChip = screen.getByText(/🎨 Theme Block/i);
      fireEvent.click(themeChip);

      // Submit prompt
      const genButton = screen.getByRole('button', { name: /Generate/i });
      fireEvent.click(genButton);

      expect(handleSubmit).toHaveBeenCalledWith(
        'Add dark theme block with Cyan & Amber palettes',
        expect.any(String)
      );
    });
  });

  describe('4. Inline Diff Review & Live Green/Red Highlight Overlay', () => {
    const mockPatch: AIPatch = {
      filePath: '/workspace/src/main.wv',
      summary: 'Added Reset handler and styled reactive buttons',
      originalCode: 'fn main() {\n    let count = 0;\n}',
      modifiedCode: 'fn main() {\n    let count = 0;\n    // Reset Handler\n    count = 0;\n}',
      diffLines: [
        { type: 'same', text: 'fn main() {' },
        { type: 'same', text: '    let count = 0;' },
        { type: 'add', text: '    // Reset Handler' },
        { type: 'add', text: '    count = 0;' },
        { type: 'same', text: '}' },
      ],
    };

    it('renders InlineDiffReview with addition/deletion stats and handles Accept/Reject', () => {
      const handleAccept = vi.fn();
      const handleReject = vi.fn();

      render(
        <InlineDiffReview
          patch={mockPatch}
          onAccept={handleAccept}
          onReject={handleReject}
          filePath="main.wv"
        />
      );

      expect(screen.getByTestId('inline-diff-review-bar')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.getByText('-0')).toBeInTheDocument();

      // Click Accept
      const acceptBtn = screen.getByTestId('btn-accept-diff');
      fireEvent.click(acceptBtn);
      expect(handleAccept).toHaveBeenCalled();

      // Click Reject
      const rejectBtn = screen.getByTestId('btn-reject-diff');
      fireEvent.click(rejectBtn);
      expect(handleReject).toHaveBeenCalled();
    });

    it('responds to global Cmd+Enter (Accept) and Esc (Reject) shortcuts', () => {
      const handleAccept = vi.fn();
      const handleReject = vi.fn();

      render(
        <InlineDiffReview
          patch={mockPatch}
          onAccept={handleAccept}
          onReject={handleReject}
          filePath="main.wv"
        />
      );

      // Cmd+Enter to Accept
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }));
      });
      expect(handleAccept).toHaveBeenCalledTimes(1);

      // Esc to Reject
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(handleReject).toHaveBeenCalledTimes(1);
    });
  });
});
