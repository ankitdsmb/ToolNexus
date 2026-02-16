using System.Reflection;
using ToolNexus.Application;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddApplication();

var infrastructureAssembly = Assembly.Load("ToolNexus.Infrastructure");
builder.Services.AddToolExecutorsFromAssembly(infrastructureAssembly);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
