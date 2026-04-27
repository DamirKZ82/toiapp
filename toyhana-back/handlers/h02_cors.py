"""
CORS middleware.
На dev — открыто всё для удобства отладки через браузер/Swagger UI.
На prod — сузить список доменов в config.py.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config


def setup_cors(app: FastAPI):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config['cors']['allow_origins'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )
