export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readJsonObjectProperty(
  objectValue: JsonObject,
  propertyName: string,
): JsonObject | null {
  const propertyValue = objectValue[propertyName];
  return isJsonObject(propertyValue) ? propertyValue : null;
}

export function hasNonObjectProperty(
  objectValue: JsonObject,
  propertyName: string,
): boolean {
  const propertyValue = objectValue[propertyName];
  return propertyValue !== undefined && !isJsonObject(propertyValue);
}
