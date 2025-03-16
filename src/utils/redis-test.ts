// src/utils/redis-test.ts
// A simple test script to verify Redis caching is working

import { getCache, setCache, deleteCache, deleteCacheByPattern } from './redis-cache';

/**
 * Test the Redis cache functionality
 */
const testRedisCache = async (): Promise<void> => {
  console.log('--- Testing Redis Cache ---');
  
  // Test data
  const testKey = 'test:cache:key';
  const testData = {
    id: 1,
    name: 'Test Data',
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Test setting cache
    console.log('Setting cache...');
    const setResult = await setCache(testKey, testData, 60);
    console.log('Set result:', setResult);
    
    // Test getting cache
    console.log('\nGetting cache...');
    const cachedData = await getCache<typeof testData>(testKey);
    console.log('Retrieved data:', cachedData);
    
    // Verify data integrity
    if (cachedData && cachedData.id === testData.id && cachedData.name === testData.name) {
      console.log('\n✅ Cache retrieval successful!');
    } else {
      console.log('\n❌ Cache retrieval failed or data mismatch!');
    }
    
    // Test pattern deletion
    console.log('\nSetting additional test keys...');
    await setCache('test:pattern:1', { value: 'one' }, 60);
    await setCache('test:pattern:2', { value: 'two' }, 60);
    
    // List all test keys
    console.log('\nDeleting by pattern...');
    const deleteResult = await deleteCacheByPattern('test:pattern:*');
    console.log('Delete by pattern result:', deleteResult);
    
    // Test single key deletion
    console.log('\nDeleting single key...');
    const singleDeleteResult = await deleteCache(testKey);
    console.log('Single delete result:', singleDeleteResult);
    
    // Verify deletion
    const checkAfterDelete = await getCache<typeof testData>(testKey);
    if (checkAfterDelete === null) {
      console.log('\n✅ Cache deletion successful!');
    } else {
      console.log('\n❌ Cache deletion failed!');
    }
    
    console.log('\n--- Redis Cache Test Complete ---');
    
  } catch (error) {
    console.error('Redis test error:', error);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testRedisCache()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export default testRedisCache;