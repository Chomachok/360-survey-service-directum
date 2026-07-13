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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Настройка отношений для SurveyAssignment
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

        // Seed данные
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 1, FullName = "Иванов Иван Иванович", Email = "ivanov@example.com" },
            new Employee { Id = 2, FullName = "Петров Пётр Петрович", Email = "petrov@example.com" },
            new Employee { Id = 3, FullName = "Иванова Мария Ивановна", Email = "ivanova@example.com" },
            new Employee { Id = 4, FullName = "Александрова Александра Александровна", Email = "alexsandrovna@example.com" }
        );
        
        modelBuilder.Entity<Survey>()
            .HasOne(s => s.Author)
            .WithMany(e => e.AuthoredSurveys)
            .HasForeignKey(s => s.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        // --- Настройка для Survey (Target, если нужно) ---
        modelBuilder.Entity<Survey>()
            .HasOne(s => s.Target)
            .WithMany() // если нет навигации с обратной стороны в Employee
            .HasForeignKey(s => s.TargetId)
            .OnDelete(DeleteBehavior.Restrict);

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
    }
}