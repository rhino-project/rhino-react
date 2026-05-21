# Nested Operations

Nested operations allow you to execute multiple CRUD operations in a single atomic transaction. This is useful for creating complex data structures, maintaining referential integrity, and ensuring all-or-nothing execution.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Reference Syntax](#reference-syntax)
- [Operation Types](#operation-types)
- [Transaction Behavior](#transaction-behavior)
- [Real-World Examples](#real-world-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

Nested operations solve the problem of creating or modifying multiple related records atomically. Instead of making separate API calls for each operation, you can batch them into a single transaction.

### Benefits

- **Atomic Transactions** - All operations succeed or all fail
- **Referential Integrity** - Reference IDs from previous operations
- **Performance** - Single API call instead of multiple
- **Consistency** - Ensure data consistency across models
- **Rollback** - Automatic rollback on any error

### Use Cases

- Creating a blog with initial posts
- Setting up a project with tasks and assignments
- Importing data with relationships
- Copying complex structures
- Batch updates with dependencies

---

## Basic Usage

```jsx
import { useNestedOperations } from '@rhino-project/rhino-react';

function CreateBlogWithPosts() {
  const nestedOps = useNestedOperations();

  const handleCreate = () => {
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
        }
      ]
    }, {
      onSuccess: (results) => {
        console.log('Blog created:', results[0]);
        console.log('Post created:', results[1]);
        alert('Blog and post created successfully!');
      },
      onError: (error) => {
        console.error('Transaction failed:', error);
        alert('Failed to create blog: ' + error.message);
      }
    });
  };

  return (
    <button
      onClick={handleCreate}
      disabled={nestedOps.isLoading}
    >
      {nestedOps.isLoading ? 'Creating...' : 'Create Blog with Posts'}
    </button>
  );
}
```

**API Request:**
```
POST /api/acme-corp/nested-operations
Content-Type: application/json

{
  "operations": [
    {
      "action": "create",
      "model": "blogs",
      "data": {
        "title": "My Tech Blog",
        "description": "A blog about technology",
        "slug": "tech-blog"
      }
    },
    {
      "action": "create",
      "model": "posts",
      "data": {
        "title": "First Post",
        "content": "Welcome to my blog!",
        "blog_id": "$0.id",
        "status": "published"
      }
    }
  ]
}
```

**Response:**
```json
[
  {
    "id": 42,
    "title": "My Tech Blog",
    "description": "A blog about technology",
    "slug": "tech-blog"
  },
  {
    "id": 123,
    "title": "First Post",
    "content": "Welcome to my blog!",
    "blog_id": 42,
    "status": "published"
  }
]
```

---

## Reference Syntax

Use `$index.field` to reference results from previous operations:

### Syntax

```
$0.id       // ID from operation 0 (first operation)
$1.id       // ID from operation 1 (second operation)
$N.field    // Any field from operation N
```

### Examples

```jsx
const operations = [
  // Operation 0: Create blog
  {
    action: 'create',
    model: 'blogs',
    data: { title: 'Blog', slug: 'my-blog' }
  },
  // Operation 1: Create post
  {
    action: 'create',
    model: 'posts',
    data: {
      title: 'Post',
      blog_id: '$0.id' // Reference blog ID
    }
  },
  // Operation 2: Create comment
  {
    action: 'create',
    model: 'comments',
    data: {
      post_id: '$1.id', // Reference post ID
      content: 'First comment!'
    }
  },
  // Operation 3: Update blog with post count
  {
    action: 'update',
    model: 'blogs',
    id: '$0.id', // Reference blog ID
    data: {
      post_count: 1
    }
  }
];
```

### Reference Any Field

You can reference any field from previous operations:

```jsx
const operations = [
  {
    action: 'create',
    model: 'blogs',
    data: { title: 'Blog', slug: 'my-blog' }
  },
  {
    action: 'create',
    model: 'seo_settings',
    data: {
      url_slug: '$0.slug', // Reference slug field
      title: '$0.title',   // Reference title field
      blog_id: '$0.id'     // Reference id field
    }
  }
];
```

---

## Operation Types

### Create Operation

```typescript
{
  action: 'create',
  model: string,
  data: Record<string, any>
}
```

**Example:**
```jsx
{
  action: 'create',
  model: 'posts',
  data: {
    title: 'New Post',
    content: 'Post content',
    status: 'draft'
  }
}
```

### Update Operation

```typescript
{
  action: 'update',
  model: string,
  id: string | number | string, // Can use reference like '$0.id'
  data: Record<string, any>
}
```

**Example:**
```jsx
{
  action: 'update',
  model: 'posts',
  id: 123,
  data: {
    title: 'Updated Title',
    status: 'published'
  }
}

// Or with reference
{
  action: 'update',
  model: 'blogs',
  id: '$0.id',
  data: {
    post_count: 5
  }
}
```

### Delete Operation

```typescript
{
  action: 'delete',
  model: string,
  id: string | number | string // Can use reference
}
```

**Example:**
```jsx
{
  action: 'delete',
  model: 'posts',
  id: 123
}

// Or with reference
{
  action: 'delete',
  model: 'old_comments',
  id: '$2.legacy_comment_id'
}
```

---

## Transaction Behavior

### Atomic Execution

All operations succeed together or fail together:

```jsx
const operations = [
  { action: 'create', model: 'blogs', data: { title: 'Blog' } },
  { action: 'create', model: 'posts', data: { /* invalid data */ } }, // Fails
  { action: 'create', model: 'comments', data: { content: 'Comment' } }
];

// If operation 1 fails:
// - Operation 0 is rolled back (blog deleted)
// - Operation 2 never executes
// - Database returns to original state
```

### Execution Order

Operations execute in array order:

```jsx
const operations = [
  // 1. This runs first
  { action: 'create', model: 'blogs', data: { title: 'Blog' } },

  // 2. This runs second (can reference operation 0)
  { action: 'create', model: 'posts', data: { blog_id: '$0.id' } },

  // 3. This runs third (can reference operations 0 and 1)
  { action: 'create', model: 'comments', data: { post_id: '$1.id' } }
];
```

### Cache Invalidation

After successful execution:

- All affected model queries are invalidated
- `useModelIndex` queries refetched
- `useModelShow` queries updated
- Related queries refreshed

---

## Real-World Examples

### Project Setup with Tasks

Create a project and multiple tasks in one transaction:

```jsx
function CreateProjectWizard({ projectData, tasks }) {
  const nestedOps = useNestedOperations();

  const handleSubmit = () => {
    const operations = [
      // Create project
      {
        action: 'create',
        model: 'projects',
        data: {
          name: projectData.name,
          description: projectData.description,
          start_date: projectData.startDate
        }
      },
      // Create tasks
      ...tasks.map(task => ({
        action: 'create',
        model: 'tasks',
        data: {
          title: task.title,
          description: task.description,
          project_id: '$0.id', // Reference project
          status: 'pending'
        }
      })),
      // Update project with task count
      {
        action: 'update',
        model: 'projects',
        id: '$0.id',
        data: {
          task_count: tasks.length
        }
      }
    ];

    nestedOps.mutate({ operations }, {
      onSuccess: (results) => {
        const project = results[0];
        alert(`Project "${project.name}" created with ${tasks.length} tasks!`);
        navigate(`/projects/${project.id}`);
      }
    });
  };

  return (
    <button onClick={handleSubmit} disabled={nestedOps.isLoading}>
      {nestedOps.isLoading ? 'Creating Project...' : 'Create Project & Tasks'}
    </button>
  );
}
```

### User Onboarding Flow

Set up a new user with profile, preferences, and initial data:

```jsx
function CompleteOnboarding({ userData }) {
  const nestedOps = useNestedOperations();

  const handleOnboarding = () => {
    nestedOps.mutate({
      operations: [
        // Create user
        {
          action: 'create',
          model: 'users',
          data: {
            name: userData.name,
            email: userData.email,
            password: userData.password
          }
        },
        // Create profile
        {
          action: 'create',
          model: 'profiles',
          data: {
            user_id: '$0.id',
            bio: userData.bio,
            avatar_url: userData.avatar,
            location: userData.location
          }
        },
        // Create preferences
        {
          action: 'create',
          model: 'user_preferences',
          data: {
            user_id: '$0.id',
            theme: 'light',
            notifications_enabled: true,
            language: 'en'
          }
        },
        // Create welcome notification
        {
          action: 'create',
          model: 'notifications',
          data: {
            user_id: '$0.id',
            title: 'Welcome!',
            message: 'Thanks for joining us!',
            type: 'welcome'
          }
        }
      ]
    }, {
      onSuccess: (results) => {
        const user = results[0];
        login(user);
        navigate('/dashboard');
      }
    });
  };

  return <button onClick={handleOnboarding}>Complete Onboarding</button>;
}
```

### Copy/Duplicate Complex Structure

Duplicate a blog with all its posts and comments:

```jsx
function DuplicateBlog({ originalBlogId }) {
  const { data: originalBlog } = useModelShow('blogs', originalBlogId, {
    includes: ['posts.comments']
  });

  const nestedOps = useNestedOperations();

  const handleDuplicate = () => {
    if (!originalBlog) return;

    const operations = [
      // Create new blog (copy)
      {
        action: 'create',
        model: 'blogs',
        data: {
          title: `${originalBlog.title} (Copy)`,
          description: originalBlog.description,
          slug: `${originalBlog.slug}-copy-${Date.now()}`
        }
      }
    ];

    // Add operations to copy each post
    originalBlog.posts?.forEach((post, postIndex) => {
      // Create post
      operations.push({
        action: 'create',
        model: 'posts',
        data: {
          title: post.title,
          content: post.content,
          blog_id: '$0.id', // Reference new blog
          status: 'draft' // Start as draft
        }
      });

      // Create comments for this post
      post.comments?.forEach(comment => {
        operations.push({
          action: 'create',
          model: 'comments',
          data: {
            content: comment.content,
            post_id: `$${operations.length - 1}.id`, // Reference newly created post
            user_id: comment.user_id
          }
        });
      });
    });

    nestedOps.mutate({ operations }, {
      onSuccess: (results) => {
        const newBlog = results[0];
        alert(`Blog duplicated! Created ${results.length - 1} new records.`);
        navigate(`/blogs/${newBlog.id}`);
      }
    });
  };

  return (
    <button onClick={handleDuplicate} disabled={nestedOps.isLoading}>
      {nestedOps.isLoading ? 'Duplicating...' : 'Duplicate Blog'}
    </button>
  );
}
```

### Batch Import with Relationships

Import CSV data with relationships:

```jsx
function ImportData({ csvData }) {
  const nestedOps = useNestedOperations();

  const handleImport = () => {
    const operations = [];

    csvData.forEach((row, index) => {
      // Create company
      operations.push({
        action: 'create',
        model: 'companies',
        data: {
          name: row.companyName,
          industry: row.industry
        }
      });

      // Create contact for this company
      operations.push({
        action: 'create',
        model: 'contacts',
        data: {
          name: row.contactName,
          email: row.email,
          company_id: `$${operations.length - 1}.id` // Reference company
        }
      });
    });

    nestedOps.mutate({ operations }, {
      onSuccess: (results) => {
        const companyCount = results.filter((_, i) => i % 2 === 0).length;
        alert(`Imported ${companyCount} companies with contacts!`);
      }
    });
  };

  return (
    <button onClick={handleImport} disabled={nestedOps.isLoading}>
      Import {csvData.length} Rows
    </button>
  );
}
```

### Reorganize Data Structure

Move posts from one blog to another and update counts:

```jsx
function MovePosts({ postIds, fromBlogId, toBlogId }) {
  const nestedOps = useNestedOperations();

  const handleMove = () => {
    const operations = [
      // Update all posts to new blog
      ...postIds.map(postId => ({
        action: 'update',
        model: 'posts',
        id: postId,
        data: {
          blog_id: toBlogId
        }
      })),
      // Decrement old blog post count
      {
        action: 'update',
        model: 'blogs',
        id: fromBlogId,
        data: {
          post_count: /* calculate */ 0
        }
      },
      // Increment new blog post count
      {
        action: 'update',
        model: 'blogs',
        id: toBlogId,
        data: {
          post_count: /* calculate */ 0
        }
      }
    ];

    nestedOps.mutate({ operations }, {
      onSuccess: () => {
        alert(`Moved ${postIds.length} posts successfully!`);
      }
    });
  };

  return <button onClick={handleMove}>Move {postIds.length} Posts</button>;
}
```

---

## Error Handling

### Handling Transaction Failures

```jsx
function CreateWithErrorHandling() {
  const nestedOps = useNestedOperations();
  const [error, setError] = useState(null);

  const handleCreate = () => {
    setError(null);

    nestedOps.mutate({
      operations: [
        { action: 'create', model: 'blogs', data: { title: 'Blog' } },
        { action: 'create', model: 'posts', data: { blog_id: '$0.id' } }
      ]
    }, {
      onError: (err) => {
        console.error('Transaction failed:', err);

        // Parse error to find which operation failed
        if (err.response?.data?.failed_operation) {
          const failedOp = err.response.data.failed_operation;
          setError(`Operation ${failedOp} failed: ${err.message}`);
        } else {
          setError('Transaction failed: ' + err.message);
        }
      },
      onSuccess: () => {
        setError(null);
        alert('Success!');
      }
    });
  };

  return (
    <div>
      <button onClick={handleCreate}>Create</button>
      {error && <div className="error">{error}</div>}
      {nestedOps.isLoading && <div>Processing transaction...</div>}
    </div>
  );
}
```

### Validation Before Submission

```jsx
function ValidatedNestedOperation({ data }) {
  const nestedOps = useNestedOperations();

  const validateOperations = (ops) => {
    // Check for circular references
    for (let i = 0; i < ops.length; i++) {
      const references = JSON.stringify(ops[i]).match(/\$(\d+)\./g);
      if (references) {
        references.forEach(ref => {
          const refIndex = parseInt(ref.match(/\d+/)[0]);
          if (refIndex >= i) {
            throw new Error(`Invalid forward reference: $${refIndex} in operation ${i}`);
          }
        });
      }
    }

    return true;
  };

  const handleSubmit = () => {
    try {
      const operations = buildOperations(data);
      validateOperations(operations);

      nestedOps.mutate({ operations });
    } catch (error) {
      alert('Validation error: ' + error.message);
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

---

## Best Practices

### 1. Keep Transactions Small

```jsx
// ✅ Good - focused transaction
const operations = [
  { action: 'create', model: 'blogs', data: {...} },
  { action: 'create', model: 'posts', data: {...} }
];

// ❌ Bad - too many operations
const operations = [
  ...100 create operations // May timeout or fail
];
```

### 2. Use Meaningful Variable Names

```jsx
// ✅ Good - clear what each operation does
const createBlogOperation = {
  action: 'create',
  model: 'blogs',
  data: blogData
};

const createPostOperation = {
  action: 'create',
  model: 'posts',
  data: {
    ...postData,
    blog_id: '$0.id'
  }
};

const operations = [createBlogOperation, createPostOperation];
```

### 3. Document Reference Indices

```jsx
const operations = [
  // Operation 0: Create blog
  { action: 'create', model: 'blogs', data: {...} },

  // Operation 1: Create first post (references operation 0)
  { action: 'create', model: 'posts', data: { blog_id: '$0.id' } },

  // Operation 2: Create second post (references operation 0)
  { action: 'create', model: 'posts', data: { blog_id: '$0.id' } },

  // Operation 3: Update blog count (references operation 0)
  { action: 'update', model: 'blogs', id: '$0.id', data: { post_count: 2 } }
];
```

### 4. Handle Loading States

```jsx
<button onClick={handleCreate} disabled={nestedOps.isLoading}>
  {nestedOps.isLoading ? (
    <>
      <Spinner />
      Processing {operations.length} operations...
    </>
  ) : (
    'Create'
  )}
</button>
```

### 5. Show Progress for Large Transactions

```jsx
// For very large operations, consider splitting into multiple transactions
// and showing progress

const batches = chunk(allOperations, 10); // 10 operations per batch

for (const batch of batches) {
  await nestedOps.mutateAsync({ operations: batch });
  setProgress((prev) => prev + batch.length);
}
```

### 6. Test Transaction Rollback

```jsx
// Test that failures properly rollback
const testRollback = async () => {
  try {
    await nestedOps.mutateAsync({
      operations: [
        { action: 'create', model: 'blogs', data: {...} },
        { action: 'create', model: 'invalid_model', data: {...} } // This will fail
      ]
    });
  } catch (error) {
    // Verify blog was not created (rolled back)
    const blogs = await fetchBlogs();
    expect(blogs).not.toContainBlog(newBlog);
  }
};
```

---

## Related Documentation

- [API Reference - useNestedOperations](../API.md#usenestedoperations)
- [Getting Started](../getting-started.md)
- [Best Practices](../getting-started.md#best-practices)
