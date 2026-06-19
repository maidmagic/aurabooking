import { PMSConnector, PMSConfig } from "./types";
import { OpenDentalConnector } from "./opendental";

export function getConnector(provider: string, config: PMSConfig): PMSConnector {
  switch (provider) {
    case "opendental":
      return new OpenDentalConnector(config);
    default:
      throw new Error(`Unsupported PMS provider: ${provider}`);
  }
}
