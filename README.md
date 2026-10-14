# Chân Kinh Lộ

Webapp tự đánh giá cấp độ đời thực theo phong cách võ hiệp đen trắng. Bản này có **Gốc Lẽ Thật**: 5 tầng bài EA, rễ phụ từ các ghi chú trong Brain, thí luyện 8 câu cho mỗi bài và thang cảnh giới Kim Dung.

## Cấu trúc

```
index.html              trang chính (tĩnh, không cần build)
src/
  config.js             URL và anon key của Supabase (để trống = lưu trên trình duyệt)
  styles.css            giao diện, hiệu ứng rễ, ấn tầng, câu Kinh Thánh
  fx.js                 nền mực, hạt sáng, khoảnh khắc thông quan / viên mãn
  store.js              lưu điểm: Supabase → artifact db → localStorage
  app.js                cây Gốc, tầng, bài, rễ phụ, thí luyện
data/                   kho dữ liệu (git là nguồn gốc)
  goc/                  tiers, lessons, rootlets, questions
  bible/keyverses.json  câu then chốt 和合本 + bản Việt 1925
  canh/skills.json      Cành công sở + Phát triển kinh doanh (chưa dựng giao diện)
  sources.md            nguồn gốc và bản quyền dữ liệu
assets/                 kho hình ảnh (xem assets/README.md)
supabase/migrations/    lược đồ cơ sở dữ liệu
scripts/
  build_goc.py          làm mới data/goc từ vault Obsidian
  bundle_artifact.py    gộp thành 1 file HTML để xem trước trong Claude
```

## Chạy thử trên máy

```
python3 -m http.server 8000
# mở http://localhost:8000
```

## Cập nhật nội dung từ Obsidian

```
python3 scripts/build_goc.py ~/Documents/Brain/"10 Lẽ Thật"
```

Script giữ nguyên phần viết tay (rễ phụ thuộc bài nào, câu thí luyện, câu Kinh Thánh) và liệt kê ghi chú mới chưa được gắn.

## Supabase (lưu điểm)

1. Tạo project trên supabase.com.
2. SQL Editor → chạy `supabase/migrations/0001_init.sql`.
3. Authentication → URL Configuration: thêm domain Vercel vào Site URL và Redirect URLs.
4. Project Settings → API: chép Project URL và anon key vào `src/config.js`.

Bảng `attempts` bật Row Level Security: mỗi người chỉ đọc và thêm điểm của chính mình. Đăng nhập bằng link gửi qua email.

## Vercel (đưa lên web)

Vercel → Add New Project → Import repo GitHub này → Framework: Other → Deploy. Không cần lệnh build. Mỗi lần push lên `main` Vercel tự cập nhật.

## Phiên bản và khôi phục

Mỗi thay đổi lớn được gắn tag `vX.Y.Z` và ghi trong `CHANGELOG.md`.

```
git tag                                  # xem các phiên bản
git checkout v0.1.0                      # xem lại một bản cũ
git revert <commit>                      # huỷ một thay đổi, giữ lịch sử
git reset --hard v0.1.0 && git push -f   # quay hẳn về bản cũ (cẩn thận: xoá các commit sau)
```

Trên Vercel cũng có thể vào Deployments → chọn bản cũ → Promote to Production để khôi phục tức thì.
