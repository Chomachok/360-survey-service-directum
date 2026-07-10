using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using Survey360.Api.Data;
using Survey360.Api.Validators;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Json;
using Survey360.Api.Entities;
using Survey360.Api.Enums;
using Survey360.Api.Interfaces;
using Survey360.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Регистрация контроллеров (с поддержкой атрибутов [ApiController], [Route])
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Настройка сериализации (как в System.Text.Json)
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// 2. Добавляем OpenAPI (генерация документации)
builder.Services.AddOpenApi();

// 3. Добавляем контекст БД (SQLite)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. Регистрируем валидаторы FluentValidation (из текущей сборки)
builder.Services.AddValidatorsFromAssemblyContaining<SurveyCreateRequestValidator>();
builder.Services.AddScoped<ISurveysService, SurveysService>();

// 5. Настраиваем CORS (для фронта на Vite)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // порт Vite
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// 6. (Опционально) Настройка JSON для минимизации проблем с циклическими ссылками
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

// Автоприменение миграций при запуске приложения
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.Migrate();
    }
    catch (Exception e)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(e, "An error occurred while migrating the DB.");
    }
}

// 7. Включаем OpenAPI-эндпоинт (/openapi/v1.json)
app.MapOpenApi();

if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "My API V1");
    });
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Проверяем, есть ли пользователи
    if (!db.Users.Any())
    {
        db.Users.Add(new User
        {
            Email = "test@tester.ru",
            FullName = "tester",
            Role = UserRole.Admin,
            PasswordHash = "1234567890-ljhgd",
            PasswordSalt = "2345udfghjkl"
        });
        await db.SaveChangesAsync();
    }
}

// 9. Включаем CORS
app.UseCors("Frontend");

// 10. Маршрутизация для контроллеров
app.MapControllers();

app.Run();