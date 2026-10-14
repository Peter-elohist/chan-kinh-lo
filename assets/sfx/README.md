# Âm thanh

Mặc định mọi âm thanh được tổng hợp bằng Web Audio trong `src/sound.js`, không cần tệp. Muốn thay bằng tệp thu sẵn (ví dụ từ Epidemic Sound), chép tệp vào thư mục này rồi ghi tên tệp vào `manifest.json`. Để trống thì dùng âm tổng hợp.

Hướng âm thanh: huyền nhiệm, thanh sạch, hữu cơ, có cảm giác năng lượng thăng hoa. Công thức ba lớp: gió nhẹ → lấp lánh pha lê → chuông ngân.

| Cue | Lúc nào | Cảm giác | Từ khoá tìm | Độ dài |
|---|---|---|---|---|
| tap | Chạm nhẹ trong giao diện | Xác nhận rất nhẹ | soft magical notification chime | < 0.6s |
| open | Mở một tầng | Khai mở nhẹ | magic spell power up shimmer (ngắn) | < 1s |
| lesson | Mở một bài | Chuông ngân | soft magical notification chime | < 1.5s |
| start | Vào thí luyện | Gõ tre | mystical wind bamboo chimes nature (cắt 2 tiếng) | < 0.6s |
| right | Trả lời đúng | Thanh lọc, tích cực | cleanse positive shimmer crystal chime | < 1s |
| wrong | Trả lời sai | Lặng, không chói | soft low breath / muted chime | < 0.8s |
| pass | Thí luyện ≥ 80 | Giác ngộ, giải phóng | mystic success chime magical reveal | 3–4s |
| full | Thí luyện 100 | Thành tựu cấp cao | angelic swell resonant chime fantasy | 8–10s |
| rank | Đột phá cảnh giới | Năng lượng dâng, chuông sâu | epic mystical energy rise deep chime | 4–5s |
| levelup | Nâng cấp kỹ năng (Cành) | Hội tụ rồi khai mở | ethereal awakening magical swell | 2–3s |
| fail | Chưa thông quan | Lắng xuống | soft descending mystical wind | 2s |

Tiêu chí chấm mỗi âm: Clean · Mystical · Organic · Progression · UI-friendly.

Bản quyền: chỉ đưa vào repo những tệp mà gói đăng ký của bạn cho phép dùng trong website hoặc ứng dụng. Ghi nguồn từng tệp vào `credits.md`.
