export function createLayoutError(message, path = "layout") {
  return {
    message,
    path
  };
}

export function formatLayoutErrors(errors) {
  return errors.map((error) => `${error.path}: ${error.message}`);
}
