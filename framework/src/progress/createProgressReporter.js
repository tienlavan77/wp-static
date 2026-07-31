export default function createProgressReporter(onProgress) {
  if (typeof onProgress !== "function") {
    return () => {};
  }

  return (step, message, data = {}) => {
    onProgress({
      data,
      message,
      step
    });
  };
}
