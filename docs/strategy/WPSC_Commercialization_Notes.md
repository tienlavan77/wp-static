# WPSC — Ghi chú về hướng thương mại hoá

> Tài liệu ghi lại phần trao đổi về commercialization của WPSC để đọc lại sau.
>
> **Trạng thái:** Ý tưởng/định hướng, chưa phải quyết định business cuối cùng.

## 1. Mục tiêu ban đầu

WPSC trước hết được xây cho **sử dụng cá nhân**.

Nguyên tắc:

- Core platform hoàn chỉnh và hữu ích.
- Không over-engineer chỉ vì nghĩ tới Enterprise.
- Cá nhân có thể sử dụng WPSC miễn phí.
- Commercial layer về sau nằm phía trên Core, không làm Core phụ thuộc vào license server.

```text
WPSC Core
    ↓
Personal use trước
    ↓
Commercialization sau
```

## 2. Ba hướng sản phẩm

```text
WPSC
├── Personal / Free
├── Self-hosted Business / Enterprise
└── Managed Business
```

## 3. Personal — FREE

Ý tưởng:

> **Full Core, nhưng giới hạn quy mô thay vì cắt bỏ capability cốt lõi.**

Có thể gồm:

```text
Runtime
Build
WordPress
WooCommerce
Cart / Checkout
Forms
SEO
Cache
Backup
Restore
Health
Logs
Security Boundary
Deployment
Rollback
```

Giới hạn có thể nằm ở số Site, Operator hoặc quy mô.

Không nên biến Free thành bản demo kiểu:

```text
không Backup
không Restore
không Deployment
không WooCommerce
```

Người dùng cá nhân nên trải nghiệm được giá trị thật của WPSC.

## 4. Self-hosted Business

Khách hàng tự cài và vận hành WPSC trên infrastructure của họ.

```text
Khách hàng
    ↓
Annual License
    ↓
Tự host WPSC
```

Annual License có thể bao gồm quyền sử dụng theo thời hạn, updates, commercial capabilities và support tuỳ gói.

Giá chưa được quyết định.

## 5. Managed Business — Monthly Subscription

Đây là mô hình khác Annual License.

```text
Doanh nghiệp
    ↓
Trả phí hàng tháng
    ↓
Managed WPSC
    ↓
Platform + Infrastructure + Operations
```

Nhà cung cấp có thể chịu trách nhiệm về infrastructure, deployment, backup, restore, monitoring, updates, security và runtime operations.

Đây về bản chất là managed service / SaaS-like service.

## 6. Business

Business bán giá trị:

- Multi-user
- Team management
- RBAC
- Multi-site
- Centralized operations
- Deployment management
- Backup policy
- Monitoring
- Commercial support

```text
Agency / Business
    ├── Admin
    ├── Developer
    ├── Content Manager
    └── Operator
          ├── Site A
          ├── Site B
          └── Site C
```

## 7. Enterprise

Enterprise không chỉ là Business giá cao hơn.

Tập trung vào:

- Organization
- Advanced RBAC
- SSO / Identity integration
- Central Audit
- Organization policies
- Enterprise secret integration
- Advanced deployment policies
- Infrastructure options
- SLA
- Priority support
- Professional services

```text
Enterprise
    = Governance
    + Security
    + Scale
    + SLA
```

## 8. Annual License vs Monthly Subscription

### Annual License

```text
Khách hàng
    ↓
Mua license 1 năm
    ↓
Tự host WPSC
```

Khách hàng chịu trách nhiệm infrastructure.

### Managed Monthly

```text
Khách hàng
    ↓
Trả tiền hàng tháng
    ↓
Nhà cung cấp vận hành WPSC
```

Nhà cung cấp chịu trách nhiệm phần lớn infrastructure và operations.

## 9. License và vấn đề crack

Nếu khách hàng kiểm soát hoàn toàn server/source code thì **có thể bypass license**. Không có local mechanism nào đảm bảo chống crack 100%.

Vì vậy không nên xây business model dựa trên:

> “Không ai có thể bypass license.”

Nên bán giá trị:

```text
License
+
Updates
+
Security releases
+
Commercial extensions
+
Support
+
Deployment tooling
+
Enterprise integrations
```

Mục tiêu là tạo giá trị đủ rõ cho khách hàng hợp pháp, không phải chống crack tuyệt đối.

## 10. Nếu dùng License Server

Một hướng có thể là:

```text
License Server
      ↓
Signed License
      ↓
WPSC Instance
      ↓
Local Verification
      ↓
Periodic Validation
```

License có thể chứa:

```text
licenseId
customerId
plan
siteLimit
features
issuedAt
expiresAt
installationId
signature
```

Private signing key chỉ nằm trên server của nhà cung cấp.

Không nên kiểm tra license trên mọi request:

```text
Request
  ↓
License Server
```

Thay vào đó dùng periodic validation + local signed entitlement + grace period.

## 11. Commercial Layer không nên nằm trong Core

Nên:

```text
                    WPSC Core
                       │
             ┌─────────┴─────────┐
             │                   │
        Personal Mode       Commercial Layer
             │                   │
            Free          Business / Enterprise
```

Commercial layer có thể quản lý:

```text
Organization
Plan
Entitlement
User limits
Site limits
Feature policy
SLA
Support
```

Core tiếp tục tập trung vào:

```text
Runtime
Services
Site
Build
Deployment
Authorization
```

## 12. Free vs Paid

Nguyên tắc:

```text
FREE
    = Full Core

PAID
    = Scale
    + Organization
    + Governance
    + Support
    + Commercial Services
```

Mô hình minh hoạ:

| Capability | Personal | Business | Enterprise |
|---|:---:|:---:|:---:|
| Runtime | ✅ | ✅ | ✅ |
| Build | ✅ | ✅ | ✅ |
| WordPress | ✅ | ✅ | ✅ |
| WooCommerce | ✅ | ✅ | ✅ |
| Cart / Checkout | ✅ | ✅ | ✅ |
| Forms | ✅ | ✅ | ✅ |
| SEO | ✅ | ✅ | ✅ |
| Cache | ✅ | ✅ | ✅ |
| Backup | ✅ | ✅ | ✅ |
| Restore | ✅ | ✅ | ✅ |
| Health | ✅ | ✅ | ✅ |
| Logs | ✅ | ✅ | ✅ |
| Security Boundary | ✅ | ✅ | ✅ |
| Deployment | ✅ | ✅ | ✅ |
| Rollback | ✅ | ✅ | ✅ |
| Multi-site | giới hạn | ✅ | ✅ |
| Multi-user | — | ✅ | ✅ |
| RBAC | basic | ✅ | advanced |
| Organization | — | ✅ | ✅ |
| SSO | — | — / add-on | ✅ |
| Central Audit | — | ✅ | ✅ |
| Enterprise Policies | — | — | ✅ |
| SLA | — | optional | ✅ |

Đây là mô hình minh hoạ, chưa phải pricing matrix chính thức.

## 13. Managed WPSC là một lớp sản phẩm khác

Có thể hình dung:

```text
Personal
    → Free

Self-hosted
    → Business / Enterprise License

Managed WPSC
    → Monthly Subscription
```

Managed WPSC có thể là commercial service/infrastructure layer bên ngoài WPSC Core.

## 14. Quan hệ với Architecture hiện tại

Sprint 8–9 đã tạo nhiều foundation:

```text
Sprint 8
    ↓
Shared Services
Commerce
Customer
Forms
SEO
Cache
Performance
Extensions
    ↓
Sprint 9
    ↓
Multi-site
Operations
Backup
Restore
Health
Logs
Security
Authorization
Artifact
Deployment
Runtime Hardening
```

Đây là platform foundation. Commercial layer về sau có thể sử dụng chúng mà không cần viết lại Core.

Ví dụ:

```text
Operations Authorization
        ↓
Business RBAC
        ↓
Enterprise Organization Policies
```

hoặc:

```text
Site Registry
        ↓
Personal: giới hạn Site
Business: nhiều Site
Enterprise: organization-scale
```

## 15. Những điểm chưa quyết định

Chưa quyết định:

- Giá Personal/Business/Enterprise.
- Số Site mỗi gói.
- Số User mỗi gói.
- Giá Annual License.
- Giá Managed Monthly.
- Feature nào chính thức paywalled.
- Open-source/open-core hay không.
- License Server implementation cụ thể.
- Billing provider.
- SSO provider.
- SLA cụ thể.

Đây là các quyết định business, chưa phải architecture decision.

## 16. Cách nhớ ngắn gọn

```text
PERSONAL
Free — Full Core — giới hạn quy mô

BUSINESS
Paid — Team + Multi-site + Operations

ENTERPRISE
Paid — Governance + Security + Scale + SLA

MANAGED
Monthly — Nhà cung cấp vận hành platform
```

Architecture:

```text
WPSC Core
    ↓
không phụ thuộc license

Commercial Layer
    ↓
entitlement / organization / plan

Managed Layer
    ↓
infrastructure + operations
```

## 17. Kết luận hiện tại

**Chưa cần xây commercial system ngay.**

Ưu tiên hiện tại:

```text
Core Platform
      ↓
Stable
      ↓
Commercial Layer
      ↓
Business / Enterprise
      ↓
Managed Service
```

Mục tiêu trước mắt vẫn là xây một WPSC tốt cho chính mình. Commercial architecture chỉ cần giữ đường mở rộng sạch, không cần làm Core phức tạp từ bây giờ.
