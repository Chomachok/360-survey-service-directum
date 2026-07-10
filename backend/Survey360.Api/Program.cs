using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Json;
using Survey360.Api.Data;
using Survey360.Api.Entities;
using Survey360.Api.Enums;
using Survey360.Api.Interfaces;
using Survey360.Api.Services;
using Survey360.Api.Validators;

// Построение приложения
var builder = WebApplication.CreateBuilder(args);

// 1. Регистрация контроллеров
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// 2. OpenAPI
builder.Services.AddOpenApi();

// 3. DbContext (SQLite)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<SurveyCreateRequestValidator>();
builder.Services.AddScoped<ISurveysService, SurveysService>();

// 5. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// 6. Настройка JSON (циклические ссылки)
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

// 7. Создание базы данных, только если файл отсутствует
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    // Извлекаем путь к файлу из строки подключения (формат "Data Source=app.db")
    var dataSource = new System.Data.Common.DbConnectionStringBuilder 
    { 
        ConnectionString = connectionString 
    }["Data Source"]?.ToString();

    if (!string.IsNullOrEmpty(dataSource) && !File.Exists(dataSource))
    {
        await db.Database.EnsureCreatedAsync();
        Console.WriteLine($"База данных создана: {dataSource}");
    }
    else
    {
        Console.WriteLine("База данных уже существует.");
    }
}

// 8. Инициализация тестовым пользователем (если таблица Users пуста)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!await db.Users.AnyAsync())
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
        Console.WriteLine("Добавлен тестовый пользователь.");
    }
}

// 9. Swagger UI (только для разработки)
if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Survey 360 Web App");
    });
}

// 10. OpenAPI endpoint
app.MapOpenApi();

// 11. CORS
app.UseCors("Frontend");

// 12. Маршруты
app.MapControllers();

// 13. Запуск приложения
await app.RunAsync();