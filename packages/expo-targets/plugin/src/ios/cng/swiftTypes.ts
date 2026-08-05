export type CngFieldType = 'string' | 'double' | 'int' | 'bool';

export function swiftTypeForField(t: CngFieldType): string {
  switch (t) {
    case 'string':
      return 'String';
    case 'double':
      return 'Double';
    case 'int':
      return 'Int';
    case 'bool':
      return 'Bool';
    default:
      return 'String';
  }
}

export function jsonDecodeExpr(
  dictName: string,
  key: string,
  t: CngFieldType
): string {
  switch (t) {
    case 'string':
      return `${dictName}["${key}"] as? String ?? ""`;
    case 'double':
      return `${dictName}["${key}"] as? Double ?? 0`;
    case 'int':
      return `${dictName}["${key}"] as? Int ?? 0`;
    case 'bool':
      return `${dictName}["${key}"] as? Bool ?? false`;
    default:
      return `${dictName}["${key}"] as? String ?? ""`;
  }
}
