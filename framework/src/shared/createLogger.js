export default function createLogger(options = {}) {
  const quiet = options.quiet === true;
  const verbose = options.verbose === true;

  return {
    info(message) {
      if (!quiet) {
        console.log(message);
      }
    },
    verbose(message) {
      if (!quiet && verbose) {
        console.log(message);
      }
    },
    error(message) {
      console.error(message);
    }
  };
}
