# Soft Deletes

Soft delete operations allow you to "delete" records without permanently removing them from the database. Deleted records can be viewed, restored, or permanently deleted later.

## Table of Contents

- [Overview](#overview)
- [Available Operations](#available-operations)
- [Soft Delete (Trash)](#soft-delete-trash)
- [View Trashed Items](#view-trashed-items)
- [Restore from Trash](#restore-from-trash)
- [Force Delete (Permanent)](#force-delete-permanent)
- [Complete Trash Management UI](#complete-trash-management-ui)
- [Best Practices](#best-practices)

---

## Overview

Soft deletes provide a safety net by marking records as deleted without removing them from the database. This is useful for:

- **Undo functionality** - Users can recover accidentally deleted items
- **Audit trails** - Keep history of deleted records
- **Compliance** - Retain data for regulatory requirements
- **Data recovery** - Restore data if needed

### How It Works

When you soft delete a record:
1. Record's `deleted_at` timestamp is set
2. Record no longer appears in normal queries
3. Record can be viewed in "trashed" queries
4. Record can be restored (clears `deleted_at`)
5. Record can be force deleted (permanently removed)

---

## Available Operations

@rhino-project/rhino-react provides three hooks for soft delete management:

| Hook | Purpose |
|------|---------|
| `useModelDelete` | Soft delete (move to trash) |
| `useModelTrashed` | Fetch trashed items |
| `useModelRestore` | Restore from trash |
| `useModelForceDelete` | Permanently delete |

---

## Soft Delete (Trash)

Use `useModelDelete` to soft delete a record:

### Basic Usage

```jsx
import { useModelDelete } from '@rhino-project/rhino-react';

function DeletePostButton({ postId }) {
  const deletePost = useModelDelete('posts');

  const handleDelete = () => {
    if (confirm('Move this post to trash?')) {
      deletePost.mutate(postId, {
        onSuccess: () => {
          alert('Post moved to trash');
        },
        onError: (error) => {
          alert('Failed to delete: ' + error.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deletePost.isLoading}
      className="btn-danger"
    >
      {deletePost.isLoading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### With Loading State

```jsx
function DeleteButton({ itemId, model, onDeleted }) {
  const deleteMutation = useModelDelete(model);

  const handleDelete = () => {
    deleteMutation.mutate(itemId, {
      onSuccess: (data) => {
        console.log('Deleted:', data);
        onDeleted?.(itemId);
      }
    });
  };

  return (
    <button onClick={handleDelete} disabled={deleteMutation.isLoading}>
      {deleteMutation.isLoading ? (
        <>
          <Spinner /> Deleting...
        </>
      ) : (
        <>
          <TrashIcon /> Delete
        </>
      )}
    </button>
  );
}
```

### API Request

```
DELETE /api/acme-corp/posts/123
```

### What Happens

- Record's `deleted_at` field is set to current timestamp
- Record removed from `useModelIndex` queries
- Record appears in `useModelTrashed` queries
- Cache automatically invalidated and refetched

---

## View Trashed Items

Use `useModelTrashed` to fetch soft-deleted records:

### Basic Usage

```jsx
import { useModelTrashed } from '@rhino-project/rhino-react';

function TrashPage() {
  const { data: response, isLoading, error } = useModelTrashed('posts', {
    sort: '-deleted_at', // Most recently deleted first
    page: 1,
    perPage: 20
  });

  if (isLoading) return <div>Loading trash...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const trashedPosts = response?.data || [];
  const pagination = response?.pagination;

  if (trashedPosts.length === 0) {
    return <div>Trash is empty</div>;
  }

  return (
    <div>
      <h1>Trash ({pagination?.total} items)</h1>

      <div className="trashed-items">
        {trashedPosts.map(post => (
          <div key={post.id} className="trashed-item">
            <h3>{post.title}</h3>
            <p>Deleted: {new Date(post.deleted_at).toLocaleString()}</p>

            <div className="actions">
              <RestoreButton postId={post.id} />
              <ForceDeleteButton postId={post.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### With Includes

Fetch trashed items with relationships:

```jsx
const { data: response } = useModelTrashed('posts', {
  includes: ['author', 'blog'],
  sort: '-deleted_at'
});

const posts = response?.data || [];

posts.map(post => (
  <div key={post.id}>
    <h3>{post.title}</h3>
    <p>By: {post.author?.name}</p>
    <p>Blog: {post.blog?.title}</p>
    <p>Deleted: {post.deleted_at}</p>
  </div>
));
```

### With Filters

Filter trashed items:

```jsx
const [dateFilter, setDateFilter] = useState('week');

const getDateFilter = () => {
  const now = new Date();
  if (dateFilter === 'today') {
    return now.toISOString().split('T')[0];
  }
  if (dateFilter === 'week') {
    const weekAgo = new Date(now.setDate(now.getDate() - 7));
    return weekAgo.toISOString().split('T')[0];
  }
  return null;
};

const { data: response } = useModelTrashed('posts', {
  filters: {
    deleted_after: getDateFilter()
  },
  sort: '-deleted_at'
});
```

### API Request

```
GET /api/acme-corp/posts/trashed?sort=-deleted_at&include=author&page=1&per_page=20
```

---

## Restore from Trash

Use `useModelRestore` to recover a soft-deleted record:

### Basic Usage

```jsx
import { useModelRestore } from '@rhino-project/rhino-react';

function RestoreButton({ postId }) {
  const restorePost = useModelRestore('posts');

  const handleRestore = () => {
    restorePost.mutate(postId, {
      onSuccess: (restoredPost) => {
        alert('Post restored successfully!');
        console.log('Restored:', restoredPost);
      },
      onError: (error) => {
        alert('Failed to restore: ' + error.message);
      }
    });
  };

  return (
    <button
      onClick={handleRestore}
      disabled={restorePost.isLoading}
      className="btn-success"
    >
      {restorePost.isLoading ? 'Restoring...' : 'Restore'}
    </button>
  );
}
```

### Bulk Restore

Restore multiple items at once:

```jsx
function BulkRestore({ selectedIds, model }) {
  const restore = useModelRestore(model);
  const [restoring, setRestoring] = useState(false);

  const handleBulkRestore = async () => {
    setRestoring(true);

    try {
      for (const id of selectedIds) {
        await restore.mutateAsync(id);
      }
      alert(`Restored ${selectedIds.length} items`);
    } catch (error) {
      alert('Some items failed to restore');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <button
      onClick={handleBulkRestore}
      disabled={restoring || selectedIds.length === 0}
    >
      {restoring ? 'Restoring...' : `Restore ${selectedIds.length} items`}
    </button>
  );
}
```

### API Request

```
POST /api/acme-corp/posts/123/restore
```

### What Happens

- `deleted_at` field cleared (set to null)
- Record removed from `useModelTrashed` queries
- Record appears in normal `useModelIndex` queries
- Cache automatically invalidated

---

## Force Delete (Permanent)

Use `useModelForceDelete` to permanently remove a record from the database:

⚠️ **Warning**: Force delete is permanent and cannot be undone!

### Basic Usage

```jsx
import { useModelForceDelete } from '@rhino-project/rhino-react';

function ForceDeleteButton({ postId }) {
  const forceDelete = useModelForceDelete('posts');

  const handleForceDelete = () => {
    const confirmed = confirm(
      'PERMANENTLY delete this post? This action cannot be undone!'
    );

    if (confirmed) {
      forceDelete.mutate(postId, {
        onSuccess: () => {
          alert('Post permanently deleted');
        },
        onError: (error) => {
          alert('Failed to delete: ' + error.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleForceDelete}
      disabled={forceDelete.isLoading}
      className="btn-danger-permanent"
      style={{ backgroundColor: 'darkred', color: 'white' }}
    >
      {forceDelete.isLoading ? 'Deleting...' : 'Delete Forever'}
    </button>
  );
}
```

### With Double Confirmation

```jsx
function SafeForceDeleteButton({ postId, postTitle }) {
  const [confirmText, setConfirmText] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const forceDelete = useModelForceDelete('posts');

  const handleForceDelete = () => {
    if (confirmText === postTitle) {
      forceDelete.mutate(postId, {
        onSuccess: () => {
          setShowDialog(false);
          alert('Post permanently deleted');
        }
      });
    }
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Delete Forever
      </button>

      {showDialog && (
        <div className="modal">
          <h2>Permanently Delete?</h2>
          <p>This action cannot be undone!</p>
          <p>Type "{postTitle}" to confirm:</p>

          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type post title"
          />

          <div className="actions">
            <button onClick={() => setShowDialog(false)}>
              Cancel
            </button>
            <button
              onClick={handleForceDelete}
              disabled={confirmText !== postTitle || forceDelete.isLoading}
            >
              {forceDelete.isLoading ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

### API Request

```
DELETE /api/acme-corp/posts/123/force
```

### What Happens

- Record permanently removed from database
- Removed from all queries (normal and trashed)
- **Cannot be recovered**

---

## Complete Trash Management UI

### Full-Featured Trash Page

```jsx
import { useState } from 'react';
import {
  useModelTrashed,
  useModelRestore,
  useModelForceDelete
} from '@rhino-project/rhino-react';

function TrashManager({ model = 'posts' }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  // Fetch trashed items
  const { data: response, isLoading, refetch } = useModelTrashed(model, {
    page,
    perPage: 20,
    sort: '-deleted_at',
    includes: ['author']
  });

  const restore = useModelRestore(model);
  const forceDelete = useModelForceDelete(model);

  const items = response?.data || [];
  const pagination = response?.pagination;

  // Single item actions
  const handleRestore = (id) => {
    restore.mutate(id, {
      onSuccess: () => {
        refetch();
        alert('Item restored');
      }
    });
  };

  const handleForceDelete = (id) => {
    if (confirm('Permanently delete this item?')) {
      forceDelete.mutate(id, {
        onSuccess: () => {
          refetch();
          alert('Item permanently deleted');
        }
      });
    }
  };

  // Bulk actions
  const handleBulkRestore = async () => {
    for (const id of selected) {
      await restore.mutateAsync(id);
    }
    setSelected([]);
    refetch();
  };

  const handleBulkDelete = async () => {
    if (confirm(`Permanently delete ${selected.length} items?`)) {
      for (const id of selected) {
        await forceDelete.mutateAsync(id);
      }
      setSelected([]);
      refetch();
    }
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    if (confirm('Permanently delete ALL items in trash?')) {
      for (const item of items) {
        await forceDelete.mutateAsync(item.id);
      }
      refetch();
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelected(
      selected.length === items.length
        ? []
        : items.map(item => item.id)
    );
  };

  if (isLoading) {
    return <div>Loading trash...</div>;
  }

  return (
    <div className="trash-manager">
      <div className="header">
        <h1>Trash ({pagination?.total || 0} items)</h1>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="bulk-actions">
            <span>{selected.length} selected</span>
            <button onClick={handleBulkRestore}>
              Restore Selected
            </button>
            <button onClick={handleBulkDelete} className="danger">
              Delete Selected Forever
            </button>
          </div>
        )}

        {/* Empty trash */}
        {items.length > 0 && (
          <button onClick={handleEmptyTrash} className="danger">
            Empty Trash
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Trash is empty</p>
        </div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selected.length === items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Title</th>
                <th>Author</th>
                <th>Deleted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td>{item.title}</td>
                  <td>{item.author?.name}</td>
                  <td>{new Date(item.deleted_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleRestore(item.id)}
                      disabled={restore.isLoading}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleForceDelete(item.id)}
                      disabled={forceDelete.isLoading}
                      className="danger"
                    >
                      Delete Forever
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.lastPage > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {pagination.lastPage}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.lastPage}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Always Confirm Before Deleting

```jsx
const handleDelete = () => {
  if (confirm('Move to trash?')) {
    deletePost.mutate(postId);
  }
};
```

### 2. Use Double Confirmation for Force Delete

```jsx
const handleForceDelete = () => {
  const firstConfirm = confirm('Permanently delete?');
  if (firstConfirm) {
    const secondConfirm = confirm('Are you absolutely sure? This cannot be undone!');
    if (secondConfirm) {
      forceDelete.mutate(postId);
    }
  }
};
```

### 3. Show Deleted Timestamp

Always display when an item was deleted:

```jsx
<p>Deleted: {new Date(item.deleted_at).toLocaleString()}</p>
```

### 4. Provide Visual Distinction

Make trashed items visually distinct:

```css
.trashed-item {
  opacity: 0.7;
  background-color: #f5f5f5;
  border-left: 3px solid #999;
}
```

### 5. Implement Auto-Cleanup

Consider automatically force-deleting items after a certain period:

```jsx
// In your Laravel backend
// Delete items trashed more than 30 days ago
Post::onlyTrashed()
  ->where('deleted_at', '<', now()->subDays(30))
  ->forceDelete();
```

### 6. Add Restore Notifications

```jsx
const handleRestore = (id) => {
  restore.mutate(id, {
    onSuccess: (restoredItem) => {
      toast.success(`"${restoredItem.title}" has been restored`);
    }
  });
};
```

### 7. Handle Bulk Operations Carefully

Show progress for bulk operations:

```jsx
const [progress, setProgress] = useState(0);

const handleBulkRestore = async () => {
  for (let i = 0; i < selected.length; i++) {
    await restore.mutateAsync(selected[i]);
    setProgress(Math.round(((i + 1) / selected.length) * 100));
  }
  setProgress(0);
};
```

---

## Related Documentation

- [API Reference - useModelDelete](../API.md#usemodeldelete)
- [API Reference - useModelTrashed](../API.md#usemodeltrashed)
- [API Reference - useModelRestore](../API.md#usemodelrestore)
- [API Reference - useModelForceDelete](../API.md#usemodelforcedelete)
- [Getting Started](../getting-started.md)
