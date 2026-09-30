# CreatorForge Application Flow

This document details the application flows, data lifecycles, and interactions for CreatorForge.

## 1. Application Overview Flow

```mermaid
flowchart TD
    Start[User Visits App] --> Landing[Landing Page]
    Landing --> AuthCheck{Is Authenticated?}
    AuthCheck -- No --> Auth[Login / Register]
    Auth --> AuthCheck
    AuthCheck -- Yes --> Dashboard[Dashboard / Projects List]
    
    Dashboard --> Settings[Brand Kit Settings]
    Dashboard --> ProjCreate[Create Project]
    Dashboard --> ProjOpen[Open Project]
    
    ProjCreate --> Workspace[Project Workspace]
    ProjOpen --> Workspace
    
    Workspace --> Upload[Media Upload]
    Workspace --> Chat[AI Chat]
    Workspace --> Remix[Content Remixing]
    
    Upload --> Workspace
    Chat --> Workspace
    Remix --> Workspace
    
    Workspace --> Dashboard
```

## 2. Authentication Flows

### Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant MongoDB
    
    User->>Frontend: Fills Registration Form
    Frontend->>Frontend: Validates Input (Zod)
    Frontend->>API: POST /api/auth/register (email, password, name)
    API->>API: Validate Request
    API->>MongoDB: Check if user exists
    MongoDB-->>API: User does not exist
    API->>API: Hash Password (bcrypt)
    API->>MongoDB: Create User
    MongoDB-->>API: User Created
    API->>API: Generate JWT
    API-->>Frontend: 201 Created (token, user object)
    Frontend->>Frontend: Store token in localStorage
    Frontend->>Frontend: Update AuthContext
    Frontend-->>User: Redirect to Dashboard
```

### Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant MongoDB
    
    User->>Frontend: Fills Login Form
    Frontend->>API: POST /api/auth/login
    API->>MongoDB: Find User by Email
    MongoDB-->>API: User Document
    API->>API: Compare Passwords (bcrypt)
    API->>API: Generate JWT
    API-->>Frontend: 200 OK (token, user object)
    Frontend->>Frontend: Store token, update Context
    Frontend-->>User: Redirect to Dashboard
```

### Protected Route Flow

```mermaid
flowchart TD
    Navigate[Navigate to /project/:id] --> CheckToken{Token in localStorage?}
    CheckToken -- No --> Redirect[Redirect to /login]
    CheckToken -- Yes --> ValidateToken[API Call with Token]
    ValidateToken --> APIValidate{Token Valid?}
    APIValidate -- No --> ClearStorage[Clear localStorage] --> Redirect
    APIValidate -- Yes --> LoadPage[Load Workspace]
```

## 3. Project Management Flows

### Create Project

1. User clicks "New Project" in Dashboard.
2. Frontend opens modal for project name/description.
3. User submits.
4. Frontend `POST /api/projects`.
5. API creates empty project in MongoDB, linked to User ID.
6. API returns `201 Created` with project ID.
7. Frontend routes to `/project/:id`.

### Delete Project

```mermaid
sequenceDiagram
    participant Frontend
    participant API
    participant MongoDB
    
    Frontend->>API: DELETE /api/projects/:id
    API->>MongoDB: Delete all Messages where projectId = id
    API->>MongoDB: Delete all Media where projectId = id
    API->>MongoDB: Delete Project where id = id
    API-->>Frontend: 200 OK
```

## 4. Media Upload Flow

### Single File Upload

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API (Express)
    participant Multer
    participant DB (MongoDB)
    participant Gemini
    
    User->>Frontend: Drops image file
    Frontend->>Frontend: Read file as Base64 / Blob
    Frontend->>API: POST /api/projects/:id/media (multipart/form-data)
    API->>Multer: Process upload
    Multer-->>API: File buffer available
    API->>API: Convert to Base64 String
    API->>Gemini: Auto-generate description/tags
    Gemini-->>API: "A picture of a dog..."
    API->>DB: Save Media Document (Base64, description, projectId)
    DB-->>API: Document Saved
    API-->>Frontend: 201 Created (media details)
    Frontend->>Frontend: Update ProjectContext state
    Frontend-->>User: Show file in gallery
```

## 5. AI Chat Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DB
    participant Gemini
    
    User->>Frontend: Types "Write a blog post about these images"
    Frontend->>API: POST /api/chat (message, projectId)
    API->>DB: Fetch Project Details & Brand Kit
    API->>DB: Fetch Project Media (Base64)
    API->>DB: Fetch Chat History
    API->>API: Assemble Context Prompt
    API->>Gemini: streamGenerateContent(prompt, media array)
    Gemini-->>API: Stream chunks
    API-->>Frontend: SSE Stream / Chunks
    Frontend->>Frontend: Render Markdown progressively
    Gemini-->>API: Stream complete
    API->>DB: Save User Message & AI Response to DB
```

## 6. Content Remixing Flow

```mermaid
flowchart TD
    Select[Select Media from Gallery] --> Action[Choose Remix Action e.g., Audio -> Blog]
    Action --> Submit[Submit Request]
    Submit --> API[POST /api/remix]
    API --> Assemble[Assemble Context: Media + Action Prompt + Brand Kit]
    Assemble --> Gemini[Gemini 2.0 Flash API]
    Gemini --> Result[Generated Content]
    Result --> DB[Save as new Text Asset]
    DB --> Response[Return to Frontend]
    Response --> View[Display in Remix Editor]
```

## 7. Brand Kit Flow
- User uploads brand colors, tone of voice guidelines, logo.
- Stored in User Document.
- Automatically prepended to Gemini system instructions: `You are an AI assistant. Follow these brand guidelines: {toneOfVoice}`.

## 8. Data Flow Diagrams

```mermaid
sequenceDiagram
    participant Component
    participant Axios
    participant Express
    participant Controller
    participant DB
    
    Component->>Axios: fetchProject()
    Axios->>Axios: Interceptor adds Bearer Token
    Axios->>Express: GET /api/projects/:id
    Express->>Express: authMiddleware validates JWT
    Express->>Controller: getProjectById()
    Controller->>DB: Project.findById()
    DB-->>Controller: data
    Controller-->>Express: res.json(data)
    Express-->>Axios: 200 OK
    Axios-->>Component: setProject(data)
```

## 9. Page Navigation Flow

```mermaid
flowchart LR
    Root[/] --> Login[/login]
    Root --> Register[/register]
    Root --> Dashboard[/dashboard] (Protected)
    Dashboard --> Settings[/settings/brandkit] (Protected)
    Dashboard --> Workspace[/project/:id] (Protected)
```

## 10. Edge Case Flows
- **Token Expiry**: Axios interceptor catches 401, clears localStorage, redirects to `/login`.
- **Large File**: Multer rejects file > 10MB, API sends 413 Payload Too Large, frontend shows Toast error.
- **Gemini Timeout**: API wraps Gemini call in timeout promise. On fail, returns 503 Service Unavailable.

## 11. Deployment Flow

```mermaid
flowchart TD
    Code[Source Code] --> Git[GitHub]
    Git --> Vercel[Vercel CI/CD]
    Git --> Render[Render CI/CD]
    Vercel --> Front[Frontend Live]
    Render --> Back[Backend Live]
    Back --> Atlas[MongoDB Atlas]
    Back --> GeminiAPI[Google API]
```
