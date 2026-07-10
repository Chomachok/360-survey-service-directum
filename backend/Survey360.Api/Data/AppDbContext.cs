using Microsoft.EntityFrameworkCore;
using Survey360.Api.Entities;

namespace Survey360.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Survey> Surveys { get; set; }
    public DbSet<Template> Templates { get; set; }
    public DbSet<TemplateQuestion> TemplateQuestions { get; set; }
    public DbSet<QuestionOption> QuestionOptions { get; set; }
    public DbSet<Assignment> Assignments { get; set; }
    public DbSet<Answer> Answers { get; set; }
}