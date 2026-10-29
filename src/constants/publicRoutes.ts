export const PUBLIC_PATHS = ['/login', '/register', '/map3D', '/baseMap', '/map', '/mapbox'];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  return (
    pathname.startsWith('/map3D/') ||
    pathname.startsWith('/baseMap/') ||
    pathname.startsWith('/map/') ||
    pathname.startsWith('/mapbox/') ||
    pathname.startsWith('/f/')
  );
}

export function isMapRoute(pathname: string): boolean {
  return pathname.startsWith('/baseMap') || pathname.startsWith('/map3D');
}
