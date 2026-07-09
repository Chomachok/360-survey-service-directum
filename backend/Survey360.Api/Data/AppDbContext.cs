using Microsoft.EntityFrameworkCore;
using Survey360.Api.Models;

namespace Survey360.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Template> Templates => Set<Template>();
    public DbSet<TemplateQuestion> TemplateQuestions => Set<TemplateQuestion>();
    public DbSet<Survey> Surveys => Set<Survey>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Answer> Answers => Set<Answer>();
}