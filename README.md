[![Codecov](https://codecov.io/gh/collidor/schema-command/branch/main/graph/badge.svg)](https://codecov.io/gh/collidor/schema-command)
[![npm version](https://img.shields.io/npm/v/@collidor/schema-command)](https://www.npmjs.com/package/@collidor/schema-command)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# @collidor/schema-command

Type-safe, schema-validated command pattern implementation powered by Zod and `@collidor/command`.

## Installation

```bash
npm install @collidor/schema-command zod @collidor/command
```

## Features

- **Runtime schema validation** for command inputs and outputs via Zod
- **Compile-time TypeScript inference** for handler arguments and return types
- **Bundler / Minification resilience** with `createSchemaCommand`
- Seamless integration with `CommandBus` and `AsyncCommandBus`

## Usage

### Using `createSchemaCommand` (Bundler / Minification Safe)

When bundling for production, JavaScript minifiers mangle class names (e.g. `class CreateUserCommand` becomes `class a`). Since command buses and networking plugins route commands using their constructor name, `createSchemaCommand` provides a type-safe way to define schema commands with a fixed, unminifiable name:

```typescript
import { z } from "zod";
import { CommandBus } from "@collidor/command";
import { createSchemaCommand } from "@collidor/schema-command";

const InputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const OutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

// 1. Define command with explicit name and schemas
export const CreateUser = createSchemaCommand(
  "CreateUser",
  InputSchema,
  OutputSchema,
);

// Or using options object signature:
// export const CreateUser = createSchemaCommand("CreateUser", {
//   input: InputSchema,
//   output: OutputSchema,
// });

// 2. Register handler on bus
const bus = new CommandBus();
bus.register(CreateUser, (cmd) => {
  // cmd.data is inferred as { name: string; age: number }
  return {
    success: true,
    id: `user_${Date.now()}`,
  };
});

// 3. Execute
const result = bus.execute(new CreateUser({ name: "Alice", age: 30 }));
console.log(result.id);
```

### Using `schemaCommand` with Class Inheritance

```typescript
import { z } from "zod";
import { schemaCommand, SchemaCommand } from "@collidor/schema-command";

const InputSchema = z.object({ limit: z.number() });
const OutputSchema = z.array(z.string());

class FetchItemsCommand extends schemaCommand(InputSchema, OutputSchema) {}
```
