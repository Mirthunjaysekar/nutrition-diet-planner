import os

class Config:
    # Railway injects MYSQL_URL automatically when you link the MySQL service
    # Falls back to your existing hardcoded values if not found
    _mysql_url = os.environ.get("MYSQL_URL") or os.environ.get("MYSQL_PUBLIC_URL")

    if _mysql_url:
        # Railway gives: mysql://user:pass@host:port/db
        # SQLAlchemy needs: mysql+pymysql://user:pass@host:port/db
        SQLALCHEMY_DATABASE_URI = _mysql_url.replace("mysql://", "mysql+pymysql://", 1)
    else:
        # Fallback to individual variables
        MYSQL_HOST     = os.environ.get("MYSQLHOST", "yamabiko.proxy.rlwy.net")
        MYSQL_PORT     = os.environ.get("MYSQLPORT", "25698")
        MYSQL_USER     = os.environ.get("MYSQLUSER", "root")
        MYSQL_PASSWORD = os.environ.get("MYSQLPASSWORD", "rIWVkIdRhMNFYGjchBEKZYmedSbNtsrP")
        MYSQL_DB       = os.environ.get("MYSQLDATABASE", "railway")
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
            f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_timeout": 20,
        "pool_size": 5,
        "max_overflow": 2,
        "connect_args": {"connect_timeout": 10}
    }
