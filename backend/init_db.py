"""
Run once after setting up PostgreSQL to create all tables.
Command: python init_db.py
"""
from app.core.database import Base, engine
from app.models.orm import Job, Candidate, Screening  # noqa: registers all models

def main():
    print("Creating PostgreSQL tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created: jobs, candidates, screenings")
    print("✓ Database ready. You can now start the backend server.")

if __name__ == "__main__":
    main()
