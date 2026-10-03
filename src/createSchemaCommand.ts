import { COMMAND_RETURN } from "@collidor/command";
import type { z } from "zod";
import { SchemaCommand } from "./schemaCommand.ts";

export interface SchemaCommandInstance<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> extends SchemaCommand<TInputSchema, TOutputSchema> {
  schema: {
    input: TInputSchema;
    output: TOutputSchema;
  };
  data: z.infer<TInputSchema>;
}

export interface SchemaCommandConstructor<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  new (
    ...args: [data?: z.infer<TInputSchema>]
  ): SchemaCommandInstance<TInputSchema, TOutputSchema>;
  readonly prototype: SchemaCommandInstance<TInputSchema, TOutputSchema>;
  readonly name: string;
  readonly schema: {
    readonly input: TInputSchema;
    readonly output: TOutputSchema;
  };
}

/**
 * Creates a schema-validated command class constructor with an explicit name and schemas.
 *
 * This protects against bundlers minifying or mangling class names in production,
 * ensuring that command routing and serialization based on `command.constructor.name`
 * remain stable and deterministic.
 *
 * @param name The unique name of the schema command.
 * @param inputSchema The Zod input schema for payload validation and typing.
 * @param outputSchema The Zod output schema for return value typing.
 * @returns A class constructor extending SchemaCommand with the specified name and schemas.
 *
 * @example
 * ```ts
 * const CreateUser = createSchemaCommand(
 *   "CreateUser",
 *   z.object({ name: z.string() }),
 *   z.object({ id: z.string() }),
 * );
 *
 * bus.register(CreateUser, (cmd) => ({ id: "123" }));
 * const res = bus.execute(new CreateUser({ name: "Alice" }));
 * ```
 */
export function createSchemaCommand<
  const TInputSchema extends z.ZodTypeAny,
  const TOutputSchema extends z.ZodTypeAny,
>(
  name: string,
  inputSchema: TInputSchema,
  outputSchema: TOutputSchema,
): SchemaCommandConstructor<TInputSchema, TOutputSchema>;

export function createSchemaCommand<
  const TInputSchema extends z.ZodTypeAny,
  const TOutputSchema extends z.ZodTypeAny,
>(
  name: string,
  options: {
    input: TInputSchema;
    output: TOutputSchema;
  },
): SchemaCommandConstructor<TInputSchema, TOutputSchema>;

export function createSchemaCommand<
  const TInputSchema extends z.ZodTypeAny,
  const TOutputSchema extends z.ZodTypeAny,
>(
  name: string,
  inputOrOptions:
    | TInputSchema
    | { input: TInputSchema; output: TOutputSchema },
  maybeOutput?: TOutputSchema,
): SchemaCommandConstructor<TInputSchema, TOutputSchema> {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new TypeError("SchemaCommand name must be a non-empty string");
  }

  let inputSchema: TInputSchema;
  let outputSchema: TOutputSchema;

  if (
    inputOrOptions &&
    typeof inputOrOptions === "object" &&
    "input" in inputOrOptions &&
    "output" in inputOrOptions &&
    maybeOutput === undefined
  ) {
    inputSchema = inputOrOptions.input;
    outputSchema = inputOrOptions.output;
  } else {
    inputSchema = inputOrOptions as TInputSchema;
    outputSchema = maybeOutput as TOutputSchema;
  }

  const schema = {
    input: inputSchema,
    output: outputSchema,
  } as const;

  const SchemaCommandClass = class extends SchemaCommand<
    TInputSchema,
    TOutputSchema
  > {
    public static schema = schema;
    public override [COMMAND_RETURN]!: z.infer<TOutputSchema>;
    override schema = schema;

    constructor(...args: any[]) {
      const data = args.length > 0 && args[0] !== undefined
        ? args[0]
        : schema.input.parse({});
      super(schema, data);
    }
  };

  Object.defineProperty(SchemaCommandClass, "name", {
    value: name,
    configurable: true,
  });

  return SchemaCommandClass as unknown as SchemaCommandConstructor<
    TInputSchema,
    TOutputSchema
  >;
}
