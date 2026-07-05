import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

// Component under test
interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

function Search({ onSearch, placeholder = 'Search...' }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    onSearch(query);
    // Simulated fetch
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.items);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} role="search" aria-label="Site search">
      <label htmlFor="search-input">Search</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" disabled={!query.trim()}>
        Search
      </button>

      {loading && <p aria-live="polite">Loading results...</p>}

      {results.length > 0 && (
        <ul aria-label="Search results">
          {results.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

// --- Tests ---
import { useState } from 'react';

describe('Search component', () => {
  const user = userEvent.setup();

  it('renders with accessible elements', () => {
    render(<Search onSearch={vi.fn()} />);

    expect(screen.getByRole('search', { name: 'Site search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('enables submit button when query is entered', async () => {
    render(<Search onSearch={vi.fn()} />);

    const input = screen.getByLabelText('Search');
    await user.type(input, 'react testing');

    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('calls onSearch with query on submit', async () => {
    const onSearch = vi.fn();
    render(<Search onSearch={onSearch} />);

    await user.type(screen.getByLabelText('Search'), 'vitest');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('vitest');
  });

  it('shows loading state and then results', async () => {
    render(<Search onSearch={vi.fn()} />);

    await user.type(screen.getByLabelText('Search'), 'query');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    // Loading state appears
    expect(screen.getByText('Loading results...')).toBeInTheDocument();

    // Results appear (MSW handler returns data)
    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Search results' })).toBeInTheDocument();
    });
  });

  it('passes accessibility audit', async () => {
    const { container } = render(<Search onSearch={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
