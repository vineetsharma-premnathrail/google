"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import AuthPage from "@/components/AuthPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { user } = useAuthStore();
  return user ? <Dashboard /> : <AuthPage />;
}
