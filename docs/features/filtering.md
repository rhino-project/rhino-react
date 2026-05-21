# Filtering and Searching

@rhino-project/rhino-react provides powerful filtering and search capabilities through the `useModelIndex` hook. Build complex queries with field filters, full-text search, sorting, and field selection.

## Table of Contents

- [Basic Filtering](#basic-filtering)
- [Full-Text Search](#full-text-search)
- [Sorting](#sorting)
- [Field Selection](#field-selection)
- [Combining Features](#combining-features)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

---

## Basic Filtering

Filter records by field values using the `filters` parameter.

### Single Filter

```jsx
import { useModelIndex } from '@rhino-project/rhino-react';

function PublishedPosts() {
  const { data: response } = useModelIndex('posts', {
    filters: {
      status: 'published'
    }
  });

  const posts = response?.data || [];

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

**API Request:**
```
GET /api/acme-corp/posts?filter[status]=published
```

### Multiple Filters

Combine multiple filters - they work as AND conditions:

```jsx
const { data: response } = useModelIndex('posts', {
  filters: {
    status: 'published',
    author_id: 123,
    category: 'technology'
  }
});
```

**API Request:**
```
GET /api/acme-corp/posts?filter[status]=published&filter[author_id]=123&filter[category]=technology
```

This returns posts that are:
- Published AND
- Written by author 123 AND
- In the technology category

### Dynamic Filters

Build filters based on user input:

```jsx
function FilterablePosts() {
  const [status, setStatus] = useState('published');
  const [category, setCategory] = useState('');

  const filters = {
    status,
    ...(category && { category }) // Only include if category is set
  };

  const { data: response } = useModelIndex('posts', { filters });

  return (
    <div>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="tech">Technology</option>
          <option value="business">Business</option>
          <option value="lifestyle">Lifestyle</option>
        </select>
      </div>

      <div className="results">
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>
    </div>
  );
}
```

### Date Range Filters

Filter by date ranges:

```jsx
function PostsByDateRange() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');

  const { data: response } = useModelIndex('posts', {
    filters: {
      created_after: startDate,
      created_before: endDate
    }
  });

  return (
    <div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />

      <div>
        {response?.data?.map(post => (
          <div key={post.id}>
            {post.title} - {post.created_at}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Boolean Filters

Filter by boolean values:

```jsx
const { data: response } = useModelIndex('posts', {
  filters: {
    is_featured: true,
    is_pinned: false
  }
});
```

### Null/Empty Filters

Filter for null or non-null values:

```jsx
// Posts without a published date
const { data: response } = useModelIndex('posts', {
  filters: {
    published_at: null
  }
});

// Posts with a published date
const { data: response2 } = useModelIndex('posts', {
  filters: {
    published_at: 'not_null'
  }
});
```

---

## Full-Text Search

Use the `search` parameter for full-text search across model fields.

### Basic Search

```jsx
function SearchablePosts() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: response } = useModelIndex('posts', {
    search: searchTerm
  });

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search posts..."
      />

      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>
    </div>
  );
}
```

**API Request:**
```
GET /api/acme-corp/posts?search=react+hooks
```

### Search with Debouncing

Prevent excessive API calls while typing:

```jsx
import { useState, useEffect } from 'react';

function DebouncedSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [search]);

  const { data: response, isLoading, isFetching } = useModelIndex('posts', {
    search: debouncedSearch
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />

      {isFetching && <span className="spinner">Searching...</span>}

      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      {debouncedSearch && response?.pagination && (
        <p>Found {response.pagination.total} results</p>
      )}
    </div>
  );
}
```

### Search with Filters

Combine search with filters:

```jsx
const [search, setSearch] = useState('');
const [status, setStatus] = useState('published');

const { data: response } = useModelIndex('posts', {
  search, // Search across all searchable fields
  filters: {
    status // Only search within published posts
  }
});
```

**API Request:**
```
GET /api/acme-corp/posts?search=react&filter[status]=published
```

### Search Highlighting

Display search terms in results:

```jsx
function SearchResultsWithHighlight({ searchTerm }) {
  const { data: response } = useModelIndex('posts', {
    search: searchTerm
  });

  const highlightText = (text, term) => {
    if (!term) return text;

    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      {response?.data?.map(post => (
        <div key={post.id}>
          <h3>{highlightText(post.title, searchTerm)}</h3>
          <p>{highlightText(post.excerpt, searchTerm)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Sorting

Sort results using the `sort` parameter.

### Basic Sorting

```jsx
// Sort by created_at ascending
const { data: response } = useModelIndex('posts', {
  sort: 'created_at'
});

// Sort by created_at descending
const { data: response2 } = useModelIndex('posts', {
  sort: '-created_at' // Prefix with '-' for descending
});
```

**API Requests:**
```
GET /api/acme-corp/posts?sort=created_at
GET /api/acme-corp/posts?sort=-created_at
```

### Dynamic Sorting

Let users choose sort order:

```jsx
function SortablePosts() {
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const sortParam = sortOrder === 'desc' ? `-${sortField}` : sortField;

  const { data: response } = useModelIndex('posts', {
    sort: sortParam
  });

  return (
    <div>
      <div className="sort-controls">
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
        >
          <option value="created_at">Date Created</option>
          <option value="updated_at">Last Updated</option>
          <option value="title">Title</option>
          <option value="views">Views</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>
    </div>
  );
}
```

### Table Column Sorting

Implement sortable table headers:

```jsx
function SortableTable() {
  const [sort, setSort] = useState('-created_at');

  const { data: response } = useModelIndex('posts', { sort });

  const handleSort = (field) => {
    // Toggle between ascending and descending
    if (sort === field) {
      setSort(`-${field}`);
    } else if (sort === `-${field}`) {
      setSort(field);
    } else {
      setSort(field);
    }
  };

  const getSortIcon = (field) => {
    if (sort === field) return '↑';
    if (sort === `-${field}`) return '↓';
    return '↕';
  };

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => handleSort('title')}>
            Title {getSortIcon('title')}
          </th>
          <th onClick={() => handleSort('created_at')}>
            Date {getSortIcon('created_at')}
          </th>
          <th onClick={() => handleSort('views')}>
            Views {getSortIcon('views')}
          </th>
        </tr>
      </thead>
      <tbody>
        {response?.data?.map(post => (
          <tr key={post.id}>
            <td>{post.title}</td>
            <td>{post.created_at}</td>
            <td>{post.views}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Field Selection

Select specific fields to reduce payload size using the `fields` parameter.

### Basic Field Selection

```jsx
// Only fetch id and title
const { data: response } = useModelIndex('posts', {
  fields: ['id', 'title']
});
```

**API Request:**
```
GET /api/acme-corp/posts?fields=id,title
```

### Optimized List View

Fetch minimal fields for list view, full fields for detail view:

```jsx
// List view - minimal fields
function PostsList() {
  const { data: response } = useModelIndex('posts', {
    fields: ['id', 'title', 'excerpt', 'created_at'],
    perPage: 50
  });

  return (
    <div>
      {response?.data?.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

// Detail view - all fields
function PostDetail({ id }) {
  const { data: post } = useModelShow('posts', id, {
    includes: ['author', 'comments']
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      {/* Full post details */}
    </article>
  );
}
```

### Field Selection with Relationships

When using `includes`, you can select fields from related models too (depends on backend support):

```jsx
const { data: response } = useModelIndex('posts', {
  fields: ['id', 'title', 'author_id'],
  includes: ['author']
});
```

---

## Combining Features

Combine filters, search, sort, fields, and pagination for powerful queries:

### Complete Example

```jsx
function AdvancedPostsFilter() {
  // State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('published');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('-created_at');

  // Build filters
  const filters = {
    status,
    ...(category && { category })
  };

  // Fetch data
  const { data: response, isLoading } = useModelIndex('posts', {
    page,
    perPage,
    search,
    filters,
    sort,
    fields: ['id', 'title', 'excerpt', 'created_at', 'author_id'],
    includes: ['author']
  });

  const posts = response?.data || [];
  const pagination = response?.pagination;

  // Reset page when filters change
  const handleFilterChange = (newFilter) => {
    setFilters(newFilter);
    setPage(1);
  };

  return (
    <div className="advanced-filter">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search posts..."
      />

      {/* Filters */}
      <div className="filters">
        <select value={status} onChange={(e) => handleFilterChange({ status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="tech">Technology</option>
          <option value="business">Business</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
          <option value="title">Title A-Z</option>
          <option value="-title">Title Z-A</option>
        </select>

        <select value={perPage} onChange={(e) => {
          setPerPage(Number(e.target.value));
          setPage(1);
        }}>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="results-count">
            {pagination && (
              <p>
                Showing {(page - 1) * perPage + 1} to{' '}
                {Math.min(page * perPage, pagination.total)} of{' '}
                {pagination.total} results
              </p>
            )}
          </div>

          <div className="posts">
            {posts.map(post => (
              <article key={post.id}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <small>
                  By {post.author?.name} on {new Date(post.created_at).toLocaleDateString()}
                </small>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
```

---

## Advanced Patterns

### Persistent Filters with URL

Sync filter state with URL query params:

```jsx
import { useSearchParams } from 'react-router-dom';

function URLFilteredPosts() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read from URL
  const filters = {
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || ''
  };
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page')) || 1;

  const { data: response } = useModelIndex('posts', {
    filters,
    search,
    page,
    perPage: 20
  });

  // Update URL
  const updateFilter = (key, value) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    searchParams.set('page', '1'); // Reset page
    setSearchParams(searchParams);
  };

  return (
    <div>
      <select
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
      >
        <option value="">All</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      {/* Results */}
    </div>
  );
}
```

### Saved Filter Presets

Allow users to save and load filter configurations:

```jsx
function FilterPresets() {
  const [presets, setPresets] = useState(() => {
    return JSON.parse(localStorage.getItem('filterPresets') || '[]');
  });

  const [currentFilters, setCurrentFilters] = useState({});

  const savePreset = (name) => {
    const newPreset = { name, filters: currentFilters };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
  };

  const loadPreset = (preset) => {
    setCurrentFilters(preset.filters);
  };

  return (
    <div>
      <div className="presets">
        {presets.map((preset, index) => (
          <button key={index} onClick={() => loadPreset(preset)}>
            {preset.name}
          </button>
        ))}
      </div>

      {/* Filter UI */}
      <button onClick={() => savePreset(prompt('Preset name:'))}>
        Save Current Filters
      </button>
    </div>
  );
}
```

---

## Best Practices

### 1. Reset Page When Filters Change

```jsx
const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  setPage(1); // Always reset to page 1
};
```

### 2. Use Debouncing for Search

Avoid excessive API calls:

```jsx
const [search, setSearch] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(timer);
}, [search]);
```

### 3. Show Loading States

```jsx
const { data, isLoading, isFetching } = useModelIndex('posts', { filters });

return (
  <div className={isFetching ? 'opacity-50' : ''}>
    {isLoading ? <Skeleton /> : <Results data={data} />}
  </div>
);
```

### 4. Provide Clear Feedback

```jsx
{response?.pagination && (
  <p>
    Found {response.pagination.total} results
    {search && ` for "${search}"`}
  </p>
)}
```

### 5. Allow Filter Reset

```jsx
const resetFilters = () => {
  setFilters({});
  setSearch('');
  setSort('-created_at');
  setPage(1);
};

<button onClick={resetFilters}>Clear All Filters</button>
```

---

## Related Documentation

- [API Reference - useModelIndex](../API.md#usemodelindex)
- [Pagination Guide](./pagination.md)
- [Relationships Guide](./relationships.md)
- [Getting Started](../getting-started.md)
