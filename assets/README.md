# Kho hình ảnh

Mục tiêu: hình ảnh đen trắng kiểu thuỷ mặc, đúng ngữ cảnh Kinh Thánh, dùng được hợp pháp.

## Thư mục

| Thư mục | Chứa gì | Lên git? |
|---|---|---|
| `ink/` | Nét mực, vệt cọ, mây, núi xa, sóng nước (PNG nền trong suốt hoặc SVG) | Có |
| `glyphs/` | Chữ thư pháp đã vector hoá: 通, 圆满, 根, tên tầng | Có |
| `refs/` | Ảnh tham khảo, moodboard Pinterest, ảnh chụp game | Không (chỉ để xem) |

## Nguồn đề xuất

1. **Pinterest**: chỉ làm moodboard để chốt phong cách. Pinterest không cho dùng lại ảnh và không có kết nối với Claude. Lưu ảnh tham khảo vào `refs/`.
2. **Kho bảo tàng mở (CC0, dùng tự do)**:
   - The Met Open Access: tranh thuỷ mặc Trung Hoa, thư pháp.
   - Cleveland Museum of Art Open Access.
   - Smithsonian Open Access (Freer and Sackler: tranh cuộn, thư pháp).
   - Bảo tàng Cố Cung Đài Bắc (Open Data, cần ghi nguồn).
3. **Wikimedia Commons**: tranh Kinh Thánh cổ (Doré, Rembrandt khắc đồng) thuộc phạm vi công cộng; kiểm tra giấy phép từng ảnh.
4. **Tự tạo**: dùng Figma để tạo nét mực, chữ thư pháp và cảnh theo đúng câu Kinh Thánh của từng bài, rồi xuất PNG/SVG vào `ink/` và `glyphs/`.

## Quy ước

- Tên tệp: `<bài>-<mô-tả>.png`, ví dụ `4.5-banh-ruou.png`, `tier3-nui-xa.png`.
- Ghi nguồn và giấy phép mỗi ảnh vào `assets/credits.md` khi thêm.
- Ảnh nền dưới 300 KB, chuyển sang thang xám trước khi đưa vào.
