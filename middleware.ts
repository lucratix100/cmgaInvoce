import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const userRole = request.cookies.get("userRole")?.value;
  
  const path = request.nextUrl.pathname;

  // Permettre l'accès à la page d'accueil sans token
  if (path === "/") {
    if (token) {
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
  if (!token) {
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