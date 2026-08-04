export function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export function pascalToCamel(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
