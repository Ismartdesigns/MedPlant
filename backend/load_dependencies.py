from sqlalchemy.orm import Session
from database import SessionLocal
from models import Dependency
import re

def parse_requirements():
    with open('requirements.txt', 'r') as f:
        requirements = f.readlines()
    
    deps = []
    for req in requirements:
        req = req.strip()
        if req and not req.startswith('#'):
            # Handle cases with and without version specifiers
            match = re.match(r'^([a-zA-Z0-9_\-\.]+)(?:==|>=|<=|>|<|~=)?([0-9\.]+)?', req)
            if match:
                package_name, version = match.groups()
                deps.append({
                    'package_name': package_name,
                    'version': version or 'latest'
                })
    return deps

def load_dependencies():
    db = SessionLocal()
    try:
        # Clear existing dependencies
        db.query(Dependency).delete()
        
        # Add new dependencies
        deps = parse_requirements()
        for dep in deps:
            db_dep = Dependency(**dep)
            db.add(db_dep)
        
        db.commit()
        print(f"Successfully loaded {len(deps)} dependencies into database")
    except Exception as e:
        print(f"Error loading dependencies: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_dependencies() 