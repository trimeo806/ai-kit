# Kiến Trúc Phần Mềm: NextJS, Golang, Coupling & Clean Architecture

> Ngày: 2026-03-23

---

## Mục lục

1. [Kiến Trúc & Tổ Chức Folder](#1-kiến-trúc--tổ-chức-folder)
   - [1.1 NextJS Frontend](#11-nextjs-frontend)
   - [1.2 Golang Backend](#12-golang-backend)
2. [Giảm Sự Phụ Thuộc (Coupling)](#2-giảm-sự-phụ-thuộc-coupling)
3. [Clean Architecture & Hexagonal Architecture](#3-clean-architecture--hexagonal-architecture)
   - [3.1 Clean Architecture](#31-clean-architecture)
   - [3.2 Hexagonal Architecture](#32-hexagonal-architecture)
   - [3.3 So sánh hai kiến trúc](#33-clean-architecture-vs-hexagonal)
   - [3.4 Khi nào dùng gì](#34-khi-nào-dùng-gì)

---

## 1. Kiến Trúc & Tổ Chức Folder

---

### 1.1 NextJS Frontend

---

#### A. Feature-Based Architecture ⭐ Phổ biến nhất cho SaaS

**Tư tưởng:** Tổ chức theo tính năng nghiệp vụ — mỗi feature tự chứa tất cả code liên quan.

```
src/
├── app/                        # Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx
│   └── layout.tsx
│
├── features/                   # Core: mỗi feature = 1 thế giới riêng
│   ├── auth/
│   │   ├── components/         # UI components của feature này
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/           # API calls
│   │   │   └── authService.ts
│   │   ├── store/              # State (zustand/redux slice)
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts            # ⚠️ Public API — chỉ export những gì cần thiết
│   │
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductList.tsx
│   │   │   └── ProductCard.tsx
│   │   ├── hooks/
│   │   │   └── useProducts.ts
│   │   ├── services/
│   │   │   └── productService.ts
│   │   └── index.ts
│   │
│   └── orders/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
│
├── shared/                     # Dùng chung toàn app
│   ├── components/
│   │   ├── ui/                 # shadcn/ui, buttons, inputs...
│   │   └── layout/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── lib/                        # Config, setup (axios instance, etc.)
└── config/
```

**Dependency flow:**
```
app/ pages
  └─► features/[feature]/components
        ├─► features/[feature]/hooks
        └─► features/[feature]/services ──► lib/api

features/X ──► shared/          ✅ OK
features/X ──► features/Y       ❌ Anti-pattern — tránh tuyệt đối
```

**Ví dụ thực tế:** [Bulletproof React](https://github.com/alan2207/bulletproof-react), Cal.com, Vercel Dashboard

| Pros | Cons |
|------|------|
| Dễ tìm code theo nghiệp vụ | Dễ trùng lặp nếu shared không rõ ràng |
| Team khác nhau làm feature khác nhau | Features phụ thuộc chéo nhau dễ xảy ra |
| Xóa feature = xóa 1 folder | Khó xác định boundary lúc ban đầu |
| Onboarding nhanh hơn 45% | Over-engineering với app nhỏ |

---

#### B. Domain-Based / Layered Architecture

**Tư tưởng:** Tổ chức theo technical layer, phù hợp với DDD.

```
src/
├── domain/                     # Business entities, interfaces thuần túy
│   ├── user/
│   │   ├── User.ts             # Entity
│   │   ├── UserRepository.ts   # Interface (port)
│   │   └── UserService.ts      # Domain logic
│   └── product/
│       ├── Product.ts
│       └── ProductRepository.ts
│
├── application/                # Use cases, orchestration
│   ├── user/
│   │   ├── CreateUserUseCase.ts
│   │   └── GetUserUseCase.ts
│   └── product/
│       └── ListProductsUseCase.ts
│
├── infrastructure/             # Concrete implementations
│   ├── api/                    # HTTP clients
│   │   └── userApi.ts
│   └── storage/                # localStorage, etc.
│
└── presentation/               # React components
    ├── pages/
    └── components/
```

**Dependency direction:**
```
presentation → application → domain ← infrastructure

Domain không biết gì về presentation hay infrastructure.
```

| Pros | Cons |
|------|------|
| Separation rõ ràng theo layer | Nhiều file phải tạo |
| Testable — domain không có external dep | Cứng nhắc với app nhỏ |
| Phù hợp DDD | Khó hiểu với người mới |

---

#### C. Atomic Design

**Tư tưởng:** Tổ chức UI component theo độ phức tạp.

```
src/
├── components/
│   ├── atoms/          # Button, Input, Label (nguyên tử — không thể chia nhỏ hơn)
│   ├── molecules/      # SearchBar = Input + Button
│   ├── organisms/      # ProductCard = Image + Title + Price + Button
│   ├── templates/      # Layout với placeholder, chưa có data thật
│   └── pages/          # Template + data cụ thể
└── ...
```

| Pros | Cons |
|------|------|
| Tái sử dụng component tốt | Khó phân loại atom/molecule/organism |
| Phù hợp Storybook | Không tổ chức theo business feature |
| Design system rõ ràng | Thường dùng kết hợp với Feature-based |

---

### 1.2 Golang Backend

---

#### A. Standard Project Layout (golang-standards) ⭐ Khởi đầu tốt

```
myapp/
├── cmd/
│   ├── api/
│   │   └── main.go         # Entry point cho API server
│   └── worker/
│       └── main.go         # Entry point cho background worker
│
├── internal/               # ⚠️ Private — Go compiler ngăn import từ module ngoài
│   ├── domain/             # Business entities & interfaces
│   │   ├── user.go
│   │   ├── order.go
│   │   └── repository.go   # Interfaces
│   ├── service/            # Business logic
│   │   ├── user_service.go
│   │   └── order_service.go
│   ├── repository/         # DB implementations
│   │   ├── postgres/
│   │   │   └── user_repo.go
│   │   └── redis/
│   │       └── cache.go
│   └── handler/            # HTTP handlers
│       ├── user_handler.go
│       └── order_handler.go
│
├── pkg/                    # Public — có thể import bởi project khác
│   ├── logger/
│   ├── validator/
│   └── middleware/
│
├── api/                    # OpenAPI/Swagger specs, proto files
│   └── openapi.yaml
│
├── migrations/             # SQL migrations
├── config/
│   └── config.go
├── docker-compose.yml
└── Makefile
```

**Dependency flow:**
```
cmd/ ──► internal/handler ──► internal/service ──► internal/domain
                          └──► internal/repository (via interface)
internal/repository/postgres ──► internal/domain (implement interface)
```

| Pros | Cons |
|------|------|
| Chuẩn cộng đồng Go | Chưa enforce layer separation |
| `internal/` ngăn import không hợp lệ | Có thể bị flat nếu không có convention |
| Rõ ràng multiple binaries | |

---

#### B. Layered Monolith (Clean Architecture style) ⭐ Recommended

```
internal/
├── domain/                 # Layer 0: Zero dependencies
│   ├── entity/
│   │   ├── user.go
│   │   └── order.go
│   ├── repository/         # Interfaces — defined here, implemented in infra
│   │   ├── user_repository.go
│   │   └── order_repository.go
│   └── service/            # Domain services (pure business logic)
│       └── pricing.go
│
├── usecase/                # Layer 1: Depends only on domain
│   ├── user/
│   │   ├── create_user.go
│   │   ├── get_user.go
│   │   └── interfaces.go   # Input/Output ports
│   └── order/
│       ├── place_order.go
│       └── interfaces.go
│
├── infrastructure/         # Layer 2: External concerns
│   ├── postgres/
│   │   └── user_repo.go    # Implements domain.UserRepository
│   ├── redis/
│   │   └── cache.go
│   └── email/
│       └── smtp.go
│
└── delivery/               # Layer 3: Entry points
    ├── http/
    │   ├── handler/
    │   ├── middleware/
    │   └── router.go
    └── grpc/
        └── server.go
```

| Pros | Cons |
|------|------|
| Separation of concerns rõ ràng | Nhiều package/file hơn |
| Dễ test từng layer | Cần hiểu DI để wire-up |
| Domain không phụ thuộc framework | |

---

#### C. Modular Monolith (Vertical Slice) ⭐ Xu hướng 2024-2025

**Tư tưởng:** Tổ chức theo domain module, mỗi module tự chứa đủ (handler + service + repo).

```
internal/
├── auth/               # Module tự chứa (vertical slice)
│   ├── domain.go       # Entities, interfaces
│   ├── service.go      # Business logic
│   ├── handler.go      # HTTP handlers
│   ├── repository.go   # DB access
│   └── module.go       # Wire everything together
│
├── order/
│   ├── domain.go
│   ├── service.go
│   ├── handler.go
│   ├── repository.go
│   └── module.go
│
├── payment/
│   ├── domain.go
│   ├── service.go
│   └── module.go
│
└── shared/             # Cross-cutting concerns
    ├── database/
    ├── logger/
    └── events/         # In-process event bus
```

**Modules giao tiếp qua interfaces — không gọi trực tiếp:**
```go
// order/module.go — phụ thuộc vào interface, không phụ thuộc payment package
type PaymentGateway interface {
    Charge(ctx context.Context, amount Money) error
}
```

| Pros | Cons |
|------|------|
| Dễ tách thành microservice sau | Ranh giới module cần thiết kế kỹ |
| Team làm việc độc lập | Shared state phức tạp hơn |
| Dễ hiểu hơn strict layered | |

---

#### D. Microservices với Golang

```
services/
├── user-service/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── domain/
│   │   ├── usecase/
│   │   ├── repository/
│   │   └── transport/
│   │       ├── grpc/
│   │       └── http/
│   └── proto/
│       └── user.proto
│
├── order-service/
│   └── ...
│
├── payment-service/
│   └── ...
│
└── gateway/            # API Gateway
    └── ...
```

| Pros | Cons |
|------|------|
| Scale độc lập từng service | Phức tạp về ops, networking |
| Deploy độc lập | Distributed tracing khó hơn |
| Tech stack linh hoạt | Over-engineering khi team nhỏ |

---

## 2. Giảm Sự Phụ Thuộc (Coupling)

---

### Tư duy cốt lõi

> **"Depend on abstractions, not concretions"**

Trước khi viết code, tự hỏi 3 câu:

1. **"Nếu tôi thay thế X bằng Y, tôi cần sửa bao nhiêu chỗ?"** → Ít = tốt
2. **"Component này có thể test độc lập không?"** → Có = tốt
3. **"Thêm 1 feature mới có cần sửa code cũ không?"** → Không = tốt

---

### Ví dụ 1: Dependency Injection (DI)

**Vấn đề:** Service tự tạo dependency → coupled cứng, không test được.

```go
// ❌ BAD: OrderService tự tạo EmailService
type OrderService struct{}

func (s *OrderService) PlaceOrder(order Order) error {
    // Business logic...
    emailSvc := NewEmailService()  // Coupled! Không test được, không swap được
    emailSvc.Send(order.UserEmail, "Order placed")
    return nil
}
```

```go
// ✅ GOOD: Inject dependency qua interface
type Notifier interface {
    Send(to, message string) error
}

type OrderService struct {
    notifier Notifier  // Depend on abstraction
}

func NewOrderService(n Notifier) *OrderService {
    return &OrderService{notifier: n}
}

func (s *OrderService) PlaceOrder(order Order) error {
    // Business logic...
    s.notifier.Send(order.UserEmail, "Order placed")
    return nil
}

// --- Test: inject mock ---
type MockNotifier struct{ sent []string }
func (m *MockNotifier) Send(to, msg string) error {
    m.sent = append(m.sent, to)
    return nil
}

// --- Production: inject email ---
svc := NewOrderService(&EmailService{smtpConfig})

// --- Swap to SMS, không đổi OrderService ---
svc := NewOrderService(&SMSService{twilioConfig})
```

| Pros | Cons |
|------|------|
| Dễ test (inject mock) | Boilerplate wire-up |
| Swap implementation dễ dàng | Có thể khó đọc với người mới |
| Không sửa business logic khi thay infra | Cần DI container cho app lớn |

---

### Ví dụ 2: Interface Segregation (Tách interface nhỏ)

**Vấn đề:** Interface lớn buộc mọi consumer phải phụ thuộc vào methods không cần.

```go
// ❌ BAD: Fat interface — service chỉ cần FindByID nhưng phụ thuộc 15 methods
type UserRepository interface {
    FindByID(id int) (*User, error)
    FindByEmail(email string) (*User, error)
    Create(user *User) error
    Update(user *User) error
    Delete(id int) error
    FindAll() ([]*User, error)
    Count() (int, error)
    // ...nhiều method nữa
}
```

```go
// ✅ GOOD: Tách nhỏ theo use case
type UserFinder interface {
    FindByID(id int) (*User, error)
}

type UserCreator interface {
    Create(user *User) error
}

type UserDeleter interface {
    Delete(id int) error
}

// Mỗi service chỉ depend vào interface nó cần
type GetUserService struct {
    finder UserFinder  // Chỉ 1 method, mock cực đơn giản
}

type CreateUserService struct {
    creator UserCreator
}

// Compose khi cần nhiều hơn
type UserWriter interface {
    UserCreator
    UserDeleter
}
```

| Pros | Cons |
|------|------|
| Mock nhỏ, test nhanh | Nhiều interface nhỏ → khó track |
| Rõ ràng service cần gì | Over-engineering với CRUD đơn giản |
| Thay đổi 1 method không ảnh hưởng service khác | |

---

### Ví dụ 3: Package Boundaries với `index.ts` (NextJS)

**Vấn đề:** Import trực tiếp vào nội bộ feature tạo tight coupling — refactor nội bộ phá toàn bộ.

```typescript
// ❌ BAD: import sâu vào nội bộ feature khác
import { formatUserName } from '@/features/auth/utils/nameFormatter'
import { UserAvatar } from '@/features/auth/components/UserAvatar'
import { authStore } from '@/features/auth/store/zustandStore'
// Thay đổi cấu trúc nội bộ auth → phá toàn bộ app
```

```typescript
// ✅ GOOD: Chỉ expose qua public API

// features/auth/index.ts — Public API của feature
export { LoginForm } from './components/LoginForm'
export { useAuth } from './hooks/useAuth'
export type { User, AuthState } from './types/auth.types'
// KHÔNG export internal utilities, stores, helpers...

// Sử dụng đúng cách — không biết cấu trúc nội bộ
import { LoginForm, useAuth } from '@/features/auth'
```

**Enforce bằng ESLint:**
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        "@/features/*/components/*",
        "@/features/*/hooks/*",
        "@/features/*/store/*"
      ]
    }]
  }
}
```

| Pros | Cons |
|------|------|
| Refactor nội bộ tự do | Cần discipline giữ index.ts gọn |
| API rõ ràng, dễ review | Lúc đầu setup tốn công |
| Giống `internal/` trong Golang | |

---

### Ví dụ 4: Event-Driven Decoupling

**Vấn đề:** Một action kéo theo nhiều side effects → OrderService biết quá nhiều.

```go
// ❌ BAD: Thêm feature mới → sửa OrderService
func (s *OrderService) PlaceOrder(order Order) error {
    s.db.Save(order)
    s.emailSvc.SendConfirmation(order)    // Dep 1
    s.inventorySvc.Decrement(order)       // Dep 2
    s.analyticsSvc.Track("order_placed")  // Dep 3
    s.loyaltySvc.AddPoints(order)         // Dep 4
    return nil
}
```

```go
// ✅ GOOD: Event bus — OrderService không biết ai handle
type EventBus interface {
    Publish(event DomainEvent) error
}

func (s *OrderService) PlaceOrder(order Order) error {
    s.db.Save(order)
    s.events.Publish(OrderPlacedEvent{Order: order})
    // Xong. Không biết và không quan tâm ai subscribe
    return nil
}

// Subscriber độc lập — thêm/xóa không ảnh hưởng OrderService
type EmailHandler struct{}
func (h *EmailHandler) Handle(e OrderPlacedEvent) { /* gửi email */ }

type InventoryHandler struct{}
func (h *InventoryHandler) Handle(e OrderPlacedEvent) { /* giảm tồn kho */ }

// Thêm loyalty feature: chỉ thêm 1 handler, không đụng code cũ
type LoyaltyHandler struct{}
func (h *LoyaltyHandler) Handle(e OrderPlacedEvent) { /* cộng điểm */ }
```

| Pros | Cons |
|------|------|
| Thêm feature = thêm handler, không sửa code cũ | Khó trace flow khi debug |
| Service không biết về nhau | Async events phức tạp hơn |
| Dễ scale từng handler riêng | Cần event schema versioning |

---

## 3. Clean Architecture & Hexagonal Architecture

---

### 3.1 Clean Architecture

**Định nghĩa:** Kiến trúc vòng tròn đồng tâm — dependency chỉ đi từ ngoài vào trong. Layer trong không bao giờ biết đến layer ngoài.

```
         ┌─────────────────────────────────────┐
         │       Frameworks & Drivers           │ ← DB, HTTP, UI, External APIs
         │  ┌─────────────────────────────┐    │
         │  │     Interface Adapters       │    │ ← Controllers, Gateways, Presenters
         │  │  ┌───────────────────────┐  │    │
         │  │  │    Application Layer   │  │    │ ← Use Cases
         │  │  │  ┌─────────────────┐  │  │    │
         │  │  │  │  Domain/Entities │  │  │    │ ← Business Rules (CORE)
         │  │  │  └─────────────────┘  │  │    │
         │  │  └───────────────────────┘  │    │
         │  └─────────────────────────────┘    │
         └─────────────────────────────────────┘

         ⬅️ Dependency direction (luôn hướng vào trong)
```

**Các tầng:**

| Layer | Golang Package | Nội dung |
|-------|---------------|----------|
| **Domain/Entities** | `internal/domain` | Struct, business rules — zero import |
| **Use Cases** | `internal/usecase` | Orchestrate domain, define input/output ports |
| **Interface Adapters** | `internal/delivery`, `internal/repository` | HTTP handlers, DB adapters |
| **Frameworks** | `cmd/`, external libs | main.go, gin, gorm, kafka |

---

**Ví dụ đầy đủ: Order system (Golang)**

```go
// ===== LAYER 1: DOMAIN =====
// internal/domain/order.go — ZERO external imports
package domain

import (
    "context"
    "errors"
)

var ErrEmptyOrder = errors.New("order must have at least one item")

type OrderStatus string
const (
    StatusPending   OrderStatus = "pending"
    StatusConfirmed OrderStatus = "confirmed"
)

type Order struct {
    ID     int
    UserID int
    Items  []OrderItem
    Status OrderStatus
}

// Business rule — sống trong domain, không phụ thuộc gì
func (o *Order) Confirm() error {
    if len(o.Items) == 0 {
        return ErrEmptyOrder
    }
    o.Status = StatusConfirmed
    return nil
}

// Interface DEFINED in domain, IMPLEMENTED in infrastructure
type OrderRepository interface {
    Save(ctx context.Context, order *Order) error
    FindByID(ctx context.Context, id int) (*Order, error)
}

type Notifier interface {
    Notify(userID int, message string) error
}
```

```go
// ===== LAYER 2: USE CASE =====
// internal/usecase/order/place_order.go
package order

import (
    "context"
    "myapp/internal/domain"
)

type PlaceOrderInput struct {
    UserID int
    Items  []ItemInput
}

type PlaceOrderOutput struct {
    OrderID int
    Status  string
}

type PlaceOrderUseCase struct {
    repo     domain.OrderRepository  // Interface
    notifier domain.Notifier         // Interface
}

func NewPlaceOrderUseCase(r domain.OrderRepository, n domain.Notifier) *PlaceOrderUseCase {
    return &PlaceOrderUseCase{repo: r, notifier: n}
}

func (uc *PlaceOrderUseCase) Execute(ctx context.Context, input PlaceOrderInput) (*PlaceOrderOutput, error) {
    order := domain.NewOrder(input.UserID, toItems(input.Items))

    if err := order.Confirm(); err != nil {  // Domain business rule
        return nil, err
    }
    if err := uc.repo.Save(ctx, order); err != nil {
        return nil, err
    }

    uc.notifier.Notify(order.UserID, "Order confirmed")

    return &PlaceOrderOutput{OrderID: order.ID, Status: string(order.Status)}, nil
}
```

```go
// ===== LAYER 3: INFRASTRUCTURE =====
// internal/infrastructure/postgres/order_repo.go
package postgres

import (
    "context"
    "database/sql"
    "myapp/internal/domain"
)

// Implements domain.OrderRepository
type OrderRepo struct {
    db *sql.DB
}

func NewOrderRepo(db *sql.DB) *OrderRepo {
    return &OrderRepo{db: db}
}

func (r *OrderRepo) Save(ctx context.Context, order *domain.Order) error {
    _, err := r.db.ExecContext(ctx,
        "INSERT INTO orders (user_id, status) VALUES ($1, $2)",
        order.UserID, order.Status)
    return err
}

func (r *OrderRepo) FindByID(ctx context.Context, id int) (*domain.Order, error) {
    // ...
    return nil, nil
}
```

```go
// ===== LAYER 4: DELIVERY =====
// internal/delivery/http/order_handler.go
package http

import (
    "myapp/internal/usecase/order"
    "github.com/gin-gonic/gin"
)

type OrderHandler struct {
    placeOrder *order.PlaceOrderUseCase
}

func (h *OrderHandler) PlaceOrder(c *gin.Context) {
    var req PlaceOrderRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    output, err := h.placeOrder.Execute(c.Request.Context(), toInput(req))
    if err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, output)
}
```

```go
// ===== WIRING — cmd/api/main.go =====
func main() {
    db := postgres.Connect(cfg.DSN)

    // Bottom-up wiring: infra → usecase → handler
    orderRepo := postgres.NewOrderRepo(db)
    notifier  := email.NewNotifier(cfg.SMTP)
    placeOrder := order.NewPlaceOrderUseCase(orderRepo, notifier)
    orderHandler := httpdelivery.NewOrderHandler(placeOrder)

    router := gin.New()
    router.POST("/orders", orderHandler.PlaceOrder)
    router.Run(":8080")
}
```

**Clean Architecture Pros & Cons:**

| Pros | Cons |
|------|------|
| Testable — domain test không cần DB/HTTP | Boilerplate nhiều (4+ layers) |
| Framework-independent | Over-engineering với CRUD app đơn giản |
| Dễ swap infrastructure (Postgres → MongoDB) | Learning curve cao |
| Business logic tập trung, rõ ràng | Nhiều boundary objects (DTO) |
| Dễ maintain dài hạn | Khó justify cho startup MVP |

---

### 3.2 Hexagonal Architecture (Ports & Adapters)

**Định nghĩa:** Business logic là trung tâm (hexagon). Bên ngoài có **Ports** (interfaces) và **Adapters** (implementations). Mọi giao tiếp với thế giới bên ngoài đều qua ports.

```
             LEFT (Driving/Input)        RIGHT (Driven/Output)
             Thế giới gọi vào ta         Ta gọi ra thế giới

  HTTP ──► [HTTP Adapter]                      [DB Adapter] ──► Postgres
  gRPC ──► [gRPC Adapter]  ──►  [  PORT  ]    [MQ Adapter] ──► Kafka
  CLI  ──► [CLI Adapter]        │           │  [Email Adapter] ──► SMTP
                                │  BUSINESS │
                                │   LOGIC   │  ◄── [  PORT  ]
                                │           │
                                └───────────┘
```

**Ports = Interfaces. Adapters = Implementations.**

```
Driving Adapters ──► Input Ports ──► Core ──► Output Ports ──► Driven Adapters
(HTTP, gRPC, CLI)   (how world     (business  (how we call    (DB, Email, Queue)
                     calls us)      logic)     the world)
```

---

**Ví dụ đầy đủ: Golang Hexagonal**

```go
// ===== PORTS =====

// ports/input_ports.go — "Driving" ports
package ports

type OrderInputPort interface {
    PlaceOrder(ctx context.Context, req PlaceOrderReq) (*PlaceOrderResp, error)
    GetOrder(ctx context.Context, id int) (*Order, error)
}

// ports/output_ports.go — "Driven" ports
type OrderStoragePort interface {
    Save(ctx context.Context, order *Order) error
    FindByID(ctx context.Context, id int) (*Order, error)
}

type NotificationPort interface {
    Notify(userID int, message string) error
}
```

```go
// ===== CORE (Business Logic) =====
// core/order_service.go — không biết HTTP, DB, hay gì cả

package core

type OrderService struct {
    storage  ports.OrderStoragePort
    notifier ports.NotificationPort
}

func NewOrderService(s ports.OrderStoragePort, n ports.NotificationPort) *OrderService {
    return &OrderService{storage: s, notifier: n}
}

// Implements ports.OrderInputPort
func (s *OrderService) PlaceOrder(ctx context.Context, req ports.PlaceOrderReq) (*ports.PlaceOrderResp, error) {
    order := NewOrder(req.UserID, req.Items)
    if err := order.Validate(); err != nil {
        return nil, err
    }
    s.storage.Save(ctx, order)
    s.notifier.Notify(order.UserID, "Order confirmed")
    return &ports.PlaceOrderResp{ID: order.ID}, nil
}
```

```go
// ===== DRIVEN ADAPTERS (Output) =====
// adapters/driven/postgres_adapter.go

package driven

// Implements ports.OrderStoragePort
type PostgresAdapter struct{ db *sql.DB }

func (a *PostgresAdapter) Save(ctx context.Context, order *core.Order) error {
    _, err := a.db.ExecContext(ctx, "INSERT INTO orders ...", order.UserID)
    return err
}
```

```go
// ===== DRIVING ADAPTERS (Input) =====
// adapters/driving/http_adapter.go

package driving

type HTTPAdapter struct {
    orderSvc ports.OrderInputPort  // Gọi vào core qua port
}

func (a *HTTPAdapter) HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
    var req core.PlaceOrderReq
    json.NewDecoder(r.Body).Decode(&req)
    resp, _ := a.orderSvc.PlaceOrder(r.Context(), req)
    json.NewEncoder(w).Encode(resp)
}

// adapters/driving/grpc_adapter.go
// Thêm gRPC mà KHÔNG đổi core hay HTTP adapter
type GRPCAdapter struct {
    orderSvc ports.OrderInputPort
}

func (a *GRPCAdapter) PlaceOrder(ctx context.Context, req *pb.PlaceOrderReq) (*pb.PlaceOrderResp, error) {
    resp, err := a.orderSvc.PlaceOrder(ctx, toCore(req))
    return toPB(resp), err
}
```

**Hexagonal Architecture Pros & Cons:**

| Pros | Cons |
|------|------|
| Swap HTTP ↔ gRPC ↔ CLI không đổi core | Naming convention dễ nhầm lẫn |
| Test core với stub adapters cực nhanh | Adapter proliferation với nhiều integrations |
| Clear integration points | Cần team hiểu pattern để có lợi |
| Tốt cho multi-protocol services | |

---

### 3.3 Clean Architecture vs Hexagonal

| | Clean Architecture | Hexagonal Architecture |
|---|---|---|
| **Metaphor** | Vòng tròn đồng tâm | Hình lục giác với cổng |
| **Focus** | Layer separation | Isolating business from I/O |
| **Ports** | Implicit (interfaces) | Explicit (named ports concept) |
| **Adapters** | "Interface Adapters" layer | Named driving/driven adapters |
| **Dependency Rule** | Inward only | Inward only |
| **Best for** | Nói về layer responsibility | Nói về integration points |
| **Overlap** | Lớn — cùng dependency rule | Lớn — cùng inversion principle |

> **Thực tế:** Nhiều dự án dùng cả hai — CA cho cấu trúc tổng thể, Hexagonal cho tư duy về I/O.

---

### 3.4 Khi nào dùng gì?

| Scenario | Frontend (NextJS) | Backend (Golang) |
|---|---|---|
| App nhỏ < 10 features | Feature-based | Standard layout + simple services |
| SaaS trung bình 10–50 features | Feature-based ⭐ | Modular monolith + layered |
| App lớn 50+ features | Domain-based | Clean Architecture |
| Multiple teams | Feature-based (1 team = 1 feature) | Modular monolith / Microservices |
| High testability | Domain-based | Clean / Hexagonal |
| Legacy refactoring | Dần dần extract sang feature | Hexagonal adapters trước |
| Startup MVP | Feature-based (đơn giản) | Standard layout |

---

## Tóm tắt: Nguyên tắc cốt lõi

```
1. DEPENDENCY RULE
   Code bên trong không biết đến code bên ngoài.
   Domain không import HTTP. Use case không import DB driver.

2. DEPEND ON ABSTRACTIONS
   High-level modules không phụ thuộc low-level modules.
   Cả hai phụ thuộc vào abstraction (interface).

3. PACKAGE BOUNDARIES
   Expose public API tối thiểu. Ẩn nội bộ.
   Golang: internal/   |   TypeScript: index.ts

4. OPEN/CLOSED PRINCIPLE
   Thêm feature = thêm code mới (handler, adapter, use case).
   Không sửa code cũ đang chạy tốt.
```
