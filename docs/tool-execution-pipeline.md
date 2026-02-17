# Tool Execution Pipeline

`IToolExecutionPipeline` is the single application entrypoint for tool execution, regardless of whether the call comes from MVC UI controllers or API controllers.

## Default pipeline

The default middleware order is:

1. `ValidationExecutionStep`
2. `CachingExecutionStep`
3. `ClientExecutionStep`
4. `ApiExecutionStep`
5. `PostProcessingExecutionStep`

This order is registered by `AddToolExecutionPipeline()`.

## Middleware registration examples

You can register only specific middleware (or insert custom middleware) using `AddToolExecutionStep<TStep>()`:

```csharp
services.AddScoped<IToolExecutionPipeline, ToolExecutionPipeline>();
services.AddScoped<IApiToolExecutionStrategy, ApiToolExecutionStrategy>();
services.AddScoped<IClientToolExecutionStrategy, NoOpClientExecutionStrategy>();

// Validation + cache middleware examples:
services.AddToolExecutionStep<ValidationExecutionStep>();
services.AddToolExecutionStep<CachingExecutionStep>();

// Execution + post-processing.
services.AddToolExecutionStep<ClientExecutionStep>();
services.AddToolExecutionStep<ApiExecutionStep>();
services.AddToolExecutionStep<PostProcessingExecutionStep>();
```

## Strategy separation

- `IClientToolExecutionStrategy` handles local/client-capable execution opportunities.
- `IApiToolExecutionStrategy` handles server-side execution through domain executors.

Because strategy selection and middleware are separate abstractions, you can:

- add tracing, rate limiting, or authorization middleware without changing executors,
- swap in a richer client strategy implementation later,
- keep domain tool implementations (`IToolExecutor`) isolated from orchestration concerns.
