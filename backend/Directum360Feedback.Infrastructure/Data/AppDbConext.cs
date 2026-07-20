using Microsoft.EntityFrameworkCore;
using Directum360Feedback.Domain.Entities;
using Directum360Feedback.Domain.Enums;

namespace Directum360Feedback.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<SurveyQuestion> SurveyQuestions { get; set; }
    public DbSet<QuestionTemplate> QuestionTemplates { get; set; }
    public DbSet<SurveyAssignment> SurveyAssignments { get; set; }
    public DbSet<Answer> Answers { get; set; }

    // --- Шаблоны респондентов ---
    public DbSet<RespondentTemplate> RespondentTemplates { get; set; }
    public DbSet<RespondentTemplateItem> RespondentTemplateItems { get; set; }
    public DbSet<RespondentTemplateTarget> RespondentTemplateTargets { get; set; }
    public DbSet<RespondentTemplateLink> RespondentTemplateLinks { get; set; }
    public DbSet<SurveyTemplate> SurveyTemplates { get; set; }
    public DbSet<SurveyTemplateQuestion> SurveyTemplateQuestions { get; set; }
    public DbSet<OneTimeCode> OneTimeCodes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Настройка отношений для SurveyAssignment
        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(a => a.Evaluator)
            .WithMany(e => e.AssignmentsAsEvaluator)
            .HasForeignKey(a => a.EvaluatorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SurveyAssignment>()
            .HasOne(a => a.Survey)
            .WithMany(s => s.Assignments)
            .HasForeignKey(a => a.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Настройка для SurveyQuestion
        modelBuilder.Entity<SurveyQuestion>()
            .HasOne(q => q.Survey)
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Настройка для Answer
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
        
        modelBuilder.Entity<SurveyTemplate>()
            .HasMany(t => t.Questions)
            .WithOne(q => q.SurveyTemplate)
            .HasForeignKey(q => q.SurveyTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed данные для Employee
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 1, FullName = "Иванов Иван Иванович", Email = "ivanov@example.com" },
            new Employee { Id = 2, FullName = "Петров Пётр Петрович", Email = "petrov@example.com" },
            new Employee { Id = 3, FullName = "Иванова Мария Ивановна", Email = "ivanova@example.com" },
            new Employee { Id = 4, FullName = "Александрова Александра Александровна", Email = "alexsandrovna@example.com" }
        );

        // Настройка для Survey (Author и Target)
        modelBuilder.Entity<Survey>()
            .HasOne(s => s.Author)
            .WithMany(e => e.AuthoredSurveys)
            .HasForeignKey(s => s.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Survey>()
            .HasOne(s => s.Target)
            .WithMany()
            .HasForeignKey(s => s.TargetId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed данные для QuestionTemplate (существующие)
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

        // Seed данные для SurveyTemplate (без коллекций)
        modelBuilder.Entity<SurveyTemplate>().HasData(
            new SurveyTemplate
            {
                Id = 1,
                Name = "Оценка профессиональных компетенций",
                Description = "Опрос для сбора обратной связи о профессиональных навыках и компетенциях сотрудника. " +
                              "Подходит для оценки как руководителей, так и специалистов.",
                CreatedAt = new DateTime(2025, 1, 1)
            },
            new SurveyTemplate
            {
                Id = 2,
                Name = "Оценка лидерских качеств",
                Description = "Опрос для сбора обратной связи о лидерских и управленческих навыках сотрудника. " +
                              "Подходит для оценки руководителей и сотрудников с потенциалом лидерства.",
                CreatedAt = new DateTime(2025, 1, 1)
            }
        );

        // Seed данные для SurveyTemplateQuestion (вопросы шаблонов)
        modelBuilder.Entity<SurveyTemplateQuestion>().HasData(
            // Шаблон 1
            new SurveyTemplateQuestion
            {
                Id = 1,
                SurveyTemplateId = 1,
                Text = "Как вы оцениваете уровень профессиональных знаний сотрудника в своей области?",
                Type = QuestionType.SingleChoice,
                Order = 1,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Требует развития\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 2,
                SurveyTemplateId = 1,
                Text = "Насколько сотрудник проявляет инициативу в решении рабочих задач?",
                Type = QuestionType.SingleChoice,
                Order = 2,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Всегда проявляет\",\"Часто\",\"Иногда\",\"Редко\",\"Никогда\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 3,
                SurveyTemplateId = 1,
                Text = "Как вы оцениваете способность сотрудника адаптироваться к изменениям?",
                Type = QuestionType.SingleChoice,
                Order = 3,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Плохо\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 4,
                SurveyTemplateId = 1,
                Text = "Насколько сотрудник умеет работать в команде и выстраивать отношения с коллегами?",
                Type = QuestionType.SingleChoice,
                Order = 4,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Плохо\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 5,
                SurveyTemplateId = 1,
                Text = "Как вы оцениваете качество выполнения задач сотрудником?",
                Type = QuestionType.SingleChoice,
                Order = 5,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Высокое\",\"Среднее\",\"Низкое\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 6,
                SurveyTemplateId = 1,
                Text = "Какие сильные стороны сотрудника вы можете выделить?",
                Type = QuestionType.Text,
                Order = 6,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = null
            },
            new SurveyTemplateQuestion
            {
                Id = 7,
                SurveyTemplateId = 1,
                Text = "Какие области для развития вы бы порекомендовали сотруднику?",
                Type = QuestionType.Text,
                Order = 7,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = null
            },
            new SurveyTemplateQuestion
            {
                Id = 8,
                SurveyTemplateId = 1,
                Text = "Как вы оцениваете общую эффективность сотрудника?",
                Type = QuestionType.SingleChoice,
                Order = 8,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Неудовлетворительно\"]"
            },
            // Шаблон 2
            new SurveyTemplateQuestion
            {
                Id = 9,
                SurveyTemplateId = 2,
                Text = "Как вы оцениваете способность сотрудника вдохновлять и мотивировать других?",
                Type = QuestionType.SingleChoice,
                Order = 1,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Требует развития\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 10,
                SurveyTemplateId = 2,
                Text = "Насколько сотрудник эффективно принимает решения в сложных ситуациях?",
                Type = QuestionType.SingleChoice,
                Order = 2,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Всегда эффективно\",\"Часто\",\"Иногда\",\"Редко\",\"Никогда\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 11,
                SurveyTemplateId = 2,
                Text = "Как вы оцениваете навыки делегирования задач сотрудником?",
                Type = QuestionType.SingleChoice,
                Order = 3,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Плохо\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 12,
                SurveyTemplateId = 2,
                Text = "Насколько сотрудник умеет разрешать конфликты в команде?",
                Type = QuestionType.SingleChoice,
                Order = 4,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Плохо\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 13,
                SurveyTemplateId = 2,
                Text = "Как вы оцениваете коммуникативные навыки сотрудника?",
                Type = QuestionType.SingleChoice,
                Order = 5,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Отлично\",\"Хорошо\",\"Удовлетворительно\",\"Плохо\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 14,
                SurveyTemplateId = 2,
                Text = "Насколько сотрудник способен брать на себя ответственность за результаты команды?",
                Type = QuestionType.SingleChoice,
                Order = 6,
                Required = true,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Всегда\",\"Часто\",\"Иногда\",\"Редко\",\"Никогда\"]"
            },
            new SurveyTemplateQuestion
            {
                Id = 15,
                SurveyTemplateId = 2,
                Text = "Какие сильные стороны как лидера вы можете выделить у этого сотрудника?",
                Type = QuestionType.Text,
                Order = 7,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = null
            },
            new SurveyTemplateQuestion
            {
                Id = 16,
                SurveyTemplateId = 2,
                Text = "Какие качества лидера сотруднику стоит развивать?",
                Type = QuestionType.Text,
                Order = 8,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = null
            },
            new SurveyTemplateQuestion
            {
                Id = 17,
                SurveyTemplateId = 2,
                Text = "Как вы оцениваете общий уровень лидерства сотрудника?",
                Type = QuestionType.SingleChoice,
                Order = 9,
                Required = false,
                CreatedAt = new DateTime(2025, 1, 1),
                Options = "[\"Высокий\",\"Выше среднего\",\"Средний\",\"Ниже среднего\",\"Низкий\"]"
            }
        );

        // ================= Шаблоны респондентов (добавлено) =================
        modelBuilder.Entity<RespondentTemplateItem>()
            .HasOne(i => i.Template)
            .WithMany(t => t.Items)
            .HasForeignKey(i => i.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        // EmployeeId необязателен: null = «сам оцениваемый» (самооценка).
        // Restrict — чтобы нельзя было удалить сотрудника, используемого в шаблоне.
        modelBuilder.Entity<RespondentTemplateItem>()
            .HasOne(i => i.Employee)
            .WithMany()
            .HasForeignKey(i => i.EmployeeId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // Оцениваемые, зашитые в шаблон (могут отсутствовать — тогда шаблон универсальный)
        modelBuilder.Entity<RespondentTemplateTarget>()
            .HasOne(t => t.Template)
            .WithMany(t => t.Targets)
            .HasForeignKey(t => t.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RespondentTemplateTarget>()
            .HasOne(t => t.Employee)
            .WithMany()
            .HasForeignKey(t => t.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Явные связи «кто кого оценивает» внутри шаблона (частичная матрица)
        modelBuilder.Entity<RespondentTemplateLink>()
            .HasOne(l => l.Template)
            .WithMany(t => t.Links)
            .HasForeignKey(l => l.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RespondentTemplateLink>()
            .HasOne(l => l.EvaluatorEmployee)
            .WithMany()
            .HasForeignKey(l => l.EvaluatorEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RespondentTemplateLink>()
            .HasOne(l => l.TargetEmployee)
            .WithMany()
            .HasForeignKey(l => l.TargetEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Одна и та же пара «оценивающий/оцениваемый» не может повторяться внутри шаблона
        modelBuilder.Entity<RespondentTemplateLink>()
            .HasIndex(l => new { l.TemplateId, l.EvaluatorEmployeeId, l.TargetEmployeeId })
            .IsUnique();

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
            new { Id = 1, TemplateId = 1, EmployeeId = (int?)null, Role = AssessmentRole.SelfAssessment, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 2, TemplateId = 1, EmployeeId = (int?)1, Role = AssessmentRole.Manager, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 3, TemplateId = 1, EmployeeId = (int?)2, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 4, TemplateId = 1, EmployeeId = (int?)3, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 5, TemplateId = 2, EmployeeId = (int?)2, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 6, TemplateId = 2, EmployeeId = (int?)3, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new { Id = 7, TemplateId = 2, EmployeeId = (int?)4, Role = AssessmentRole.Colleague, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
        
        modelBuilder.Entity<OneTimeCode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(10);
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Code);
        });
        
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 5, FullName = "Администратор", Email = "admin@directum360.ru", IsAdmin = true, CreatedAt = DateTime.UtcNow }
        );
    }
}