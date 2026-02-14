import { Config } from "@remotion/cli/config";
import path from "path";

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...currentConfiguration.resolve?.alias,
        // Live-link Domica UI components
        "@domica/ui-web": path.resolve(
          __dirname,
          "../../../domica/packages/ui-web/src"
        ),
      },
    },
    module: {
      ...currentConfiguration.module,
      rules: [
        ...(currentConfiguration.module?.rules ?? []),
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
  };
});
