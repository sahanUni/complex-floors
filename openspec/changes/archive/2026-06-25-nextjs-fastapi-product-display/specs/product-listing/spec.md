## ADDED Requirements

### Requirement: Product list endpoint

The backend MUST expose a product list endpoint that returns all products.

#### Scenario: Fetch all products
- **GIVEN** the FastAPI backend is running on port 8010
- **WHEN** a GET request is made to `/products`
- **THEN** the response SHALL be HTTP 200
- **AND** the response body SHALL be a JSON array of 3 objects, each with `name` and `price` fields

#### Scenario: CORS allows frontend origin
- **GIVEN** the FastAPI backend is running on port 8010
- **WHEN** a GET request is made from `http://localhost:3010`
- **THEN** the response SHALL include `Access-Control-Allow-Origin: http://localhost:3010`

### Requirement: Product listing page

The frontend MUST display the product list fetched from the backend.

#### Scenario: Products render on page load
- **GIVEN** the FastAPI backend is running and returns 3 products
- **WHEN** a user navigates to the Next.js app root (`/`)
- **THEN** the page SHALL display a list of 3 products
- **AND** each product SHALL show its name and price

#### Scenario: Product data matches backend response
- **GIVEN** the backend returns `[{"name": "Widget", "price": 9.99}, {"name": "Gadget", "price": 24.99}, {"name": "Doohickey", "price": 4.99}]`
- **WHEN** the Next.js page renders
- **THEN** all three product names and prices MUST appear in the rendered HTML

## MODIFIED Requirements

## REMOVED Requirements
