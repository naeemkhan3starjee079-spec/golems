import { Config } from "@remotion/cli/config";
import path from "path";
import os from "os";

// Resolve domica repo relative to home directory (works regardless of CWD)
const homeDir = os.homedir();
const domicaUiWeb = path.join(homeDir, "Gits/domica/packages/ui-web/src");

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...currentConfiguration.resolve?.alias,
        // Live-link Domica UI components
        "@domica/ui-web": domicaUiWeb,
      },
    },
    // Remotion handles CSS natively — no custom loaders needed
  };
});
