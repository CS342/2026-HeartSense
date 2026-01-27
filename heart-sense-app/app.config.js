export default {
  expo: {
    name: "Medical Tracker",
    slug: "medical-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.medicaltracker.app"
    },
    android: {
      package: "com.medicaltracker.app",
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
    plugins: ["expo-router", "expo-font", "expo-web-browser"],
    experiments: {
      typedRoutes: true
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wtwgqbfuhkiilclsczvo.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0d2dxYmZ1aGtpaWxjbHNjenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzYyNjMsImV4cCI6MjA4NDAxMjI2M30.Zqix4ES039_eWjtNOqHMeXYO7iazRgLMYGwNftETH0I',
    }
  }
};
