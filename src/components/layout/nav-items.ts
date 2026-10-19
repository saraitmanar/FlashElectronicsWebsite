// Primary navigation. Labels come from the "Nav" messages namespace.
// Add pages here once they exist, e.g. { href: "/about", key: "about" }
// (keys "howToOrder", "about" and "contact" already have translations).
export const navItems = [{ href: "/products", key: "products" }] as const;

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
