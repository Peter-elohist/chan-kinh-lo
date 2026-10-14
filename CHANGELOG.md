# Nhật ký phiên bản

## v0.3.0 · 2026-10-14

- Trang đầu thiết kế lại: cảnh giới hiện tại và khoảng cách tới cảnh giới kế tiếp, ba chỉ số, thẻ "Tiếp tục tu luyện" dẫn thẳng tới bài nên học, thang cảnh giới có ý nghĩa từng bậc, núi xa trên mặt đất. MacBook: hai cột, cây cố định bên phải.
- Chữ: thang cỡ chữ co giãn theo màn hình (iPhone Air 420pt ↔ MacBook Air 1470px). Trang Tầng: số bài lớn kiểu chương sách, tiêu đề Noto Serif Display, điểm và trạng thái căn phải, các bài còn thiếu gộp một dòng. Trang Bài: hai cột trên máy tính, câu Kinh Thánh và nút thí luyện cố định bên phải; ý chính đánh số 01, 02.
- Âm thanh thí luyện: mỗi câu trả lời là một nốt của giai điệu (8 câu "Ngọc Trúc", 10 câu "Vân Thuỷ"), sai thì cùng nốt nhưng trầm và mờ, câu cuối luôn về chủ âm Rê.
- Linh khí 40 Hz: nền drone ngũ cung thở ở 40 Hz, cặp binaural 200/240 Hz, suối nhỏ và chuông ngọc thưa.

## v0.2.0 · 2026-10-14

- Âm thanh huyền nhiệm: tổng hợp bằng Web Audio theo ba lớp gió → lấp lánh pha lê → chuông ngân; mỗi trạng thái một âm riêng (chạm, mở tầng, đúng, sai, thông quan, viên mãn, đột phá, nâng cấp, chưa đạt). Thêm "Linh khí" (gió và chuông tre nền, tắt mặc định). Có thể thay bằng tệp thu sẵn qua `assets/sfx/manifest.json`.
- Phông chữ tiếng Việt: Noto Serif Display cho tiêu đề, Noto Serif cho câu văn, Be Vietnam Pro cho giao diện; chữ thư pháp chỉ dùng cho chữ Hán.
- Chạm vào ấn tầng: bỏ khung chữ nhật (viền focus), thay bằng ấn lún nhẹ, gợn mực và chuyển cảnh dịu.
- Viên mãn: cột sáng hội tụ rồi bung ra, thẻ tre có chữ mực bay theo chiều sâu (gần rõ, xa mờ, lật mặt), câu Kinh Thánh và chú thích xếp dọc không còn chồng chữ, kết thúc mờ dần.
- Hiệu năng: mọi ánh sáng, sương, cột chữ, thẻ tre vẽ sẵn thành sprite; nền tạm dừng khi có hoạt cảnh. Đo được 60 khung hình/giây ổn định.

## v0.1.0 · 2026-10-14

Bản đầu tiên đưa lên GitHub.

- Gốc Lẽ Thật: 15 bài EA trong 5 tầng, 54 rễ phụ, 120 câu thí luyện.
- Cây Gốc: rễ vẽ dần khi mở, dòng sáng chạy dọc rễ (nhanh hơn khi tầng thông quan), ấn tầng có vòng chữ Kinh Thánh xoay.
- Câu then chốt 和合本 cho từng bài, dọc kiểu thư pháp, kèm bản Việt 1925.
- Khoảnh khắc thông quan (≥80): nét bút 通, vòng sóng mực, câu Kinh Thánh. Viên mãn (100): cổng sáng, cuộn chữ xoắn, thẻ tre bay, ấn 圆满, câu Kinh Thánh hiện từng chữ.
- Lưu điểm 3 lớp: Supabase (đăng nhập email) → bản xem trước Claude → trình duyệt.
- Kho dữ liệu `data/`, script làm mới từ Obsidian, lược đồ Supabase, cấu hình Vercel.
