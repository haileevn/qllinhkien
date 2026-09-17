# H2T Home Inventory

Hệ thống quản lý kho linh kiện điện tử, dụng cụ, thiết bị và vật tư kỹ thuật gia đình (Private Home Inventory Management System).

Được thiết kế theo định hướng **Mobile-First**, tối ưu cho việc tìm kiếm tức thì trên điện thoại khi đang đứng trước tủ đồ, tích hợp quét mã QR / Barcode bằng camera, cây vị trí lưu trữ phân cấp không giới hạn và ghi vết lịch sử xuất nhập kho.

---

## 🌟 Tính Năng Nổi Bật

* **Tìm kiếm siêu tốc (Fast Vietnamese Search)**:
  * Tìm kiếm không dấu hoặc có dấu (ví dụ: gõ `day usb` sẽ tìm thấy ngay `Dây USB Type-C 100W Baseus 1.2m`).
  * Tìm đồng thời theo tên, mã SKU, thương hiệu, model, thẻ phân loại (tags), vị trí lưu trữ, tủ, ngăn, hộp, barcode.
* **Định vị kho phân cấp (Unlimited Nested Storage)**:
  * Cây vị trí lưu trữ đa tầng (Nhà → Phòng làm việc → Tủ linh kiện A → Ngăn 3 → Hộp A3-05).
  * Xem toàn bộ vật tư trong một vị trí và tất cả các tầng con chỉ với 1 chạm.
  * Sao chép đường dẫn vị trí 1 chạm.
* **Thêm đồ thần tốc trên điện thoại (Quick Add on Mobile)**:
  * Chụp ảnh trực tiếp từ camera điện thoại hoặc chọn từ thư viện ảnh.
  * Nhập nhanh các trường cốt lõi (Tên, Danh mục, Vị trí, Số lượng, Đơn vị).
  * Nút "Lưu & thêm tiếp" liên tục.
* **Theo dõi biến động kho (Stock Transactions & History)**:
  * Ghi nhận lịch sử giao dịch rõ ràng: `Nhập thêm (+)` , `Đã sử dụng (-)` , `Điều chỉnh (±)` , `Chuyển vị trí (→)`.
* **Cảnh báo tồn kho (Low Stock & Out of Stock)**:
  * Tự động gắn nhãn "Sắp hết" khi số lượng $\le$ mức tối thiểu và "Hết hàng" khi số lượng bằng 0.
* **Hệ thống Mã QR & Barcode**:
  * Tạo và in tem nhãn QR cho từng món đồ hoặc dán lên ngăn kéo/hộp/tủ.
  * Tích hợp camera quét trực tiếp mã QR và mã vạch sản phẩm (EAN/UPC).
* **Sao lưu & Phục hồi dữ liệu (Backup / Restore)**:
  * Xuất / Nhập tệp Excel (CSV) và bản sao lưu JSON đầy đủ.
  * Kiểm tra tính hợp lệ dữ liệu (Dry-run preview) trước khi nhập.
* **PWA (Progressive Web App)**:
  * Cài đặt lên màn hình chính iPhone / Android như ứng dụng bản địa, hỗ trợ notch và safe-area.

---

## 🛠 Công Nghệ Sử Dụng

* **Frontend & Backend**: Next.js 15+ (App Router, Server Actions / Route Handlers, TypeScript)
* **Styling**: Tailwind CSS, Lucide Icons, Modern Dark/Light Theme
* **Database & ORM**: PostgreSQL 16 & Prisma ORM
* **Authentication**: Cookie-based JWT Session (`jose`, `bcryptjs`)
* **QR & Barcode**: `qrcode`, `html5-qrcode`
* **Containerization**: Docker & Docker Compose

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển Cục Bộ

### 1. Yêu cầu hệ thống
* Node.js $\ge$ 18.x (khuyên dùng Node 20+)
* Docker & Docker Compose (cho PostgreSQL)

### 2. Cấu hình biến môi trường
Tạo tệp `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Nội dung cấu hình mẫu trong `.env`:
```env
# PostgreSQL Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=h2t_inventory
POSTGRES_PORT=5434

# URL kết nối Database
DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/h2t_inventory?schema=public"

# Mã bí mật JWT
JWT_SECRET="h2t_super_secret_jwt_key_2026_home_inventory_change_in_production"

# App
APP_PORT=3000
NEXT_PUBLIC_APP_NAME="H2T Home Inventory"
```

### 3. Khởi động cơ sở dữ liệu PostgreSQL
```bash
docker compose up -d postgres
```

### 4. Cài đặt thư viện & khởi tạo Database
```bash
# Cài đặt dependencies
npm install

# Đồng bộ schema vào PostgreSQL
npx prisma db push

# Nạp dữ liệu mẫu ban đầu (Electronics, Tools, Cables, Hardware)
npm run db:seed
```

### 5. Chạy môi trường phát triển
```bash
npm run dev
```

Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000)

**Tài khoản đăng nhập mặc định:**
* **Tên đăng nhập**: `admin`
* **Mật khẩu**: `admin123456`

---

## ☁️ Hướng Dẫn Triển Khai Lên Coolify (Domain: qllk.h2t.vn)

Ứng dụng hoàn toàn tương thích và tối ưu hóa sẵn cho Coolify qua Docker Compose hoặc Dockerfile:

### Cách 1: Triển khai dạng Docker Compose (Khuyên dùng - Có kèm sẵn PostgreSQL)
1. Trong dashboard **Coolify**, chọn **+ Create New Resource** $\rightarrow$ **Docker Compose**.
2. Chọn kho Git: `git@github.com:haileevn/qllk.h2t.vn.git` (hoặc dán nội dung file `docker-compose.yml`).
3. Trong phần **Domains / FQDN**, điền: `https://qllk.h2t.vn` (Coolify sẽ tự động cấu hình Traefik Reverse Proxy & cấp chứng chỉ SSL Let's Encrypt).
4. Thiết lập các biến môi trường (**Environment Variables**) trong Coolify:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=MatKhauDatabaseBaoMatCuaBan
   POSTGRES_DB=h2t_inventory
   DATABASE_URL=postgresql://postgres:MatKhauDatabaseBaoMatCuaBan@postgres:5432/h2t_inventory?schema=public
   JWT_SECRET=TaoChuoiNgauNhienDaiBaoMatChoJWT_2026
   NODE_ENV=production
   NEXT_PUBLIC_APP_NAME=H2T Home Inventory
   NEXT_PUBLIC_APP_URL=https://qllk.h2t.vn
   ```
5. Bấm **Deploy**. Container sẽ tự động đồng bộ cấu trúc database qua `docker-entrypoint.sh` và kích hoạt ứng dụng.
6. (Tùy chọn) Chạy seed dữ liệu mẫu trong terminal container nếu muốn:
   ```bash
   npm run db:seed
   ```

---

## 💾 Hướng Dẫn Sao Lưu & Phục Hồi Dữ Liệu

### 1. Sao lưu từ giao diện Web
1. Đăng nhập vào ứng dụng $\rightarrow$ Chọn **Cài đặt** $\rightarrow$ **Sao lưu & Phục hồi dữ liệu**.
2. Nhấn **Xuất tệp CSV (Excel)** để chỉnh sửa dạng bảng tính, hoặc **Xuất JSON Backup đầy đủ** để lưu trữ toàn bộ quan hệ và lịch sử.

### 2. Khôi phục từ giao diện Web
1. Tại trang **Sao lưu & Phục hồi dữ liệu**, chọn tệp `.csv` hoặc `.json`.
2. Nhấn **Kiểm tra tệp (Validate)** để hệ thống đọc trước và hiển thị các dòng hợp lệ / cảnh báo lỗi.
3. Nhấn **Xác nhận nhập dữ liệu**.

### 3. Sao lưu thủ công bằng lệnh PostgreSQL
```bash
# Sao lưu cơ sở dữ liệu ra tệp .sql
docker exec -t h2t-inventory-postgres pg_dump -U postgres h2t_inventory > backup_$(date +%Y%m%d).sql

# Phục hồi cơ sở dữ liệu từ tệp .sql
cat backup_20260917.sql | docker exec -i h2t-inventory-postgres psql -U postgres -d h2t_inventory
```

---

## 📱 Hướng Dẫn Cài Đặt Lên Màn Hình Chính iPhone (PWA)

1. Mở Safari trên iPhone và truy cập địa chỉ IP/domain của hệ thống (ví dụ: `http://192.168.1.100:3000`).
2. Nhấn nút **Chia sẻ (Share)** (biểu tượng hình vuông có mũi tên hướng lên ở thanh dưới trình duyệt).
3. Chọn **Thêm vào MH chính (Add to Home Screen)**.
4. Ứng dụng sẽ hiển thị biểu tượng **H2T Inventory** độc lập trên màn hình iPhone, toàn màn hình không có thanh URL của trình duyệt.

---

## 🛠 Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Vấn đề | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| Không kết nối được Database | Container Postgres chưa sẵn sàng hoặc sai port | Kiểm tra `docker compose ps`, đảm bảo port trong `.env` khớp với `docker-compose.yml`. |
| Không mở được Camera quét mã | Trình duyệt chưa được cấp quyền camera hoặc không chạy qua HTTPS | Cấp quyền Camera trong cài đặt Safari/Chrome hoặc dùng tính năng **"Tải ảnh từ máy"**. |
| Mất ảnh sau khi khởi động lại Docker | Chưa map volume cho thư mục uploads | Đảm bảo volume `uploads_data:/app/public/uploads` đã được cấu hình trong `docker-compose.yml`. |

---

## 📄 Bản quyền
Phát triển bởi H2T &bull; Private Home Inventory Management System.
