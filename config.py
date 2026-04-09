# scripts/config.py
class Config:
    MYSQL_HOST     = "yamabiko.proxy.rlwy.net"
    MYSQL_PORT     = 25698
    MYSQL_USER     = "root"
    MYSQL_PASSWORD = "rIWVkIdRhMNFYGjchBEKZYmedSbNtsrP"
    MYSQL_DB       = "railway"

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False