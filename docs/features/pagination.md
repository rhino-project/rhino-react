# Pagination

@rhino-dev/rhino-react provides automatic pagination support with metadata extraction from Rhino backend API responses. Pagination works seamlessly with `useModelIndex` and `useModelTrashed` hooks.

## Table of Contents

- [How It Works](#how-it-works)
- [Basic Usage](#basic-usage)
- [Pagination Metadata](#pagination-metadata)
- [Building a Pagination Component](#building-a-pagination-component)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

---

## How It Works

Rhino backends send pagination metadata in response headers:

```
X-Current-Page: 2
X-Last-Page: 10
X-Per-Page: 15
X-Total: 143
```

@rhino-dev/rhino-react automatically extracts these headers using the `extractPaginationFromHeaders()` utility and includes them in the query response.

**API Request:**
```
GET /api/acme-corp/posts?page=2&per_page=15
```

**Response Structure:**
```javascript
{
  data: [...], // Array of models
  pagination: {
    currentPage: 2,
    lastPage: 10,
    perPage: 15,
    total: 143
  }
}
```

---

## Basic Usage

### Simple Pagination

```jsx
import { useState } from 'react';
import { useModelIndex } from '@rhino-dev/rhino-react';

function PostsList() {
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useModelIndex('posts', {
    page,
    perPage: 20
  });

  const posts = response?.data || [];
  const pagination = response?.pagination;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Blog Posts</h1>

      {/* Render posts */}
      <div className="posts">
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>

      {/* Pagination controls */}
      {pagination && (
        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>

          <span>
            Page {pagination.currentPage} of {pagination.lastPage}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.lastPage}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### With Items Per Page Selector

```jsx
function PostsWithPerPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const { data: response } = useModelIndex('posts', {
    page,
    perPage
  });

  const pagination = response?.pagination;

  return (
    <div>
      {/* Per page selector */}
      <div>
        <label>Items per page:</label>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1); // Reset to first page
          }}
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Content */}
      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      {/* Pagination info */}
      {pagination && (
        <p>
          Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{' '}
          {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{' '}
          {pagination.total} results
        </p>
      )}
    </div>
  );
}
```

---

## Pagination Metadata

The `pagination` object contains:

```typescript
interface PaginationMeta {
  currentPage: number;  // Current page number (1-indexed)
  lastPage: number;     // Total number of pages
  perPage: number;      // Items per page
  total: number;        // Total number of items across all pages
}
```

### Accessing Metadata

```jsx
const { data: response } = useModelIndex('posts', { page: 2, perPage: 10 });

const pagination = response?.pagination;

console.log(pagination.currentPage); // 2
console.log(pagination.lastPage);    // 10
console.log(pagination.perPage);     // 10
console.log(pagination.total);       // 95

// Calculated values
const isFirstPage = pagination.currentPage === 1;
const isLastPage = pagination.currentPage >= pagination.lastPage;
const startItem = (pagination.currentPage - 1) * pagination.perPage + 1;
const endItem = Math.min(pagination.currentPage * pagination.perPage, pagination.total);
```

---

## Building a Pagination Component

### Reusable Pagination Component

```jsx
// components/Pagination.jsx
export function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.lastPage <= 1) {
    return null; // Don't show if only one page
  }

  const { currentPage, lastPage } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPages = 7; // Show max 7 page numbers

    if (lastPage <= maxPages) {
      // Show all pages if total is small
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= 4) {
        // Near start: 1 2 3 4 5 ... 10
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(lastPage);
      } else if (currentPage >= lastPage - 3) {
        // Near end: 1 ... 6 7 8 9 10
        pages.push(1);
        pages.push('...');
        for (let i = lastPage - 4; i <= lastPage; i++) pages.push(i);
      } else {
        // Middle: 1 ... 4 5 6 ... 10
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(lastPage);
      }
    }

    return pages;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Previous
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...' || page === currentPage}
          className={`
            px-3 py-1 border rounded
            ${page === currentPage ? 'bg-blue-500 text-white' : ''}
            ${page === '...' ? 'cursor-default border-none' : ''}
          `}
        >
          {page}
        </button>
      ))}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
```

### Usage

```jsx
import { Pagination } from './components/Pagination';

function PostsList() {
  const [page, setPage] = useState(1);
  const { data: response } = useModelIndex('posts', { page, perPage: 15 });

  return (
    <div>
      {/* Content */}
      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        pagination={response?.pagination}
        onPageChange={setPage}
        className="mt-6"
      />
    </div>
  );
}
```

---

## Advanced Patterns

### Pagination with Filters

Combine pagination with filters and search:

```jsx
function FilteredPosts() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('published');
  const [search, setSearch] = useState('');

  const { data: response } = useModelIndex('posts', {
    page,
    perPage: 20,
    filters: { status },
    search,
    sort: '-created_at'
  });

  // Reset to page 1 when filters change
  const handleFilterChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearch = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <select value={status} onChange={(e) => handleFilterChange(e.target.value)}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search..."
        />
      </div>

      {/* Results */}
      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      <Pagination pagination={response?.pagination} onPageChange={setPage} />
    </div>
  );
}
```

### Infinite Scroll

Use React Query's `useInfiniteQuery` pattern with @rhino-dev/rhino-react:

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, extractPaginationFromHeaders } from '@rhino-dev/rhino-react/lib';
import { useOrganization } from '@rhino-dev/rhino-react';

function InfinitePostsList() {
  const organization = useOrganization();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(`/${organization}/posts`, {
        params: { page: pageParam, per_page: 20 }
      });

      return {
        data: response.data,
        pagination: extractPaginationFromHeaders(response)
      };
    },
    getNextPageParam: (lastPage) => {
      const { currentPage, lastPage: totalPages } = lastPage.pagination;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    }
  });

  const posts = data?.pages.flatMap(page => page.data) || [];

  return (
    <div>
      <div>
        {posts.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### URL-Based Pagination

Sync pagination state with URL query params:

```jsx
import { useSearchParams } from 'react-router-dom';

function URLPaginatedPosts() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 15;

  const { data: response } = useModelIndex('posts', { page, perPage });

  const setPage = (newPage) => {
    searchParams.set('page', String(newPage));
    setSearchParams(searchParams);
  };

  const setPerPage = (newPerPage) => {
    searchParams.set('per_page', String(newPerPage));
    searchParams.set('page', '1'); // Reset to first page
    setSearchParams(searchParams);
  };

  return (
    <div>
      {/* Content */}
      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      <Pagination pagination={response?.pagination} onPageChange={setPage} />
    </div>
  );
}
```

### Server-Side Rendering (SSR)

For Next.js or other SSR frameworks:

```jsx
// pages/posts.jsx (Next.js)
import { dehydrate, QueryClient, useQuery } from '@tanstack/react-query';
import { useModelIndex } from '@rhino-dev/rhino-react';

export async function getServerSideProps({ query }) {
  const queryClient = new QueryClient();
  const page = Number(query.page) || 1;

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: ['posts', { page, perPage: 15 }],
    queryFn: () => fetchPosts(page, 15)
  });

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      initialPage: page
    }
  };
}

export default function PostsPage({ initialPage }) {
  const [page, setPage] = useState(initialPage);
  const { data: response } = useModelIndex('posts', { page, perPage: 15 });

  // Component implementation...
}
```

---

## Best Practices

### 1. Reset Page When Filters Change

Always reset to page 1 when filters, search, or sort changes:

```jsx
const handleFilterChange = (newFilter) => {
  setFilter(newFilter);
  setPage(1); // Reset to first page
};
```

### 2. Optimize Performance with React Query

Configure appropriate `staleTime` to avoid unnecessary refetches:

```jsx
const { data } = useModelIndex('posts', { page }, {
  staleTime: 1000 * 60 * 5, // 5 minutes
  cacheTime: 1000 * 60 * 10, // 10 minutes
});
```

### 3. Show Loading States

Provide feedback during page transitions:

```jsx
const { data, isLoading, isFetching } = useModelIndex('posts', { page });

return (
  <div>
    {isFetching && <div className="loading-overlay">Loading...</div>}

    <div className={isFetching ? 'opacity-50' : ''}>
      {/* Content */}
    </div>
  </div>
);
```

### 4. Handle Empty States

```jsx
const posts = response?.data || [];
const pagination = response?.pagination;

if (!isLoading && posts.length === 0) {
  return <div>No posts found</div>;
}
```

### 5. Prefetch Next Page

Improve perceived performance by prefetching the next page:

```jsx
import { useQueryClient } from '@tanstack/react-query';

function PostsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: response } = useModelIndex('posts', { page, perPage: 15 });

  // Prefetch next page
  useEffect(() => {
    if (response?.pagination) {
      const { currentPage, lastPage } = response.pagination;

      if (currentPage < lastPage) {
        // Prefetch next page in background
        queryClient.prefetchQuery({
          queryKey: ['posts', { page: currentPage + 1, perPage: 15 }],
          queryFn: () => fetchPosts(currentPage + 1, 15)
        });
      }
    }
  }, [response, queryClient]);

  // Component implementation...
}
```

---

## Related Documentation

- [API Reference - useModelIndex](../API.md#usemodelindex)
- [Filtering Guide](./filtering.md)
- [Getting Started](../getting-started.md)
