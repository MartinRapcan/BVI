import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import Blog from './collections/Blog'
import { cacheMiddleware, deleteCacheByPattern, getCache, setCache } from './utils/redis-cache'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Create enhanced collections with cache hooks
const enhanceWithCacheHooks = (collection) => {
  // Get the existing hooks or initialize empty object
  const existingHooks = collection.hooks || {};
  
  return {
    ...collection,
    hooks: {
      ...existingHooks,
      
      // Clear cache after content is created
      afterCreate: [
        ...(existingHooks.afterCreate || []),
        async ({ doc }) => {
          await deleteCacheByPattern(`${collection.slug}:*`);
          console.log(`Cache cleared for ${collection.slug} after create`);
          return doc;
        }
      ],
      
      // Clear cache after content is updated
      afterUpdate: [
        ...(existingHooks.afterUpdate || []),
        async ({ doc }) => {
          await deleteCacheByPattern(`${collection.slug}:*`);
          console.log(`Cache cleared for ${collection.slug} after update`);
          return doc;
        }
      ],
      
      // Clear cache after content is deleted
      afterDelete: [
        ...(existingHooks.afterDelete || []),
        async ({ doc }) => {
          await deleteCacheByPattern(`${collection.slug}:*`);
          console.log(`Cache cleared for ${collection.slug} after delete`);
          return doc;
        }
      ],
      
      // Add cache for find operations (read many)
      beforeFind: [
        ...(existingHooks.beforeFind || []),
        async ({ req, query }) => {
          // Only cache GET requests
          if (req.method !== 'GET') return query;
          
          // Create a cache key based on collection and query parameters
          const cacheKey = `${collection.slug}:find:${JSON.stringify(query)}`;
          
          try {
            // Try to get from cache
            const cachedResult = await getCache(cacheKey);
            if (cachedResult) {
              // Attach to req object to be used in afterFind
              req.cachedResult = cachedResult;
              console.log(`Cache hit for ${cacheKey}`);
            }
          } catch (error) {
            console.error(`Cache error in beforeFind: ${error}`);
          }
          
          return query;
        }
      ],
      
      // Return cached result or cache new result
      afterFind: [
        ...(existingHooks.afterFind || []),
        async ({ req, result }) => {
          // If we have a cached result from beforeFind, use it
          if (req.cachedResult) {
            return req.cachedResult;
          }
          
          // Otherwise, cache the new result
          if (req.method === 'GET') {
            const cacheKey = `${collection.slug}:find:${JSON.stringify(req.query)}`;
            await setCache(cacheKey, result, 300); // Cache for 5 minutes
            console.log(`Cached result for ${cacheKey}`);
          }
          
          return result;
        }
      ],
      
      // Similar caching for findByID
      beforeFindByID: [
        ...(existingHooks.beforeFindByID || []),
        async ({ req, id }) => {
          if (req.method !== 'GET') return id;
          
          const cacheKey = `${collection.slug}:findById:${id}`;
          
          try {
            const cachedDoc = await getCache(cacheKey);
            if (cachedDoc) {
              req.cachedDoc = cachedDoc;
              console.log(`Cache hit for ${cacheKey}`);
            }
          } catch (error) {
            console.error(`Cache error in beforeFindByID: ${error}`);
          }
          
          return id;
        }
      ],
      
      // Return cached document or cache new document
      afterFindByID: [
        ...(existingHooks.afterFindByID || []),
        async ({ req, doc }) => {
          if (req.cachedDoc) {
            return req.cachedDoc;
          }
          
          if (req.method === 'GET' && doc) {
            const cacheKey = `${collection.slug}:findById:${doc.id}`;
            await setCache(cacheKey, doc, 300);
            console.log(`Cached document for ${cacheKey}`);
          }
          
          return doc;
        }
      ]
    }
  };
};

// Apply cache hooks to collections
const collectionsWithCacheHooks = [
  enhanceWithCacheHooks(Blog),
  enhanceWithCacheHooks(Media),
  // Skip users collection for caching if desired
  Users
];

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://0.0.0.0:3000',
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  
  collections: collectionsWithCacheHooks,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Add Redis caching hooks to collections that need it
  hooks: {
    // You can still use global hooks for errors
    afterError: [
      (error) => {
        console.error("Global error:", error);
        return error;
      }
    ],
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [],
})
