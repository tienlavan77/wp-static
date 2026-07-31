export default async function runLimitedParallel(items, worker, options = {}) {
  const concurrency = normalizeConcurrency(options.concurrency);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    const index = nextIndex;
    nextIndex += 1;

    if (index >= items.length) {
      return;
    }

    results[index] = await worker(items[index], index);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext())
  );

  return results;
}

function normalizeConcurrency(value) {
  if (!Number.isInteger(value) || value < 1) {
    return 4;
  }

  return value;
}
