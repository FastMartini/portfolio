import { readFile } from "node:fs/promises";
import ts from "typescript";

// Read the legend's names/orders without duplicating the portfolio content.
export async function legendContent() {
  const file = new URL("../../content/waypoints.ts", import.meta.url);
  const source = ts.createSourceFile(file.pathname, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  const stops = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = node.properties.filter(ts.isPropertyAssignment);
      const name = properties.find((p) => p.name.getText(source) === "name")?.initializer;
      const order = properties.find((p) => p.name.getText(source) === "order")?.initializer;
      if (name && order && ts.isStringLiteral(name) && ts.isNumericLiteral(order)) stops.push([Number(order.text), name.text]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!stops.length) throw new Error("No Waypoints found for the splash legend");
  return stops.sort((a, b) => a[0] - b[0]);
}
