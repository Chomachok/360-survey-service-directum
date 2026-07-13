using Microsoft.EntityFrameworkCore;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<SurveyQuestion> SurveyQuestions { get; set; }
    public DbSet<QuestionTemplate> QuestionTemplates { get; set; }
    public DbSet<SurveyAssignment> SurveyAssignments { get; set; }
    public DbSet<Answer> Answers { get; set; }
    public DbSet<RespondentTemplate> RespondentTemplates { get; set; }
    public DbSet<RespondentTemplateItem> RespondentTemplateItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 👇 Настройка отношений для SurveyAssignment
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(a => a.Evaluator)
            .WithMany(e => e.AssignmentsAsEvaluator)
            .HasForeignKey(a => a.EvaluatorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(a => a.Target)
            .WithMany(e => e.AssignmentsAsTarget)
            .HasForeignKey(a => a.TargetId)
            .OnDelete(DeleteBehavior.Restrict);

        // 👇 Настройка для SurveyQuestion
        modelBuilder.Entity<SurveyQuestion>()
            .HasOne(q => q.Survey)
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);

        // 👇 Настройка для Answer
        modelBuilder.Entity<Answer>()
            .HasOne(a => a.Assignment)
            .WithMany(a => a.Answers)
            .HasForeignKey(a => a.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.Question)
            .WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        // 👇 Шаблоны респондентов
        modelBuilder.Entity<RespondentTemplateItem>()
            .HasOne(i => i.Template)
            .WithMany(t => t.Items)
            .HasForeignKey(i => i.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // EmployeeId необязателен: null = «сам оцениваемый» (самооценка).
        // Restrict — чтобы нельзя было удалить сотрудника, который используется в шаблоне.
        modelBuilder.Entity<RespondentTemplateItem>()
            .HasOne(i => i.Employee)
            .WithMany()
            .HasForeignKey(i => i.EmployeeId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed данные
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 1, FullName = "Иванов Иван Иванович", Email = "ivanov@example.com" },
            new Employee { Id = 2, FullName = "Петров Пётр Петрович", Email = "petrov@example.com" },
            new Employee { Id = 3, FullName = "Иванова Мария Ивановна", Email = "ivanova@example.com" },
            new Employee { Id = 4, FullName = "Александрова Александра Александровна", Email = "alexsandrovna@example.com" }
        );

        modelBuilder.Entity<QuestionTemplate>().HasData(
            new QuestionTemplate
            {
                Id = 1,
                Name = "Общая производительность команды",
                Text = "Как вы оцениваете общую производительность команды?",
                Type = QuestionType.SingleChoice,
                Options = "[\"Отлично\",\"Хорошо\",\"Средне\",\"Плохо\",\"Ужасно\"]"
            },
            new QuestionTemplate
            {
                Id = 2,
                Name = "Обратная связь",
                Text = "Пожалуйста, оставьте дополнительные комментарии.",
                Type = QuestionType.Text,
                Options = null
            }
        );
        modelBuilder.Entity<RespondentTemplate>().HasData(
            new RespondentTemplate
            {
                Id = 1,
                Name = "Классическая 360",
                Description = "Самооценка + руководитель + два коллеги",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new RespondentTemplate
            {
                Id = 2,
                Name = "Только коллеги",
                Description = "Горизонтальная оценка без руководителя",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<RespondentTemplateItem>().HasData(
            // Классическая 360
            new { Id = 1, TemplateId = 1, EmployeeId = (int?)null, Role = AssessmentRole.SelfAssessment, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 2, TemplateId = 1, EmployeeId = (int?)1, Role = AssessmentRole.Manager, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 3, TemplateId = 1, EmployeeId = (int?)2, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 4, TemplateId = 1, EmployeeId = (int?)3, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            // Только коллеги
            new { Id = 5, TemplateId = 2, EmployeeId = (int?)2, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 6, TemplateId = 2, EmployeeId = (int?)3, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 7, TemplateId = 2, EmployeeId = (int?)4, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
