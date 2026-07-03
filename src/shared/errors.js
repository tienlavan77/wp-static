export class WpscError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? "WPSC_ERROR";
  }
}

export class ConfigError extends WpscError {
  constructor(message) {
    super(message, { code: "CONFIG_ERROR" });
  }
}

export class RouteError extends WpscError {
  constructor(message) {
    super(message, { code: "ROUTE_ERROR" });
  }
}

export class BuildError extends WpscError {
  constructor(message) {
    super(message, { code: "BUILD_ERROR" });
  }
}

export class AdapterError extends WpscError {
  constructor(message) {
    super(message, { code: "ADAPTER_ERROR" });
  }
}
