# API Reference

Complete reference for all hooks and utilities in @rhino-dev/rhino-react.

## Table of Contents

- [Authentication](#authentication)
  - [useAuth](#useauth)
- [Organization](#organization)
  - [useOrganization](#useorganization)
  - [useOwner](#useowner)
  - [useOrganizationExists](#useorganizationexists)
- [Model CRUD](#model-crud)
  - [useModelIndex](#usemodelindex)
  - [useModelShow](#usemodelshow)
  - [useModelStore](#usemodelstore)
  - [useModelUpdate](#usemodelupdate)
  - [useModelDelete](#usemodeldelete)
- [Soft Deletes](#soft-deletes)
  - [useModelTrashed](#usemodeltrashed)
  - [useModelRestore](#usemodelrestore)
  - [useModelForceDelete](#usemodelforcedelete)
- [Advanced Operations](#advanced-operations)
  - [useNestedOperations](#usenestedoperations)
  - [useModelAudit](#usemodelaudit)
- [Invitations](#invitations)
  - [useInvitations](#useinvitations)
  - [useInviteUser](#useinviteuser)
  - [useResendInvitation](#useresend invitation)
  - [useCancelInvitation](#usecancelinvitation)
  - [useAcceptInvitation](#useacceptinvitation)
- [Utilities](#utilities)
  - [extractPaginationFromHeaders](#extractpaginationfromheaders)
  - [api](#api)
  - [cn](#cn)

---

## Authentication

### useAuth()

Access authentication state and methods for login, logout, and organization management.

**Import:**
```typescript
import { useAuth } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useAuth(): {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setOrganization: (slug: string) => void;
  organization: string | null;
}
```

**Returns:**
- `token` - Current authentication token (from localStorage)
- `isAuthenticated` - Boolean indicating if user is logged in
- `login` - Function to authenticate user with email/password
- `logout` - Function to clear authentication and redirect
- `setOrganization` - Function to set current organization slug
- `organization` - Current organization slug

**Example:**
```typescript
function LoginPage() {
  const { isAuthenticated, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(email, password);

    if (result.success) {
      // User logged in successfully
      // Will automatically redirect if organization_slug is present
    } else {
      alert(result.error || 'Login failed');
    }
  };

  if (isAuthenticated) {
    return (
      <div>
        <p>You are logged in</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Organization

### useOrganization()

Get the current organization slug from URL parameters or localStorage.

**Import:**
```typescript
import { useOrganization } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useOrganization(): string | null
```

**Returns:**
- Organization slug string (e.g., "acme-corp") or null if not in organization context

**Example:**
```typescript
function Dashboard() {
  const organization = useOrganization();

  if (!organization) {
    return <div>No organization selected</div>;
  }

  return (
    <div>
      <h1>Dashboard for {organization}</h1>
      {/* Organization-scoped content */}
    </div>
  );
}
```

**Usage Notes:**
- Checks URL params first: `/orgs/:organization/*`
- Falls back to localStorage value
- Used internally by all model hooks for multi-tenant scoping
- Automatically included in API requests via interceptors

---

### useOwner()

Fetch the current organization's complete data including relationships.

**Import:**
```typescript
import { useOwner } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useOwner(options?: {
  includes?: string[];
}): UseQueryResult<Organization>
```

**Parameters:**
- `options.includes` - Relationships to eager load (e.g., `['users', 'roles']`)

**Returns:**
- Standard React Query result with organization data
- `data` - Organization object with id, name, slug, timestamps, and included relationships

**Example:**
```typescript
function OrganizationSettings() {
  const { data: organization, isLoading } = useOwner({
    includes: ['users']
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{organization.name}</h2>
      <p>Slug: {organization.slug}</p>
      <p>Created: {organization.created_at}</p>

      <h3>Members ({organization.users?.length})</h3>
      <ul>
        {organization.users?.map(user => (
          <li key={user.id}>
            {user.name} - Role ID: {user.pivot?.role_id}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### useOrganizationExists()

Check if an organization exists by slug (useful for registration/onboarding flows).

**Import:**
```typescript
import { useOrganizationExists } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useOrganizationExists(
  slug: string
): UseQueryResult<{ exists: boolean }>
```

**Parameters:**
- `slug` - Organization slug to check

**Returns:**
- `data.exists` - Boolean indicating if organization exists

**Example:**
```typescript
function OrganizationSlugInput() {
  const [slug, setSlug] = useState('');
  const { data, isLoading } = useOrganizationExists(slug);

  return (
    <div>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="organization-slug"
      />
      {isLoading && <span>Checking...</span>}
      {data?.exists === true && <span style={{color: 'red'}}>Slug taken</span>}
      {data?.exists === false && <span style={{color: 'green'}}>Available!</span>}
    </div>
  );
}
```

---

## Model CRUD

### useModelIndex()

Fetch paginated list of models with advanced filtering, sorting, search, and relationship loading.

**Import:**
```typescript
import { useModelIndex } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelIndex<T = any>(
  model: string,
  options?: ModelQueryOptions
): UseQueryResult<QueryResponse<T>>

interface ModelQueryOptions {
  filters?: Record<string, any>;
  includes?: string[];
  sort?: string;
  fields?: string[];
  search?: string;
  page?: number;
  perPage?: number;
  per_page?: number;
}

interface QueryResponse<T> {
  data: T[];
  pagination: PaginationMeta | null;
}

interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}
```

**Parameters:**
- `model` - Model name (e.g., 'posts', 'users', 'products')
- `options.filters` - Filter by field values (e.g., `{ status: 'published', author_id: 1 }`)
- `options.includes` - Eager load relationships (e.g., `['author', 'comments']`)
- `options.sort` - Sort field, prefix with `-` for descending (e.g., `'-created_at'`)
- `options.fields` - Select specific fields only (e.g., `['id', 'title', 'author_id']`)
- `options.search` - Full-text search query
- `options.page` - Page number (default: 1)
- `options.perPage` / `options.per_page` - Items per page (default: 15)

**Returns:**
- `data.data` - Array of model objects
- `data.pagination` - Pagination metadata (currentPage, lastPage, perPage, total)
- Standard React Query properties: `isLoading`, `error`, `refetch`, etc.

**Example:**
```typescript
function PostsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: response, isLoading, error } = useModelIndex('posts', {
    filters: {
      status: 'published',
      author_id: 123
    },
    includes: ['author', 'comments'],
    sort: '-created_at',
    search,
    page,
    perPage: 20,
    fields: ['id', 'title', 'excerpt', 'created_at', 'author_id']
  });

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const posts = response?.data || [];
  const pagination = response?.pagination;

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts..."
      />

      <div>
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <p>By: {post.author?.name}</p>
            <p>Comments: {post.comments?.length || 0}</p>
          </article>
        ))}
      </div>

      {pagination && (
        <div>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.lastPage}
            ({pagination.total} total)
          </span>
          <button
            disabled={page >= pagination.lastPage}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

**API Request Format:**
```
GET /api/:organization/:model?filter[status]=published&filter[author_id]=123&include=author,comments&sort=-created_at&search=react&page=1&per_page=20&fields=id,title,excerpt
```

---

### useModelShow()

Fetch a single model by ID with optional relationship loading and field selection.

**Import:**
```typescript
import { useModelShow } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelShow<T = any>(
  model: string,
  id: string | number,
  options?: {
    includes?: string[];
    fields?: string[];
  }
): UseQueryResult<T>
```

**Parameters:**
- `model` - Model name (e.g., 'posts', 'users')
- `id` - Model ID to fetch
- `options.includes` - Relationships to eager load
- `options.fields` - Specific fields to select

**Returns:**
- `data` - Single model object with all specified fields and relationships
- Standard React Query properties

**Example:**
```typescript
function PostDetail({ postId }) {
  const { data: post, isLoading, error } = useModelShow('posts', postId, {
    includes: ['author', 'comments.user', 'tags'],
    fields: ['id', 'title', 'content', 'created_at', 'author_id']
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!post) return <div>Post not found</div>;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>By: {post.author?.name} on {post.created_at}</p>
      <div>{post.content}</div>

      <h3>Tags</h3>
      {post.tags?.map(tag => (
        <span key={tag.id}>{tag.name}</span>
      ))}

      <h3>Comments ({post.comments?.length})</h3>
      {post.comments?.map(comment => (
        <div key={comment.id}>
          <p><strong>{comment.user?.name}:</strong> {comment.content}</p>
        </div>
      ))}
    </article>
  );
}
```

**API Request Format:**
```
GET /api/:organization/posts/123?include=author,comments.user,tags&fields=id,title,content,created_at,author_id
```

---

### useModelStore()

Create a new model instance.

**Import:**
```typescript
import { useModelStore } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelStore<T = any>(
  model: string
): UseMutationResult<T, Error, Record<string, any>>
```

**Parameters:**
- `model` - Model name to create

**Mutation Function:**
- Accepts data object with model fields
- Returns created model with all fields including generated ID

**Returns:**
- Standard React Query mutation result
- `mutate` / `mutateAsync` - Functions to trigger creation
- `data` - Created model object
- `isLoading`, `error`, `isSuccess`, etc.

**Example:**
```typescript
function CreatePostForm() {
  const createPost = useModelStore('posts');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    createPost.mutate({
      title,
      content,
      status: 'draft',
      author_id: 1,
      blog_id: 5
    }, {
      onSuccess: (data) => {
        console.log('Post created with ID:', data.id);
        alert('Post created successfully!');
        setTitle('');
        setContent('');
      },
      onError: (error) => {
        console.error('Failed to create post:', error);
        alert('Error: ' + error.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Post content"
        required
      />
      <button type="submit" disabled={createPost.isLoading}>
        {createPost.isLoading ? 'Creating...' : 'Create Post'}
      </button>
      {createPost.error && (
        <div style={{color: 'red'}}>Error: {createPost.error.message}</div>
      )}
    </form>
  );
}
```

**API Request:**
```
POST /api/:organization/posts
Body: { "title": "My Post", "content": "...", "status": "draft" }
```

**Cache Invalidation:**
- Automatically invalidates `useModelIndex` queries for this model
- Triggers refetch of lists to include new item

---

### useModelUpdate()

Update an existing model instance.

**Import:**
```typescript
import { useModelUpdate } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelUpdate<T = any>(
  model: string
): UseMutationResult<T, Error, { id: string | number; data: Record<string, any> }>
```

**Parameters:**
- `model` - Model name to update

**Mutation Function:**
- Accepts object with `id` and `data` properties
- `id` - Model ID to update
- `data` - Fields to update (partial update supported)

**Returns:**
- Updated model object
- Standard React Query mutation result

**Example:**
```typescript
function EditPostForm({ postId }) {
  const { data: post } = useModelShow('posts', postId);
  const updatePost = useModelUpdate('posts');

  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
    }
  }, [post]);

  const handleSubmit = (e) => {
    e.preventDefault();

    updatePost.mutate({
      id: postId,
      data: { title, content }
    }, {
      onSuccess: (updatedPost) => {
        alert('Post updated successfully!');
      },
      onError: (error) => {
        alert('Update failed: ' + error.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="submit" disabled={updatePost.isLoading}>
        {updatePost.isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

**API Request:**
```
PUT /api/:organization/posts/123
Body: { "title": "Updated Title", "content": "Updated content" }
```

**Cache Invalidation:**
- Invalidates `useModelShow` query for this specific model
- Invalidates `useModelIndex` queries to refresh lists
- Triggers automatic refetch

---

### useModelDelete()

Soft delete a model (moves to trash, can be restored).

**Import:**
```typescript
import { useModelDelete } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelDelete<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**Parameters:**
- `model` - Model name to delete

**Mutation Function:**
- Accepts model ID
- Performs soft delete (sets `deleted_at` timestamp)
- Model can be restored with `useModelRestore`

**Returns:**
- Deleted model object
- Standard React Query mutation result

**Example:**
```typescript
function DeletePostButton({ postId }) {
  const deletePost = useModelDelete('posts');

  const handleDelete = () => {
    if (confirm('Move this post to trash?')) {
      deletePost.mutate(postId, {
        onSuccess: () => {
          alert('Post moved to trash');
          // Model is soft-deleted, can be restored
        },
        onError: (error) => {
          alert('Delete failed: ' + error.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deletePost.isLoading}
    >
      {deletePost.isLoading ? 'Deleting...' : 'Delete Post'}
    </button>
  );
}
```

**API Request:**
```
DELETE /api/:organization/posts/123
```

**Cache Invalidation:**
- Removes model from `useModelIndex` queries
- Invalidates `useModelShow` query
- Model appears in `useModelTrashed` queries

---

## Soft Deletes

### useModelTrashed()

Fetch list of soft-deleted models that can be restored or permanently deleted.

**Import:**
```typescript
import { useModelTrashed } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelTrashed<T = any>(
  model: string,
  options?: ModelQueryOptions
): UseQueryResult<QueryResponse<T>>
```

**Parameters:**
- `model` - Model name
- `options` - Same as `useModelIndex` (filters, includes, sort, pagination, etc.)

**Returns:**
- `data.data` - Array of soft-deleted models
- `data.pagination` - Pagination metadata
- Each model includes `deleted_at` timestamp

**Example:**
```typescript
function TrashPage() {
  const { data: response, isLoading } = useModelTrashed('posts', {
    sort: '-deleted_at', // Most recently deleted first
    includes: ['author'],
    page: 1,
    perPage: 20
  });

  if (isLoading) return <div>Loading trash...</div>;

  const trashedPosts = response?.data || [];
  const pagination = response?.pagination;

  return (
    <div>
      <h2>Trash ({pagination?.total || 0} items)</h2>
      {trashedPosts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>Deleted: {post.deleted_at}</p>
          <p>Author: {post.author?.name}</p>
          <RestoreButton postId={post.id} />
          <ForceDeleteButton postId={post.id} />
        </div>
      ))}
    </div>
  );
}
```

**API Request:**
```
GET /api/:organization/posts/trashed?sort=-deleted_at&include=author&page=1&per_page=20
```

---

### useModelRestore()

Restore a soft-deleted model back to active state.

**Import:**
```typescript
import { useModelRestore } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelRestore<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**Parameters:**
- `model` - Model name to restore

**Mutation Function:**
- Accepts model ID
- Clears `deleted_at` timestamp
- Model returns to normal queries

**Returns:**
- Restored model object
- Standard React Query mutation result

**Example:**
```typescript
function RestoreButton({ postId }) {
  const restorePost = useModelRestore('posts');

  const handleRestore = () => {
    restorePost.mutate(postId, {
      onSuccess: (restoredPost) => {
        alert('Post restored successfully!');
        console.log('Restored:', restoredPost);
      },
      onError: (error) => {
        alert('Restore failed: ' + error.message);
      }
    });
  };

  return (
    <button
      onClick={handleRestore}
      disabled={restorePost.isLoading}
    >
      {restorePost.isLoading ? 'Restoring...' : 'Restore'}
    </button>
  );
}
```

**API Request:**
```
POST /api/:organization/posts/123/restore
```

**Cache Invalidation:**
- Removes from `useModelTrashed` queries
- Adds back to `useModelIndex` queries
- Triggers refetch of both

---

### useModelForceDelete()

Permanently delete a model (cannot be recovered).

**Import:**
```typescript
import { useModelForceDelete } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelForceDelete<T = any>(
  model: string
): UseMutationResult<T, Error, string | number>
```

**Parameters:**
- `model` - Model name to permanently delete

**Mutation Function:**
- Accepts model ID
- Permanently removes from database
- **Cannot be undone or restored**

**Returns:**
- Confirmation message
- Standard React Query mutation result

**Example:**
```typescript
function ForceDeleteButton({ postId }) {
  const forceDelete = useModelForceDelete('posts');

  const handleForceDelete = () => {
    if (confirm('PERMANENTLY delete this post? This cannot be undone!')) {
      forceDelete.mutate(postId, {
        onSuccess: () => {
          alert('Post permanently deleted');
        },
        onError: (error) => {
          alert('Delete failed: ' + error.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleForceDelete}
      disabled={forceDelete.isLoading}
      style={{ color: 'red' }}
    >
      {forceDelete.isLoading ? 'Deleting...' : 'Delete Forever'}
    </button>
  );
}
```

**API Request:**
```
DELETE /api/:organization/posts/123/force
```

**Cache Invalidation:**
- Removes from all queries permanently
- Invalidates `useModelTrashed` queries

---

## Advanced Operations

### useNestedOperations()

Execute multiple CRUD operations in a single atomic transaction with reference support.

**Import:**
```typescript
import { useNestedOperations } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useNestedOperations(): UseMutationResult<
  any,
  Error,
  {
    operations: NestedOperation[];
  }
>

interface NestedOperation {
  action: 'create' | 'update' | 'delete';
  model: string;
  id?: string | number; // Required for update/delete
  data?: Record<string, any>; // Required for create/update
}
```

**Parameters:**
- `operations` - Array of operations to execute in order

**Reference Syntax:**
Use `$index.field` to reference results from previous operations:
- `$0.id` - ID from first operation
- `$1.slug` - Slug from second operation
- `$N.field` - Any field from Nth operation

**Transaction Behavior:**
- All operations succeed or all fail (atomic)
- Operations execute in array order
- References resolved automatically
- Rollback on any error

**Returns:**
- Array of results from all operations
- Standard React Query mutation result

**Example:**
```typescript
function CreateBlogWithPosts() {
  const nestedOps = useNestedOperations();

  const handleCreateBlog = () => {
    nestedOps.mutate({
      operations: [
        {
          action: 'create',
          model: 'blogs',
          data: {
            title: 'My Tech Blog',
            description: 'A blog about technology',
            slug: 'tech-blog'
          }
        },
        {
          action: 'create',
          model: 'posts',
          data: {
            title: 'First Post',
            content: 'Welcome to my blog!',
            blog_id: '$0.id', // Reference blog ID from operation 0
            status: 'published'
          }
        },
        {
          action: 'create',
          model: 'posts',
          data: {
            title: 'Second Post',
            content: 'More content here',
            blog_id: '$0.id', // Reference same blog
            status: 'published'
          }
        },
        {
          action: 'update',
          model: 'blogs',
          id: '$0.id', // Reference blog ID
          data: {
            post_count: 2 // Update blog with post count
          }
        }
      ]
    }, {
      onSuccess: (results) => {
        console.log('All operations completed:', results);
        // results[0] = created blog
        // results[1] = first post
        // results[2] = second post
        // results[3] = updated blog
        alert(`Blog created with ${results.length} operations!`);
      },
      onError: (error) => {
        console.error('Transaction failed:', error);
        alert('Failed to create blog: ' + error.message);
      }
    });
  };

  return (
    <button
      onClick={handleCreateBlog}
      disabled={nestedOps.isLoading}
    >
      {nestedOps.isLoading ? 'Creating...' : 'Create Blog with Posts'}
    </button>
  );
}
```

**Complex Example (Update + Create + Delete):**
```typescript
function ComplexTransaction() {
  const nestedOps = useNestedOperations();

  const handleTransaction = () => {
    nestedOps.mutate({
      operations: [
        // Update user profile
        {
          action: 'update',
          model: 'users',
          id: 123,
          data: { bio: 'Updated bio' }
        },
        // Create new blog post
        {
          action: 'create',
          model: 'posts',
          data: {
            title: 'New Post',
            author_id: 123
          }
        },
        // Create comment on that new post
        {
          action: 'create',
          model: 'comments',
          data: {
            post_id: '$1.id', // Reference post from operation 1
            user_id: 123,
            content: 'First comment!'
          }
        },
        // Delete old draft
        {
          action: 'delete',
          model: 'posts',
          id: 456
        }
      ]
    });
  };

  return <button onClick={handleTransaction}>Execute Transaction</button>;
}
```

**API Request:**
```
POST /api/:organization/nested-operations
Body: {
  "operations": [
    { "action": "create", "model": "blogs", "data": {...} },
    { "action": "create", "model": "posts", "data": { "blog_id": "$0.id" } }
  ]
}
```

**Cache Invalidation:**
- Invalidates queries for all affected models
- Triggers refetch of related data

---

### useModelAudit()

Fetch audit trail for a specific model instance, showing all changes and who made them.

**Import:**
```typescript
import { useModelAudit } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useModelAudit<T = AuditLog>(
  model: string,
  id: string | number,
  options?: {
    page?: number;
    perPage?: number;
  }
): UseQueryResult<QueryResponse<T>>

interface AuditLog {
  id: number;
  action: string; // 'created', 'updated', 'deleted', etc.
  user_id: number;
  model_type: string;
  model_id: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}
```

**Parameters:**
- `model` - Model name (e.g., 'posts')
- `id` - Model ID to get audit trail for
- `options.page` - Page number for pagination
- `options.perPage` - Items per page

**Returns:**
- `data.data` - Array of audit log entries
- `data.pagination` - Pagination metadata
- Each entry shows action, user, old/new values, timestamp

**Example:**
```typescript
function PostAuditTrail({ postId }) {
  const { data: response, isLoading } = useModelAudit('posts', postId, {
    page: 1,
    perPage: 50
  });

  if (isLoading) return <div>Loading audit trail...</div>;

  const auditLogs = response?.data || [];

  return (
    <div>
      <h3>Change History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>User</th>
            <th>Changes</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.action}</td>
              <td>User #{log.user_id}</td>
              <td>
                {log.action === 'updated' && (
                  <div>
                    <strong>Before:</strong>
                    <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                    <strong>After:</strong>
                    <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                  </div>
                )}
                {log.action === 'created' && (
                  <div>
                    <strong>Created with:</strong>
                    <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                  </div>
                )}
                {log.action === 'deleted' && (
                  <div>
                    <strong>Deleted:</strong>
                    <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Use Cases:**
- Compliance and regulatory requirements
- Debugging data issues
- User activity tracking
- Rollback/undo functionality
- Data forensics

**API Request:**
```
GET /api/:organization/posts/123/audit?page=1&per_page=50
```

---

## Invitations

### useInvitations()

Fetch list of organization invitations with filtering and pagination.

**Import:**
```typescript
import { useInvitations } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useInvitations(
  options?: {
    status?: InvitationStatus;
    page?: number;
    perPage?: number;
  }
): UseQueryResult<QueryResponse<Invitation>>

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

interface Invitation {
  id: number;
  email: string;
  role_id: number;
  role?: { id: number; name: string };
  status: InvitationStatus;
  invited_by?: { id: number; name: string };
  expires_at: string;
  created_at: string;
  updated_at: string;
}
```

**Parameters:**
- `options.status` - Filter by invitation status
- `options.page` - Page number
- `options.perPage` - Items per page

**Returns:**
- `data.data` - Array of invitation objects
- `data.pagination` - Pagination metadata

**Example:**
```typescript
function InvitationsList() {
  const [status, setStatus] = useState<InvitationStatus>('pending');

  const { data: response, isLoading } = useInvitations({
    status,
    page: 1,
    perPage: 20
  });

  const invitations = response?.data || [];

  return (
    <div>
      <h2>Invitations</h2>

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="expired">Expired</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Invited By</th>
            <th>Expires</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(inv => (
            <tr key={inv.id}>
              <td>{inv.email}</td>
              <td>{inv.role?.name}</td>
              <td>{inv.invited_by?.name}</td>
              <td>{inv.expires_at}</td>
              <td>{inv.status}</td>
              <td>
                {inv.status === 'pending' && (
                  <>
                    <ResendButton invitationId={inv.id} />
                    <CancelButton invitationId={inv.id} />
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### useInviteUser()

Create a new organization invitation for a user.

**Import:**
```typescript
import { useInviteUser } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useInviteUser(): UseMutationResult<
  Invitation,
  Error,
  { email: string; role_id: number }
>
```

**Mutation Function:**
- `email` - Email address to invite
- `role_id` - Role to assign to user

**Returns:**
- Created invitation object
- Standard React Query mutation result

**Example:**
```typescript
function InviteUserForm() {
  const inviteUser = useInviteUser();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(2); // Default role

  const handleSubmit = (e) => {
    e.preventDefault();

    inviteUser.mutate({
      email,
      role_id: roleId
    }, {
      onSuccess: (invitation) => {
        alert(`Invitation sent to ${email}!`);
        console.log('Invitation:', invitation);
        setEmail('');
      },
      onError: (error) => {
        alert('Failed to send invitation: ' + error.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Invite New User</h3>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
        required
      />

      <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))}>
        <option value={1}>Admin</option>
        <option value={2}>Member</option>
        <option value={3}>Viewer</option>
      </select>

      <button type="submit" disabled={inviteUser.isLoading}>
        {inviteUser.isLoading ? 'Sending...' : 'Send Invitation'}
      </button>

      {inviteUser.error && (
        <div style={{color: 'red'}}>Error: {inviteUser.error.message}</div>
      )}
    </form>
  );
}
```

**API Request:**
```
POST /api/:organization/invitations
Body: { "email": "user@example.com", "role_id": 2 }
```

---

### useResendInvitation()

Resend an existing invitation email.

**Import:**
```typescript
import { useResendInvitation } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useResendInvitation(): UseMutationResult<
  Invitation,
  Error,
  number
>
```

**Mutation Function:**
- Accepts invitation ID
- Sends new invitation email with same details
- Updates expiration date

**Example:**
```typescript
function ResendButton({ invitationId }) {
  const resend = useResendInvitation();

  const handleResend = () => {
    resend.mutate(invitationId, {
      onSuccess: () => {
        alert('Invitation resent!');
      }
    });
  };

  return (
    <button onClick={handleResend} disabled={resend.isLoading}>
      {resend.isLoading ? 'Sending...' : 'Resend'}
    </button>
  );
}
```

---

### useCancelInvitation()

Cancel a pending invitation.

**Import:**
```typescript
import { useCancelInvitation } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useCancelInvitation(): UseMutationResult<
  Invitation,
  Error,
  number
>
```

**Mutation Function:**
- Accepts invitation ID
- Marks invitation as cancelled
- Prevents user from accepting

**Example:**
```typescript
function CancelButton({ invitationId }) {
  const cancel = useCancelInvitation();

  const handleCancel = () => {
    if (confirm('Cancel this invitation?')) {
      cancel.mutate(invitationId, {
        onSuccess: () => {
          alert('Invitation cancelled');
        }
      });
    }
  };

  return (
    <button onClick={handleCancel} disabled={cancel.isLoading}>
      Cancel
    </button>
  );
}
```

---

### useAcceptInvitation()

Accept an invitation and join the organization.

**Import:**
```typescript
import { useAcceptInvitation } from '@rhino-dev/rhino-react';
```

**Signature:**
```typescript
function useAcceptInvitation(): UseMutationResult<
  { user: User; organization: Organization },
  Error,
  { token: string; password?: string }
>
```

**Mutation Function:**
- `token` - Invitation token from email URL
- `password` - Optional password for new users

**Returns:**
- User object
- Organization object
- Standard React Query mutation result

**Example:**
```typescript
function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const accept = useAcceptInvitation();
  const [password, setPassword] = useState('');

  const handleAccept = () => {
    accept.mutate({
      token: token!,
      password
    }, {
      onSuccess: ({ user, organization }) => {
        alert(`Welcome to ${organization.name}!`);
        // Redirect to dashboard
      },
      onError: (error) => {
        alert('Failed to accept invitation: ' + error.message);
      }
    });
  };

  return (
    <div>
      <h2>Accept Invitation</h2>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create password"
      />

      <button onClick={handleAccept} disabled={accept.isLoading}>
        {accept.isLoading ? 'Joining...' : 'Accept & Join'}
      </button>
    </div>
  );
}
```

---

## Utilities

### extractPaginationFromHeaders()

Extract pagination metadata from Rhino backend API response headers.

**Import:**
```typescript
import { extractPaginationFromHeaders } from '@rhino-dev/rhino-react/lib';
```

**Signature:**
```typescript
function extractPaginationFromHeaders(
  response: AxiosResponse
): PaginationMeta | null

interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}
```

**Parameters:**
- `response` - Axios response object

**Returns:**
- Pagination metadata object or null if headers not present

**Headers Parsed:**
- `X-Current-Page` → `currentPage`
- `X-Last-Page` → `lastPage`
- `X-Per-Page` → `perPage`
- `X-Total` → `total`

**Example:**
```typescript
import { api, extractPaginationFromHeaders } from '@rhino-dev/rhino-react/lib';

async function fetchCustomData() {
  const response = await api.get('/api/acme/custom-endpoint');
  const pagination = extractPaginationFromHeaders(response);

  console.log('Page:', pagination?.currentPage);
  console.log('Total:', pagination?.total);

  return {
    data: response.data,
    pagination
  };
}
```

**Usage Notes:**
- Automatically used by `useModelIndex` and `useModelTrashed`
- Useful for custom API endpoints
- Returns null if pagination headers missing

---

### api

Configured Axios instance with authentication and organization interceptors.

**Import:**
```typescript
import { api } from '@rhino-dev/rhino-react/lib';
```

**Configuration:**
- Base URL from `VITE_API_URL` environment variable
- Credentials included (`withCredentials: true`)
- Default headers: Accept and Content-Type JSON
- X-Requested-With header for Laravel CSRF

**Interceptors:**
- **Request:** Adds Authorization Bearer token from localStorage
- **Request:** Adds X-Organization header from current context
- **Response:** Handles 401 errors (redirects to login)
- **Response:** Handles 403 errors (access denied)

**Example:**
```typescript
import { api } from '@rhino-dev/rhino-react/lib';

// Manual API call
async function customRequest() {
  try {
    const response = await api.get('/custom/endpoint');
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// POST request
async function createCustomResource(data) {
  const response = await api.post('/custom/resource', data);
  return response.data;
}

// With custom headers
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
```

**Configuration Override:**
```typescript
// In your app setup
import { api } from '@rhino-dev/rhino-react/lib';

api.defaults.baseURL = 'https://api.production.com';
api.defaults.timeout = 10000;

// Add custom interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      alert('Too many requests, please slow down');
    }
    return Promise.reject(error);
  }
);
```

---

### cn()

Utility function for conditional className merging (from clsx + tailwind-merge).

**Import:**
```typescript
import { cn } from '@rhino-dev/rhino-react/lib';
```

**Signature:**
```typescript
function cn(...inputs: ClassValue[]): string
```

**Parameters:**
- Accepts any number of className values (strings, objects, arrays)

**Returns:**
- Merged className string with Tailwind conflicts resolved

**Example:**
```typescript
import { cn } from '@rhino-dev/rhino-react/lib';

function Button({ variant, size, className, ...props }) {
  return (
    <button
      className={cn(
        // Base styles
        'rounded font-medium transition-colors',
        // Variant styles
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        // Size styles
        size === 'sm' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-6 py-3 text-lg',
        // Custom className override
        className
      )}
      {...props}
    />
  );
}

// Usage
<Button variant="primary" size="lg" className="mt-4">
  Click Me
</Button>
// Result: "rounded font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 text-lg mt-4"
```

**Tailwind Conflict Resolution:**
```typescript
// Tailwind classes that conflict are automatically resolved
cn('px-2 px-4') // → 'px-4' (later class wins)
cn('text-red-500 text-blue-500') // → 'text-blue-500'
cn('p-4', 'px-2') // → 'p-4 px-2' (px-2 overrides p-4's horizontal padding)
```

---

## TypeScript Types

All TypeScript type definitions are exported from the main package:

```typescript
import type {
  PaginationMeta,
  ModelQueryOptions,
  NestedOperation,
  AuditLog,
  LoginResult,
  QueryResponse,
  InvitationStatus,
  Invitation,
  Organization,
  User,
  Role
} from '@rhino-dev/rhino-react';
```

See [src/types/index.ts](../rhino-client/src/types/index.ts) for complete type definitions.

---

## Further Reading

- [Getting Started Guide](./getting-started.md) - Installation and setup
- [Feature Guides](./features/) - Detailed explanations of major features
- [Changelog](../CHANGELOG.md) - Version history and updates
- [GitHub Repository](https://github.com/yourusername/rhino-client) - Source code and issues
