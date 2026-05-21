# Getting Started with @rhino-project/rhino-react

This guide will help you install and set up @rhino-project/rhino-react in your React application.

## Prerequisites

Before you begin, ensure you have:

- **React 18+** or **React 19**
- **Node.js 18+**
- A **Laravel backend** with the rhino-laravel package installed
- Basic familiarity with React Hooks and React Query

## Installation

Install @rhino-project/rhino-react and its peer dependencies:

```bash
npm install @rhino-project/rhino-react @tanstack/react-query axios
```

Or with yarn:

```bash
yarn add @rhino-project/rhino-react @tanstack/react-query axios
```

Or with pnpm:

```bash
pnpm add @rhino-project/rhino-react @tanstack/react-query axios
```

## Project Setup

### 1. Environment Configuration

Create a `.env` file in your project root:

```env
VITE_API_URL=http://localhost:8000/api
```

For production:

```env
VITE_API_URL=https://api.yourapp.com/api
```

### 2. Configure React Query Provider

Wrap your app with the `QueryClientProvider` from React Query:

**src/main.jsx** or **src/index.jsx**:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Optional: React Query Devtools for debugging */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### 3. Configure API Client (Optional but Recommended)

While @rhino-project/rhino-react comes with a pre-configured Axios instance, you may want to customize it:

**src/lib/api.js**:

```javascript
import { api } from '@rhino-project/rhino-react/lib';

// Customize base URL if not using environment variables
api.defaults.baseURL = 'http://localhost:8000/api';

// Add request interceptors
api.interceptors.request.use((config) => {
  // Add custom headers
  config.headers['X-Custom-Header'] = 'value';
  return config;
});

// Add response interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors
    if (error.response?.status === 429) {
      console.error('Too many requests');
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4. Set Up Authentication Context (Optional)

If using the built-in authentication hooks:

**src/App.jsx**:

```jsx
import { AuthProvider } from '@rhino-project/rhino-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/orgs/:organization/*" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

## Your First Query

Now you're ready to start using @rhino-project/rhino-react hooks!

### Fetching a List of Models

**src/pages/Posts.jsx**:

```jsx
import { useModelIndex } from '@rhino-project/rhino-react';

export default function Posts() {
  const { data: response, isLoading, error } = useModelIndex('posts', {
    includes: ['author'],
    sort: '-created_at',
    page: 1,
    perPage: 10
  });

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const posts = response?.data || [];
  const pagination = response?.pagination;

  return (
    <div>
      <h1>Blog Posts</h1>

      <div className="posts">
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>By: {post.author?.name}</p>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>

      {pagination && (
        <div className="pagination">
          <p>
            Page {pagination.currentPage} of {pagination.lastPage}
            ({pagination.total} total posts)
          </p>
        </div>
      )}
    </div>
  );
}
```

### Creating a New Model

**src/components/CreatePostForm.jsx**:

```jsx
import { useState } from 'react';
import { useModelStore } from '@rhino-project/rhino-react';

export default function CreatePostForm() {
  const createPost = useModelStore('posts');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    createPost.mutate({
      title,
      content,
      status: 'draft'
    }, {
      onSuccess: (newPost) => {
        alert('Post created successfully!');
        console.log('Created post:', newPost);
        setTitle('');
        setContent('');
      },
      onError: (error) => {
        alert('Failed to create post: ' + error.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Post</h2>

      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={createPost.isLoading}>
        {createPost.isLoading ? 'Creating...' : 'Create Post'}
      </button>

      {createPost.error && (
        <p style={{ color: 'red' }}>
          Error: {createPost.error.message}
        </p>
      )}
    </form>
  );
}
```

## Multi-Tenant Setup

@rhino-project/rhino-react has built-in support for multi-tenancy with organization-based routing.

### URL Structure

Your routes should follow this pattern:

```
/orgs/:organization/posts
/orgs/:organization/users
/orgs/:organization/dashboard
```

Example:
```
/orgs/acme-corp/posts
/orgs/tech-startup/users
```

### Using Organization Context

**src/pages/Dashboard.jsx**:

```jsx
import { useOrganization, useOwner, useModelIndex } from '@rhino-project/rhino-react';

export default function Dashboard() {
  // Get current organization slug from URL
  const organization = useOrganization();

  // Fetch organization data
  const { data: orgData } = useOwner({
    includes: ['users']
  });

  // All queries are automatically scoped to this organization
  const { data: postsResponse } = useModelIndex('posts');

  if (!organization) {
    return <div>No organization selected</div>;
  }

  return (
    <div>
      <h1>{orgData?.name} Dashboard</h1>
      <p>Organization slug: {organization}</p>
      <p>Members: {orgData?.users?.length}</p>

      {/* Your dashboard content */}
    </div>
  );
}
```

### API Requests with Organizations

All requests automatically include the organization context:

```
GET /api/acme-corp/posts
POST /api/acme-corp/posts
PUT /api/acme-corp/posts/123
```

The organization slug is:
1. Extracted from URL params (`/orgs/:organization/*`)
2. Stored in localStorage
3. Sent with every request via `X-Organization` header

## Authentication Flow

### Login Page

**src/pages/Login.jsx**:

```jsx
import { useState } from 'react';
import { useAuth } from '@rhino-project/rhino-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(email, password);

    if (result.success) {
      // Redirect to organization dashboard
      if (result.organization_slug) {
        navigate(`/orgs/${result.organization_slug}/dashboard`);
      }
    } else {
      setError(result.error || 'Login failed');
    }
  };

  if (isAuthenticated) {
    return <div>Already logged in</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
      </div>

      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
      </div>

      <button type="submit">Login</button>
    </form>
  );
}
```

### Protected Routes

**src/components/ProtectedRoute.jsx**:

```jsx
import { useAuth } from '@rhino-project/rhino-react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

**src/App.jsx**:

```jsx
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/orgs/:organization/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

## Common Patterns

### Pagination Component

```jsx
function Pagination({ pagination, onPageChange }) {
  if (!pagination) return null;

  const { currentPage, lastPage } = pagination;

  return (
    <div>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      <span>
        Page {currentPage} of {lastPage}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
      >
        Next
      </button>
    </div>
  );
}

// Usage
function PostsList() {
  const [page, setPage] = useState(1);
  const { data: response } = useModelIndex('posts', { page, perPage: 10 });

  return (
    <div>
      {/* Render posts */}
      <Pagination
        pagination={response?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### Search with Debouncing

```jsx
import { useState, useEffect } from 'react';
import { useModelIndex } from '@rhino-project/rhino-react';

function SearchablePosts() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data: response, isLoading } = useModelIndex('posts', {
    search: debouncedSearch,
    perPage: 20
  });

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts..."
      />

      {isLoading && <p>Searching...</p>}

      <div>
        {response?.data?.map(post => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>
    </div>
  );
}
```

## Next Steps

Now that you have @rhino-project/rhino-react set up, explore these guides:

- **[API Reference](./API.md)** - Complete documentation of all hooks
- **[Pagination Guide](./features/pagination.md)** - Advanced pagination techniques
- **[Filtering & Search](./features/filtering.md)** - Powerful query capabilities
- **[Soft Deletes](./features/soft-deletes.md)** - Trash and restore functionality
- **[Relationships](./features/relationships.md)** - Eager loading related data
- **[Nested Operations](./features/nested-operations.md)** - Multi-model transactions

## Troubleshooting

### CORS Errors

If you encounter CORS errors, ensure your Laravel backend has CORS configured:

**config/cors.php**:
```php
'paths' => ['api/*'],
'allowed_origins' => ['http://localhost:5173'], // Your Vite dev server
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

### Authentication Issues

Make sure your Laravel backend has Sanctum configured and the API routes are protected:

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Your protected routes
});
```

### Organization Not Found

Ensure your URL structure matches: `/orgs/:organization/*`

The `useOrganization()` hook looks for the `:organization` param in the URL.

## Support

- **Documentation**: [Full Docs](../README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/rhino-client/issues)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)
