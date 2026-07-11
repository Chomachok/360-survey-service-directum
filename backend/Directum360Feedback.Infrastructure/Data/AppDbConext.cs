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

        // Seed данные
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 1, FullName = "John Doe", Email = "john@example.com" },
            new Employee { Id = 2, FullName = "Jane Smith", Email = "jane@example.com" },
            new Employee { Id = 3, FullName = "Bob Johnson", Email = "bob@example.com" }
        );

        modelBuilder.Entity<QuestionTemplate>().HasData(
            new QuestionTemplate
            {
                Id = 1,
                Name = "Overall Performance",
                Text = "How do you rate overall performance?",
                Type = QuestionType.SingleChoice,
                Options = "[\"Excellent\",\"Good\",\"Average\",\"Poor\"]"
            },
            new QuestionTemplate
            {
                Id = 2,
                Name = "Feedback Comment",
                Text = "Please provide any additional comments.",
                Type = QuestionType.Text,
                Options = null
            }
        );
    }
}