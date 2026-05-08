import "@testing-library/jest-dom";

// Silence next/navigation warnings in tests
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/",
}));

// Mock @react-oauth/google
jest.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleLogin: () => jest.fn(),
}));
