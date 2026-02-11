export default {
  expo: {
    name: "Heart Sense",
    slug: "heart-sense",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.heartsense.app"
    },
    android: {
      package: "com.heartsense.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#1a1a1a",
          sounds: []
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    updates: {
      url: "https://u.expo.dev/4171cdf0-600d-4f1f-8fbd-209ec90d4982",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      // EAS project ID (links this app to EAS / expo.dev). Override with EXPO_PUBLIC_EAS_PROJECT_ID in .env if needed.
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "4171cdf0-600d-4f1f-8fbd-209ec90d4982",
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "4171cdf0-600d-4f1f-8fbd-209ec90d4982",
      },
    },
  }
};
