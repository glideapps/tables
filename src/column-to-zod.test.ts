import { columnToZodSchema } from "./column-to-zod";
import { ColumnSchema } from "./types";

describe("Column to zod schema", () => {
    const schema: ColumnSchema = {
        name: "string",
        surname: { type: "string", name: "lastName" },
        age: "number",
        money: { type: "number" },
    }

    const zodSchema = columnToZodSchema(schema)

    it("Passes with a valid schema", () => {
        const validResponse = {
            name: "ivo",
            lastName: "elbert",
            age: 28,
            money: 0,
        }

        const parsedResponse = zodSchema.safeParse(validResponse);

        expect(parsedResponse.success).toBe(true);
    })

    it("Fails with an invalid 'string' schema", () => {
        const invalidResponse = {
            // Invalid name!
            name: 42,
            lastName: "elbert",
            age: 28,
            money: 0,
        }

        const parsedResponse = zodSchema.safeParse(invalidResponse);

        expect(parsedResponse.success).toBe(false);
    });

    it("Fails with an invalid 'number' schema", () => {
        const invalidResponse = {
            name: "ivo",
            lastName: "elbert",
            // Invalid age!
            age: "too old",
            money: 0,
        }

        const parsedResponse = zodSchema.safeParse(invalidResponse);

        expect(parsedResponse.success).toBe(false);
    })

    it("Fails with an invalid { type: 'string' } schema", () => {
        const invalidResponse = {
            name: "ivo",
            // Invalid last name!
            lastName: 42,
            age: 28,
            money: "a lot",
        }

        const parsedResponse = zodSchema.safeParse(invalidResponse);

        expect(parsedResponse.success).toBe(false);
    })

    it("Fails with an invalid { type: 'number' } schema", () => {
        const invalidResponse = {
            name: "ivo",
            lastName: "elbert",
            age: 28,
            // Invalid money!
            money: "a lot",
        }

        const parsedResponse = zodSchema.safeParse(invalidResponse);

        expect(parsedResponse.success).toBe(false);
    })

    it("Fails with an invalid internal column schema", () => {
        const invalidResponse = {
            name: "ivo",
            // Invalid column name! Its internal value should be lastName
            surname: "elbert",
            age: "too old",
            money: 0,
        }

        const parsedResponse = zodSchema.safeParse(invalidResponse);

        expect(parsedResponse.success).toBe(false);
    })
});
