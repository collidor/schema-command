import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { z } from "zod";
import { Command, CommandBus } from "@collidor/command";
import { SchemaCommand } from "./schemaCommand.ts";
import { createSchemaCommand } from "./createSchemaCommand.ts";

const InputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const OutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
});

Deno.test("createSchemaCommand - Basic Creation and Naming", async (t) => {
  await t.step("should create a schema command class with explicit name", () => {
    const CreateUserCommand = createSchemaCommand(
      "CreateUserCommand",
      InputSchema,
      OutputSchema,
    );

    assertEquals(CreateUserCommand.name, "CreateUserCommand");

    const payload = { name: "Alice", age: 30 };
    const command = new CreateUserCommand(payload);

    assertEquals(command.constructor.name, "CreateUserCommand");
    assertEquals(command.data, payload);
    assertEquals(command.schema.input, InputSchema);
    assertEquals(command.schema.output, OutputSchema);
    assertEquals(CreateUserCommand.schema.input, InputSchema);
    assertEquals(CreateUserCommand.schema.output, OutputSchema);

    assertInstanceOf(command, SchemaCommand);
    assertInstanceOf(command, Command);
    assertInstanceOf(command, CreateUserCommand);
  });

  await t.step("should support options object signature", () => {
    const OptionsCommand = createSchemaCommand("OptionsCommand", {
      input: InputSchema,
      output: OutputSchema,
    });

    assertEquals(OptionsCommand.name, "OptionsCommand");
    assertEquals(OptionsCommand.schema.input, InputSchema);
    assertEquals(OptionsCommand.schema.output, OutputSchema);

    const cmd = new OptionsCommand({ name: "Bob", age: 25 });
    assertEquals(cmd.data.name, "Bob");
    assertEquals(cmd.constructor.name, "OptionsCommand");
  });

  await t.step("should apply Zod default values when instantiated without arguments", () => {
    const DefaultInput = z.object({
      count: z.number().default(0),
      tag: z.string().default("default"),
    });
    const VoidOutput = z.void();

    const DefaultCommand = createSchemaCommand(
      "DefaultCommand",
      DefaultInput,
      VoidOutput,
    );

    const command = new DefaultCommand();
    assertEquals(command.data.count, 0);
    assertEquals(command.data.tag, "default");
    assertEquals(command.constructor.name, "DefaultCommand");
  });
});

Deno.test("createSchemaCommand - Name Validation", async (t) => {
  await t.step("should throw TypeError for empty or whitespace name", () => {
    assertThrows(
      () => createSchemaCommand("", InputSchema, OutputSchema),
      TypeError,
      "SchemaCommand name must be a non-empty string",
    );
    assertThrows(
      () => createSchemaCommand("   ", InputSchema, OutputSchema),
      TypeError,
      "SchemaCommand name must be a non-empty string",
    );
  });

  await t.step("should throw TypeError for non-string names", () => {
    assertThrows(
      () => createSchemaCommand(null as any, InputSchema, OutputSchema),
      TypeError,
      "SchemaCommand name must be a non-empty string",
    );
    assertThrows(
      () => createSchemaCommand(undefined as any, InputSchema, OutputSchema),
      TypeError,
      "SchemaCommand name must be a non-empty string",
    );
    assertThrows(
      () => createSchemaCommand(123 as any, InputSchema, OutputSchema),
      TypeError,
      "SchemaCommand name must be a non-empty string",
    );
  });
});

Deno.test("createSchemaCommand - Bundler Minification Resilience", async (t) => {
  await t.step(
    "should preserve class name even if variable name is mangled",
    () => {
      // Simulating a bundler renaming variable `CreateUserCommand` to `a`
      const a = createSchemaCommand("CreateUserCommand", InputSchema, OutputSchema);

      assertEquals(a.name, "CreateUserCommand");

      const instance = new a({ name: "Charlie", age: 40 });
      assertEquals(instance.constructor.name, "CreateUserCommand");
    },
  );
});

Deno.test("createSchemaCommand - CommandBus Integration", async (t) => {
  const CreateUserCommand = createSchemaCommand(
    "CreateUserCommand",
    InputSchema,
    OutputSchema,
  );

  await t.step("should register and execute on CommandBus", () => {
    const bus = new CommandBus();

    bus.register(CreateUserCommand, (cmd) => {
      assertEquals(cmd.data.name, "Alice");
      return {
        success: true,
        id: "user_123",
      };
    });

    const result = bus.execute(
      new CreateUserCommand({ name: "Alice", age: 30 }),
    );

    assertEquals(result, { success: true, id: "user_123" });
  });

  await t.step("should check availability using constructor and string name", () => {
    const bus = new CommandBus();
    assertEquals(bus.isAvailable(CreateUserCommand), false);
    assertEquals(bus.isAvailable("CreateUserCommand"), false);

    bus.register(CreateUserCommand, () => ({ success: true, id: "ok" }));

    assertEquals(bus.isAvailable(CreateUserCommand), true);
    assertEquals(bus.isAvailable("CreateUserCommand"), true);
    assertEquals(bus.getAvailableCommands().includes("CreateUserCommand"), true);
  });

  await t.step("should handle schema command in streams", async () => {
    const bus = new CommandBus();
    const StreamInput = z.object({ limit: z.number() });
    const StreamOutput = z.number();

    const NumberStreamCommand = createSchemaCommand(
      "NumberStreamCommand",
      StreamInput,
      StreamOutput,
    );

    bus.registerStream(NumberStreamCommand, (cmd, _ctx, next) => {
      for (let i = 0; i < cmd.data.limit; i++) {
        next(i, i === cmd.data.limit - 1);
      }
      return () => {};
    });

    const results: number[] = [];
    await new Promise((resolve) => {
      bus.stream(
        new NumberStreamCommand({ limit: 4 }),
        (data, done) => {
          results.push(data);
          if (done) resolve(undefined);
        },
      );
    });

    assertEquals(results, [0, 1, 2, 3]);
  });
});

Deno.test("createSchemaCommand - Subclassing", async (t) => {
  await t.step("should allow extending the returned command class", () => {
    const Base = createSchemaCommand("BaseCommand", InputSchema, OutputSchema);

    class ChildCommand extends Base {
      public extra = "extra_field";
    }

    const child = new ChildCommand({ name: "Dan", age: 20 });
    assertEquals(child.data.name, "Dan");
    assertEquals(child.extra, "extra_field");
    assertInstanceOf(child, Base);
    assertInstanceOf(child, SchemaCommand);
    assertInstanceOf(child, Command);
  });
});
