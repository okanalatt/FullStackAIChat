
using ChatAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ChatAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options):base(options)
        {
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // EF Core'a bu sınıfı veritabanına kaydetmesini istemediğimizi söylüyoruz.
            modelBuilder.Entity<SentimentResponse>().HasNoKey();

            base.OnModelCreating(modelBuilder);
        }
        public DbSet<Message>Messages { get; set; }
        public DbSet<SentimentResponse> SentimentResponses { get; set; }
    }
}
