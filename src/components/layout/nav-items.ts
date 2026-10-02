// Primary navigation. Labels come from the "Nav" messages namespace.
export const navItems = [
  { href: "/products", key: "products" },
  { href: "/how-to-order", key: "howToOrder" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
