import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Type pour l'utilisateur
interface User {
  id: number;
  firstname: string;
  lastname: string;
  role: string;
  depotId: number;
  phone: string;
  isActive: boolean;
}

// Type pour le token d'accès
interface AccessToken {
  token: string;
  expiresAt: string;
}

export function middleware(request: NextRequest) {
  // Récupération sécurisée des cookies avec gestion des erreurs de parsing JSON
  let accessToken: Partial<AccessToken> = {};
  let user: Partial<User> = {};

  try {
    accessToken = JSON.parse(request.cookies.get("accessToken")?.value || "{}");
    user = JSON.parse(request.cookies.get("user")?.value || "{}");
  } catch (error) {
    console.error("Erreur de parsing JSON des cookies:", error);
  }

  const token = accessToken.token;
  const expireAt = accessToken.expiresAt;
  const userRole = user.role;

  // Vérification de l'expiration du token
  const isTokenExpired = expireAt ? new Date(expireAt) <= new Date() : true;
  const isAuthenticated = !!token && !isTokenExpired;

  const path = request.nextUrl.pathname;

  // Permettre l'accès à la page d'accueil sans token
  if (path === "/") {
    if (isAuthenticated) {
      // Rediriger les utilisateurs connectés selon leur rôle
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/factures", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protection des routes authentifiées
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protection des routes admin
  if (path.startsWith("/dashboard") && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/factures", request.url));
  }

  // Protection des routes factures
  if (path.startsWith("/factures") && userRole === "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/factures/:path*",
    "/profil/:path*"
  ]
}; 