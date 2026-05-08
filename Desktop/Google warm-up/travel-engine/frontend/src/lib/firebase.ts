import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, logEvent, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "travel-engine-2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

// Singleton Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let analyticsInstance: Analytics | null = null;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (!supported) return null;
  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
}

// Typed event helpers
export async function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

export async function trackTripCreated(destination: string, days: number, budget?: number) {
  await trackEvent("trip_created", { destination, days, budget: budget ?? 0 });
}

export async function trackItineraryGenerated(tripId: string, destination: string) {
  await trackEvent("itinerary_generated", { trip_id: tripId, destination });
}

export async function trackGoogleSignIn(method: "google" | "email") {
  await trackEvent("login", { method });
}

export async function trackChatMessage(tripId: string) {
  await trackEvent("ai_chat_message", { trip_id: tripId });
}

export async function trackMapView(tripId: string, dayIndex: number) {
  await trackEvent("map_viewed", { trip_id: tripId, day_index: dayIndex });
}

export async function trackPreferencesSaved(style: string[], pace: string) {
  await trackEvent("preferences_saved", {
    travel_style: style.join(","),
    pace,
  });
}

export { app };
