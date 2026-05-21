// Wrapper for cogent-js to handle CommonJS import with Vite and Metro.
// Import from cogent-js/src to avoid the broken build/ directory
// (build/index.js references ./Query but Query.js is missing from build/).
let QueryClass = null;
let loading = false;
let loadPromise = null;

async function loadCogent() {
  if (QueryClass) return QueryClass;
  if (loading && loadPromise) return loadPromise;

  loading = true;
  loadPromise = import('cogent-js/src/index.js').then((cogent) => {
    QueryClass = cogent.Query || cogent.default?.Query || cogent.default || cogent;
    loading = false;
    return QueryClass;
  }).catch((err) => {
    console.error('Failed to load cogent-js:', err);
    loading = false;
    throw err;
  });

  return loadPromise;
}

// Pre-load immediately
loadCogent();

export function Query(...args) {
  if (!QueryClass) {
    throw new Error('cogent-js Query class not loaded yet. Please wait for the module to load.');
  }
  return new QueryClass(...args);
}

// Export the class getter for direct access
export { loadCogent };
