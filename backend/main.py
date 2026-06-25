from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3010"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

products = [
    {"name": "Widget", "price": 9.99},
    {"name": "Gadget", "price": 24.99},
    {"name": "Doohickey", "price": 4.99},
]


@app.get("/products")
def get_products():
    return products
