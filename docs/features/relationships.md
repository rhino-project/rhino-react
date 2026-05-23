# Eager Loading Relationships

@rhino-dev/rhino-react supports eager loading of backend relationships through the `includes` parameter. This allows you to fetch related data in a single request, avoiding the N+1 query problem.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Single Relationships](#single-relationships)
- [Multiple Relationships](#multiple-relationships)
- [Nested Relationships](#nested-relationships)
- [Polymorphic Relationships](#polymorphic-relationships)
- [Performance Optimization](#performance-optimization)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

---

## Basic Usage

Use the `includes` parameter to eager load relationships:

```jsx
import { useModelIndex, useModelShow } from '@rhino-dev/rhino-react';

// Fetch posts with author
const { data: response } = useModelIndex('posts', {
  includes: ['author']
});

const posts = response?.data || [];

posts.map(post => (
  <div key={post.id}>
    <h2>{post.title}</h2>
    <p>By: {post.author?.name}</p> {/* Author is included */}
  </div>
));
```

**API Request:**
```
GET /api/acme-corp/posts?include=author
```

**Without Eager Loading (N+1 Problem):**
```
GET /api/posts          // 1 query
GET /api/users/1        // N queries (one per post)
GET /api/users/2
GET /api/users/3
...
```

**With Eager Loading:**
```
GET /api/posts?include=author  // 2 queries total (posts + authors)
```

---

## Single Relationships

### Belongs To (One-to-One)

Fetch a model with its parent:

```jsx
// Post belongs to Author
function PostDetail({ postId }) {
  const { data: post } = useModelShow('posts', postId, {
    includes: ['author']
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <p>Written by: {post.author?.name}</p>
      <p>Email: {post.author?.email}</p>
    </article>
  );
}
```

### Has One

Fetch a model with its single related record:

```jsx
// User has one Profile
function UserProfile({ userId }) {
  const { data: user } = useModelShow('users', userId, {
    includes: ['profile']
  });

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Bio: {user.profile?.bio}</p>
      <p>Location: {user.profile?.location}</p>
    </div>
  );
}
```

---

## Multiple Relationships

Include multiple relationships in a single request:

```jsx
function PostWithRelations({ postId }) {
  const { data: post } = useModelShow('posts', postId, {
    includes: ['author', 'comments', 'tags', 'category']
  });

  return (
    <article>
      {/* Author (belongs to) */}
      <p>By: {post.author?.name}</p>

      {/* Category (belongs to) */}
      <p>Category: {post.category?.name}</p>

      {/* Tags (many-to-many) */}
      <div className="tags">
        {post.tags?.map(tag => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>

      {/* Comments (has many) */}
      <div className="comments">
        <h3>Comments ({post.comments?.length})</h3>
        {post.comments?.map(comment => (
          <div key={comment.id}>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
```

**API Request:**
```
GET /api/acme-corp/posts/123?include=author,comments,tags,category
```

---

## Nested Relationships

Load relationships of relationships using dot notation:

### Basic Nested Loading

```jsx
// Load posts with authors and their profiles
const { data: response } = useModelIndex('posts', {
  includes: ['author.profile']
});

const posts = response?.data || [];

posts.map(post => (
  <div key={post.id}>
    <h2>{post.title}</h2>
    <p>By: {post.author?.name}</p>
    <p>Bio: {post.author?.profile?.bio}</p>
    <img src={post.author?.profile?.avatar_url} alt="Avatar" />
  </div>
));
```

**API Request:**
```
GET /api/acme-corp/posts?include=author.profile
```

### Multiple Nested Levels

```jsx
// Posts -> Comments -> User -> Profile
const { data: response } = useModelIndex('posts', {
  includes: [
    'author.profile',
    'comments.user.profile',
    'category.parent'
  ]
});

const posts = response?.data || [];

posts.map(post => (
  <div key={post.id}>
    <h2>{post.title}</h2>

    {/* Post author with profile */}
    <div className="author">
      <img src={post.author?.profile?.avatar_url} />
      <span>{post.author?.name}</span>
    </div>

    {/* Category with parent */}
    <p>
      {post.category?.parent?.name} → {post.category?.name}
    </p>

    {/* Comments with user profiles */}
    {post.comments?.map(comment => (
      <div key={comment.id}>
        <img src={comment.user?.profile?.avatar_url} />
        <strong>{comment.user?.name}</strong>
        <p>{comment.content}</p>
      </div>
    ))}
  </div>
));
```

### Deep Nesting Example

```jsx
// Blog -> Posts -> Comments -> User -> Profile
function BlogDetail({ blogId }) {
  const { data: blog } = useModelShow('blogs', blogId, {
    includes: [
      'posts.author',
      'posts.comments.user.profile',
      'posts.tags',
      'owner.profile'
    ]
  });

  return (
    <div>
      <h1>{blog.title}</h1>
      <p>Owner: {blog.owner?.name}</p>

      {blog.posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By: {post.author?.name}</p>

          <div className="tags">
            {post.tags?.map(tag => <span key={tag.id}>{tag.name}</span>)}
          </div>

          <div className="comments">
            {post.comments?.map(comment => (
              <div key={comment.id}>
                <img src={comment.user?.profile?.avatar_url} />
                <p>{comment.user?.name}: {comment.content}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
```

---

## Polymorphic Relationships

Load polymorphic relationships (relationships that can belong to multiple model types):

### Polymorphic Belongs To

```jsx
// Comment can belong to Post or Video
function Comment({ commentId }) {
  const { data: comment } = useModelShow('comments', commentId, {
    includes: ['commentable'] // Polymorphic relationship
  });

  return (
    <div>
      <p>{comment.content}</p>

      {/* commentable could be Post or Video */}
      {comment.commentable_type === 'Post' && (
        <p>On post: {comment.commentable?.title}</p>
      )}

      {comment.commentable_type === 'Video' && (
        <p>On video: {comment.commentable?.title}</p>
      )}
    </div>
  );
}
```

### Polymorphic Has Many

```jsx
// Post has many Comments (polymorphic)
function PostWithComments({ postId }) {
  const { data: post } = useModelShow('posts', postId, {
    includes: ['comments.user']
  });

  return (
    <article>
      <h1>{post.title}</h1>

      <div className="comments">
        {post.comments?.map(comment => (
          <div key={comment.id}>
            <strong>{comment.user?.name}</strong>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
```

---

## Performance Optimization

### Combine with Field Selection

Reduce payload size by selecting specific fields:

```jsx
const { data: response } = useModelIndex('posts', {
  includes: ['author', 'comments'],
  fields: ['id', 'title', 'excerpt', 'author_id'] // Only fetch needed fields
});
```

**Note:** Field selection for included relationships depends on backend implementation.

### Limit Relationship Data

If your backend supports it, limit the number of related records:

```jsx
// Backend should support limiting relationships
const { data: post } = useModelShow('posts', postId, {
  includes: ['comments'] // Backend limits to recent 10 comments
});
```

### Conditional Loading

Only load relationships when needed:

```jsx
function PostListItem({ post, showDetails }) {
  const includes = showDetails
    ? ['author', 'comments', 'tags']
    : ['author']; // Minimal for list view

  const { data: fullPost } = useModelShow('posts', post.id, {
    includes,
    enabled: showDetails // Only fetch when expanded
  });

  return (
    <div>
      <h3>{post.title}</h3>
      <p>By: {post.author?.name}</p>

      {showDetails && fullPost && (
        <div>
          <div className="tags">
            {fullPost.tags?.map(tag => <span key={tag.id}>{tag.name}</span>)}
          </div>
          <div className="comments">
            {fullPost.comments?.map(comment => (
              <p key={comment.id}>{comment.content}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Common Patterns

### Master-Detail View

```jsx
function PostsWithSidebar() {
  const [selectedId, setSelectedId] = useState(null);

  // List view - minimal data
  const { data: listResponse } = useModelIndex('posts', {
    fields: ['id', 'title'],
    perPage: 50
  });

  // Detail view - full data with relationships
  const { data: selectedPost } = useModelShow('posts', selectedId, {
    includes: ['author.profile', 'comments.user', 'tags'],
    enabled: !!selectedId
  });

  return (
    <div className="layout">
      {/* Sidebar - list */}
      <div className="sidebar">
        {listResponse?.data?.map(post => (
          <div
            key={post.id}
            onClick={() => setSelectedId(post.id)}
            className={selectedId === post.id ? 'active' : ''}
          >
            {post.title}
          </div>
        ))}
      </div>

      {/* Main - detail */}
      <div className="main">
        {selectedPost && (
          <article>
            <h1>{selectedPost.title}</h1>
            <p>By: {selectedPost.author?.name}</p>
            <div>{selectedPost.content}</div>

            {/* Comments */}
            <div className="comments">
              {selectedPost.comments?.map(comment => (
                <div key={comment.id}>
                  <strong>{comment.user?.name}:</strong>
                  <p>{comment.content}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="tags">
              {selectedPost.tags?.map(tag => (
                <span key={tag.id}>{tag.name}</span>
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
```

### Prefetch Related Data

Prefetch relationships when user hovers:

```jsx
import { useQueryClient } from '@tanstack/react-query';

function PostCard({ post }) {
  const queryClient = useQueryClient();

  const prefetchDetails = () => {
    queryClient.prefetchQuery({
      queryKey: ['posts', post.id, { includes: ['author', 'comments'] }],
      queryFn: () => fetchPost(post.id, { includes: ['author', 'comments'] })
    });
  };

  return (
    <div
      onMouseEnter={prefetchDetails}
      onClick={() => navigate(`/posts/${post.id}`)}
    >
      <h3>{post.title}</h3>
    </div>
  );
}
```

### Dynamic Relationship Loading

Load relationships based on user permissions or preferences:

```jsx
function UserContent({ userId, currentUser }) {
  const includes = ['posts'];

  // Add private data if viewing own profile
  if (userId === currentUser.id) {
    includes.push('drafts', 'private_messages');
  }

  // Add admin data if user is admin
  if (currentUser.role === 'admin') {
    includes.push('audit_logs', 'reports');
  }

  const { data: user } = useModelShow('users', userId, { includes });

  return (
    <div>
      <h2>{user.name}</h2>

      {/* Public posts */}
      <div className="posts">
        {user.posts?.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {/* Private data (if own profile) */}
      {userId === currentUser.id && (
        <div className="drafts">
          {user.drafts?.map(draft => <DraftCard key={draft.id} draft={draft} />)}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Load Only What You Need

Don't over-fetch relationships:

```jsx
// ❌ Bad - loading unnecessary data
const { data } = useModelIndex('posts', {
  includes: ['author', 'comments', 'tags', 'category', 'media']
});

// ✅ Good - minimal for this view
const { data } = useModelIndex('posts', {
  includes: ['author'] // Only what's displayed
});
```

### 2. Use Nested Loading for Deep Structures

```jsx
// ❌ Bad - multiple requests
const { data: post } = useModelShow('posts', id);
const { data: author } = useModelShow('users', post.author_id);
const { data: profile } = useModelShow('profiles', author.profile_id);

// ✅ Good - single request
const { data: post } = useModelShow('posts', id, {
  includes: ['author.profile']
});
```

### 3. Cache Relationship Data

React Query automatically caches included data:

```jsx
const { data: post } = useModelShow('posts', id, {
  includes: ['author'],
  staleTime: 1000 * 60 * 5 // Cache for 5 minutes
});
```

### 4. Handle Missing Relationships

Always use optional chaining:

```jsx
// ✅ Safe
<p>Author: {post.author?.name || 'Unknown'}</p>

// ❌ Crashes if author is null
<p>Author: {post.author.name}</p>
```

### 5. Document Required Relationships

```jsx
/**
 * PostDetail component
 *
 * Required includes: ['author', 'comments.user']
 */
function PostDetail({ postId }) {
  const { data: post } = useModelShow('posts', postId, {
    includes: ['author', 'comments.user']
  });

  // Component implementation...
}
```

### 6. Optimize List + Detail Views

```jsx
// List view - no relationships
const { data: posts } = useModelIndex('posts', {
  fields: ['id', 'title']
});

// Detail view (on click) - full relationships
const { data: post } = useModelShow('posts', selectedId, {
  includes: ['author', 'comments'],
  enabled: !!selectedId
});
```

### 7. Use TypeScript for Type Safety

```typescript
interface Post {
  id: number;
  title: string;
  author?: User;
  comments?: Comment[];
  tags?: Tag[];
}

const { data: post } = useModelShow<Post>('posts', id, {
  includes: ['author', 'comments', 'tags']
});

// TypeScript knows post.author is User | undefined
const authorName = post?.author?.name;
```

---

## Related Documentation

- [API Reference - useModelIndex](../API.md#usemodelindex)
- [API Reference - useModelShow](../API.md#usemodelshow)
- [Filtering Guide](./filtering.md)
- [Pagination Guide](./pagination.md)
- [Getting Started](../getting-started.md)
