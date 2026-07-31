export default async function readThroughCache(cache, key, loader) {
  if (!cache) {
    return {
      cached: false,
      value: await loader()
    };
  }

  const cachedValue = await cache.get(key);

  if (cachedValue !== null) {
    return {
      cached: true,
      value: cachedValue
    };
  }

  const value = await loader();
  await cache.set(key, value);

  return {
    cached: false,
    value
  };
}
