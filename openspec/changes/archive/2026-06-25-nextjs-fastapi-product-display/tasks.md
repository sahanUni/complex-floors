## 1. FastAPI Backend

- [x] 1.1 Create `backend/` directory and `main.py`
- [x] 1.2 Add `requirements.txt` with `fastapi` and `uvicorn`
- [x] 1.3 Define in-memory product list: Widget $9.99, Gadget $24.99, Doohickey $4.99
- [x] 1.4 Implement `GET /products` endpoint returning the product list as JSON
- [x] 1.5 Add CORS middleware allowing `http://localhost:3010`
- [x] 1.6 Verify backend starts: `uvicorn main:app --reload` and `GET http://localhost:8010/products` returns 3 products

## 2. Next.js Frontend

- [x] 2.1 Scaffold Next.js app in `frontend/` with `npx create-next-app@latest frontend --ts --app --no-tailwind --eslint --src-dir --import-alias "@/*"`
- [x] 2.2 Create `frontend/src/app/page.tsx` as a Server Component that fetches `http://localhost:8010/products`
- [x] 2.3 Render product list: display each product's `name` and `price`
- [x] 2.4 Verify frontend starts: `npm run dev` and `http://localhost:3010` shows all 3 products

## 3. Validate

- [x] 3.1 Start backend, start frontend, confirm product names and prices render correctly in browser
- [x] 3.2 Run `openspec validate nextjs-fastapi-product-display --type change --strict`
