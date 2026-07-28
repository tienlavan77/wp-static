# WPSC Architecture v2
## Revision 01

Status: Required

---

# Affected Section

Part 1 – Vision

---

# Replace

Current Goal

↓

Framework tập trung vào Build Engine.

---

# With

## Vision

WPSC (WP Static Platform) là một Workspace Platform dùng để tạo và quản lý nhiều Static Website độc lập trên cùng một Framework.

Framework chỉ cung cấp hạ tầng dùng chung.

Mỗi Site mới là một Runtime độc lập.

Sau khi tạo Site Skeleton, người dùng phải có khả năng:

- trỏ Domain;
- truy cập bằng Browser;
- chạy Setup Wizard;
- hoàn thành cài đặt;
- kết nối Source;
- Build Website;
- vận hành Website độc lập.

Build Engine chỉ là một thành phần của toàn bộ Site Runtime.

---

# Reason

Architecture phải được thiết kế theo Site Lifecycle thay vì Build Lifecycle.