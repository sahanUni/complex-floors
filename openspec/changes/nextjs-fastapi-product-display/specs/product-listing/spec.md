## ADDED Requirements

### Requirement: Product list endpoint

Feature: FastAPI serves a list of products with prices

#### Scenario: Fetch all products
- **GIVEN** the FastAPI backend is running on port 8000
- **WHEN** a GET request is made to `/products`
- **THEN** the response is HTTP 200
- **AND** the response body is a JSON array of 3 objects, each with `name` and `price` fields

#### Scenario: CORS allows frontend origin
- **GIVEN** the FastAPI backend is running on port 8000
- **WHEN** a GET request is made from `http://localhost:3000`
- **THEN** the response includes `Access-Control-Allow-Origin: http://localhost:3000`

### Requirement: Product listing page

Feature: Next.js displays the product list fetched from the backend

#### Scenario: Products render on page load
- **GIVEN** the FastAPI backend is running and returns 3 products
- **WHEN** a user navigates to the Next.js app root (`/`)
- **THEN** the page displays a list of 3 products
- **AND** each product shows its name and price

#### Scenario: Product data matches backend response
- **GIVEN** the backend returns `[{"name": "Widget", "price": 9.99}, {"name": "Gadget", "price": 24.99}, {"name": "Doohickey", "price": 4.99}]`
- **WHEN** the Next.js page renders
- **THEN** all three product names and prices appear in the rendered HTML

## MODIFIED Requirements

## REMOVED Requirements
