# WPSC Account / User Flow Backlog

## Muc tieu

Hoan thien luong tai khoan khach hang cho website tinh nhung van ket noi an toan voi WordPress/WooCommerce that thong qua WPSC runtime va plugin API phia WordPress.

## Hien trang da lam

1. `/account`
   - Dang nhap bang tai khoan khach hang WordPress.
   - Runtime giu session cookie `wpsc_session`.
   - Frontend khong giu Woo key/secret, khong doc truc tiep du lieu nhay cam.
   - Header doi trang thai dang nhap/dang xuat theo session.

2. Don hang
   - Tab Don hang trong account chia 2 cot.
   - Cot trai liet ke don hang, phan trang 10 don/trang.
   - Cot phai hien chi tiet don hang khi click.
   - San pham trong don hang uu tien link ve route tinh `/slug` neu lay duoc slug tu Woo.

3. Dia chi
   - Lay dia chi billing/shipping tu Woo customer.
   - Cho cap nhat dia chi qua runtime server-side.
   - Da co thong bao khi luu thanh cong/that bai.

4. Plugin WordPress hien co
   - `wpsc-auth-bridge`
   - Dang dung de xac thuc login khach hang qua endpoint rieng.

## Ghi nhan de lam sau: Mail/Auth mo rong

Phan nay tam thoi chua code tiep. Se quay lai sau khi account/order flow on dinh hon.

1. Gui mail that
   - Can plugin API rieng hoac mo rong `wpsc-auth-bridge`.
   - Mail provider du kien: Zoho.
   - Cau hinh Zoho SMTP/API phai nam o server/WordPress, khong expose ra frontend.
   - Can co trang thai gui thanh cong/that bai ro rang cho frontend.

2. Quen mat khau
   - Frontend goi WPSC runtime.
   - Runtime goi WordPress plugin API.
   - Plugin tao reset token/link theo co che WordPress.
   - Plugin gui email reset password qua Zoho.
   - Frontend chi hien thong bao an toan: neu email ton tai thi he thong se gui huong dan.

3. Dang ky tai khoan
   - Frontend submit form dang ky qua WPSC runtime.
   - Runtime goi WordPress plugin API.
   - Plugin tao WordPress/Woo customer.
   - Tuy chon: yeu cau xac nhan email truoc khi cho dang nhap.
   - Gui mail chao mung/xac nhan qua Zoho.

4. Xac nhan email
   - Plugin tao verification token co thoi han.
   - Gui link xac nhan qua Zoho.
   - Endpoint xac nhan email cap nhat user meta trong WordPress.
   - Account UI hien trang thai da/chua xac nhan email neu can.

5. Email giao dich
   - Mail dang ky thanh cong.
   - Mail xac nhan email.
   - Mail quen mat khau.
   - Mail thong bao don hang neu sau nay muon runtime chu dong gui them.

## Huong kien truc plugin Zoho Mail API

Plugin nen co cac lop/chuc nang rieng:

1. `AuthController`
   - Login.
   - Register.
   - Lost password.
   - Verify email.

2. `MailService`
   - Adapter gui mail qua Zoho SMTP hoac Zoho Mail API.
   - Template HTML/text.
   - Log loi gui mail o WordPress admin/debug log.

3. `TokenService`
   - Tao token quen mat khau/xac nhan email.
   - Hash token truoc khi luu user meta/transient.
   - Dat thoi han token.

4. `Security`
   - Secret header giua WPSC runtime va WordPress plugin.
   - Rate limit theo IP/email/action.
   - Response khong tiet lo email/user co ton tai hay khong.
   - Khong expose Zoho credential ra browser.

5. `AdminSettings`
   - Cau hinh Zoho SMTP/API key.
   - From name/from email.
   - Test send mail.
   - Bat/tat email verification.

## Nguyen tac

- Khach truy cap binh thuong khong thay UI admin/builder.
- User flow phuc vu khach mua hang, khac voi `/admin` builder.
- Frontend chi goi WPSC runtime `/api/...`.
- Runtime dung quyen server-side de noi WordPress/WooCommerce.
- WordPress plugin chi chap nhan request co secret hop le tu runtime.
- Route van giu nguyen chuan `domain/slug`.

## Thu tu de lam tiep khi quay lai user/auth

1. Hoan thien account UI hien co.
2. Chot API contract cho register/lost-password/verify-email.
3. Viet plugin Zoho mail service.
4. Them runtime endpoint proxy tu WPSC sang plugin.
5. Noi frontend register/lost-password/verify-email.
6. Test voi Zoho sandbox/tai khoan that.
7. Viet huong dan cai dat plugin va bien moi truong.
