import os

class Config:
    SQLALCHEMY_DATABASE_URI = (
        "mysql+pymysql://root:YktoejwnRiTMesuwIeMgDDNIyRxtwPVi"
        "@metro.proxy.rlwy.net:47605/railway"
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
