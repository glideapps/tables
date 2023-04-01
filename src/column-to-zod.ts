import { ColumnSchema, ColumnType } from "./types";
import { AnyZodObject, ZodRawShape, ZodTypeAny, z } from "zod";

interface ColumnWithType {
    internalName: string;
    type: ColumnType;
}
/**
 * Coerces the flexible ColumnSchema to a more rigid map of internal column name to column type.
 * This is what the API will give us.
 */
function coerceColumnSchemaToInternalNames(columnSchema: ColumnSchema): ColumnWithType[] {
    const columnEntries: ColumnWithType[] = [];

    for(const [name, typeOrSchemaEntry] of Object.entries(columnSchema)) {
        const internalName = typeof typeOrSchemaEntry !== "string" && typeOrSchemaEntry.name !== undefined ? typeOrSchemaEntry.name : name;
        const type = typeof typeOrSchemaEntry !== "string" ? typeOrSchemaEntry.type : typeOrSchemaEntry;

        columnEntries.push({
            internalName,
            type,
        })
    }

    return columnEntries;
}

function assertNever(x: never): never {
    throw new TypeError(`Unexpected value ${x}`);
}

function zodTypeFromColumnType(columnType: ColumnType): ZodTypeAny {
    switch(columnType) {
        case "string":
            return z.string();

        case "number":
            return z.number();

        default:
            return assertNever(columnType);
    }
}

export function columnToZodSchema<T extends ColumnSchema>(columnSchema: T): AnyZodObject {
    const columnsWithTypes = coerceColumnSchemaToInternalNames(columnSchema);

    const schemaObject: ZodRawShape = {};
    for(const { internalName, type } of columnsWithTypes) {
        schemaObject[internalName] = zodTypeFromColumnType(type);
    }

    const schema = z.object(schemaObject);

    return schema;
}
