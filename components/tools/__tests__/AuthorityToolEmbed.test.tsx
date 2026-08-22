import { act, fireEvent, render, screen } from '@testing-library/react';

import AuthorityToolEmbed from '@/components/tools/AuthorityToolEmbed';

const SRC = 'https://authority.example/embed/visa-checker.html?host=egypt-excursionsonline.com';

describe('AuthorityToolEmbed', () => {
  it('renders an accessible, sandboxed iframe without publisher proof in the URL or DOM', () => {
    const { container } = render(
      <AuthorityToolEmbed src={SRC} tool="visa-checker" title="Egypt Visa & Entry Checker" />,
    );

    const frame = screen.getByTitle('Egypt Visa & Entry Checker');
    expect(frame).toHaveAttribute('src', SRC);
    expect(frame).toHaveAttribute(
      'sandbox',
      'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts',
    );
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(screen.getByRole('status')).toHaveTextContent('Loading verified travel tool');
    expect(container.innerHTML).not.toMatch(/publisher[_-]?token|x-publisher-token/i);
  });

  it('clears the loading state and accepts bounded resize messages only from its own frame', async () => {
    render(<AuthorityToolEmbed src={SRC} tool="visa-checker" title="Egypt Visa & Entry Checker" />);
    const frame = screen.getByTitle('Egypt Visa & Entry Checker') as HTMLIFrameElement;

    fireEvent.load(frame);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.example',
          source: frame.contentWindow,
          data: { type: 'foxes-tools:resize', tool: 'visa-checker', height: 1_250 },
        }),
      );
    });
    expect(frame.style.height).toBe('760px');

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://authority.example',
          source: frame.contentWindow,
          data: { type: 'foxes-tools:resize', tool: 'visa-checker', height: 1_250 },
        }),
      );
    });
    expect(frame.style.height).toBe('1250px');

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://authority.example',
          source: frame.contentWindow,
          data: { type: 'foxes-tools:resize', tool: 'visa-checker', height: 99_999 },
        }),
      );
    });
    expect(frame.style.height).toBe('5000px');
  });

  it('shows a usable error state when the iframe never finishes loading', async () => {
    jest.useFakeTimers();
    render(<AuthorityToolEmbed src={SRC} tool="visa-checker" title="Egypt Visa & Entry Checker" />);
    await act(async () => {
      jest.advanceTimersByTime(12_000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent('could not load');
    expect(screen.getByRole('link', { name: /open tool/i })).toHaveAttribute('href', SRC);
    expect(screen.queryByTitle('Egypt Visa & Entry Checker')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
