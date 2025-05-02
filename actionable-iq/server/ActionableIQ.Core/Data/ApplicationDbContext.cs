using ActionableIQ.Core.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Data
{
    /// <summary>
    /// Main database context for the application
    /// </summary>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        /// <summary>
        /// Users in the system
        /// </summary>
        public DbSet<User> Users { get; set; }

        /// <summary>
        /// Authentication providers for users
        /// </summary>
        public DbSet<UserAuthProvider> UserAuthProviders { get; set; }

        /// <summary>
        /// Refresh tokens for JWT authentication
        /// </summary>
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        /// <summary>
        /// Configure the database model
        /// </summary>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Remove hstore extension since we don't need it anymore
            // modelBuilder.HasPostgresExtension("hstore");
            
            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ProfileImageUrl).HasMaxLength(1024);
                
                // Explicitly ignore the Claims property as it should not be persisted
                entity.Ignore(u => u.Claims);
            });

            // Configure UserAuthProvider entity
            modelBuilder.Entity<UserAuthProvider>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.ProviderType, e.ProviderKey }).IsUnique();
                entity.Property(e => e.ProviderType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ProviderKey).IsRequired().HasMaxLength(256);
                entity.Property(e => e.Metadata).HasMaxLength(2048);

                // Configure relationship with User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.AuthProviders)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure RefreshToken entity
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.Property(e => e.Token).IsRequired().HasMaxLength(256);
                entity.Property(e => e.CreatedByIp).IsRequired().HasMaxLength(50);
                entity.Property(e => e.RevokedByIp).IsRequired(false).HasMaxLength(50);
                entity.Property(e => e.ReplacedByToken).IsRequired(false).HasMaxLength(256);
                entity.Property(e => e.ReasonRevoked).IsRequired(false).HasMaxLength(256);

                // Configure relationship with User
                entity.HasOne(e => e.User)
                      .WithMany(u => u.RefreshTokens)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }

        /// <summary>
        /// Override SaveChanges to automatically set UpdatedAt property
        /// </summary>
        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        /// <summary>
        /// Override SaveChangesAsync to automatically set UpdatedAt property
        /// </summary>
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Update timestamps for changed entities
        /// </summary>
        private void UpdateTimestamps()
        {
            var entities = ChangeTracker.Entries()
                .Where(x => x.Entity is BaseEntity && (x.State == EntityState.Added || x.State == EntityState.Modified));

            foreach (var entity in entities)
            {
                var baseEntity = (BaseEntity)entity.Entity;

                if (entity.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = DateTime.UtcNow;
                }
                else
                {
                    entity.Property("CreatedAt").IsModified = false;
                }

                baseEntity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
} 