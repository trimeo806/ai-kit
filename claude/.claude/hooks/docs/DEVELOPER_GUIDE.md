# 📘 tri_ai_kit Hooks - Developer Guide

Mục đích của tài liệu này là giải thích chi tiết kiến trúc, chức năng và cách chỉnh sửa các file bên trong thư mục `@[.claude/hooks]`. Giúp đội ngũ lập trình viên có thể hiểu rõ và tùy biến (customize) theo nhu cầu.

---

## 🏗 Kiến trúc tổng quan (Architecture)

Hooks trong Claude Code không phải là AI Agents hay Skills (không dùng Prompt). Chúng là các **Node.js Scripts (`.cjs`) chạy ngầm ở tầng hệ thống (CLI level)**. 

Mỗi khi hệ thống nhận diện một sự kiện vòng đời (Lifecycle Event) như khi bạn mở Chat, khi AI chuẩn bị chạy Tool (Bash), hoặc khi bạn tắt ứng dụng... hệ thống sẽ kích hoạt một hook tương ứng.

Cấu hình quản lý lúc nào kích hoạt hook nào nằm trọn trong file `@[.claude/settings.json]`.

Thư mục hooks được chia làm 2 phần tĩnh cơ bản:
- `*.cjs`: Các script entrypoint được gọi trực tiếp bởi Claude Code.
- `lib/*.cjs`: Các module code (Shared Logic) chứa lõi xử lý, được tách biệt độc lập để dễ Unit Test và tái sử dụng.

---

## 📂 Danh sách các Hooks và Chi Tiết

### 1. Nhóm Khởi tạo & Cấp Ngữ Cảnh (Context Injection)

Nhóm này bơm dữ liệu ngữ cảnh vào Session, giúp AI lấy được dữ liệu cấu hình dự án mà không tốn Tokens đi quét bằng lệnh Bash.

- **`session-init.cjs`** (Sự kiện: `SessionStart`)
  - **Tác dụng:** Chạy một lần duy nhất khi mở Terminal/Chat. Nó gọi module `lib/project-detector.cjs` để scan xem project đang dùng React, Go hay Node.js; branch git hiện tại là gì. Sinh ra các biến môi trường (`tri-ai-kit_ACTIVE_PLAN`, `tri-ai-kit_PROJECT_TYPE`, v.v) lưu xuống bộ nhớ tạm.
  - **Cách chỉnh sửa:** Sửa logic nhận diện project stack trong `lib/project-detector.cjs`. Chỉnh sửa các ENV cần bơm lưu ý add prefix `tri-ai-kit_` để chuẩn form.

- **`context-reminder.cjs`** (Sự kiện: `UserPromptSubmit`)
  - **Tác dụng:** Dựa trên các ENV mà `session-init.cjs` tạo ra, script này tiêm (inject) Plan hiện tại và Rules ngắn gọn vào cuối mỗi câu prompt của người dùng.
  - **Cách chỉnh sửa:** Logic ghép nối text nằm ở `lib/context-builder.cjs`.

### 2. Nhóm Subagent (Orchestration)

Kĩ thuật `subagent-driven-development` của `ai-kit` chia việc cho các AI con (Subagent).

- **`subagent-init.cjs`** (Sự kiện: `SubagentStart`)
  - **Tác dụng:** Khi một AI Subagent được bung ra, hook này bơm nhanh ID của agent (`backend-developer`, `frontend-architect`), kèm Path làm việc và CWD để hướng dẫn con Subagent đó. Nó ép context thành size rất nhỏ (~200 tokens) để tiết kiệm phí API.
  
- **`subagent-stop-reminder.cjs`** (Sự kiện: `SubagentStop`)
  - **Tác dụng:** Đóng gói kết quả và báo cáo ranh giới vòng đời khi tiến trình của subagent kết thúc.

### 3. Nhóm Ràng buộc & Bảo vệ hệ thống (Blockers / PreToolUse)

Nhóm này can thiệp và bẻ gãy hành vi (Execution) của LLM nếu phát hiện rủi ro.

- **`scout-block.cjs`**
  - **Tác dụng:** Quét nội dung LLM gõ vào `Bash` hoặc `Grep`. Nếu thấy có chĩa vào các thư mục rác kỵ binh như `node_modules`, `dist`, `.git` (danh sách lấy từ file `.claude/.tri-ignore`), nó sẽ trả về mã `Exit Code 2 (Blocekd)` để huỷ lệnh *trước khi lệnh thực sự chạy trên máy tính*. Vẫn ngoại lệ cho phép chạy các lệnh Build (npm run build).
  - **Cách chỉnh sửa:** Không nên sửa file hook này. Thay vào đó, thêm rules block vào file `.claude/.tri-ignore`.

- **`privacy-block.cjs`**
  - **Tác dụng:** Tránh lộ lọt mã token nhạy cảm (secrets/keys). Nếu LLM dùng tool định đọc các file `.env` hoặc các file chứa cấu hình auth, hook khóa lại. Yêu cầu LLM phải dùng `AskUserQuestion` hỏi ý kiến người dùng. Nếu người dùng **Approve**, sẽ nhả pass.
  - **Cách chỉnh sửa:** Chỉnh danh sách patterns nhạy cảm tại mảng cấu hình trong `lib/privacy-checker.cjs`.

- **`build-gate-hook.cjs`**
  - **Tác dụng:** Ngăn chặn AI commit mã lỗi lên GitHub. Nó chặn các tool có lệnh `git commit`. Nếu có lệnh này, hook này sẽ móc nối tới `lib/build-gate.cjs` chạy compiler (TS, Go compiler) ngầm định. Nếu Build Pass thì cho Commit, nếu Build Fail thì vứt mã lỗi về mặt AI và bắt sửa lại.

### 4. Nhóm Tổng hợp & Phân tích (Analytics / Stop)

Chạy ngầm khi bạn nhập `/compact` hoặc tắt terminal (`Ctrl+C`). Giúp tối ưu quá trình phát triển bền vững.

- **`session-metrics.cjs`**
  - **Tác dụng:** Đo đạc thời lượng làm việc của AI (Duration_ms), số lượng file thay đổi (`git diff --stat`), và lưu vào file append-only `.kit-data/improvements/sessions.jsonl`. Thu thập Big Data cho project.
  
- **`lesson-capture.cjs`**
  - **Tác dụng:** Trích tinh hoa của đợt làm việc thành "Bài Học Mới" và lưu vào file improvement để LLM học lại từ sai sót.

- **`notifications/notify.cjs`**
  - **Tác dụng:** Tự bắn tin nhắn report qua Slack / Discord / Telegram khi session tắt, dùng cho các team đông người giám sát bot.

---

## 🛠 Cách Debug và Phát triển

Vì chạy âm thầm (headlesjs) nên rất khó console.log ra trình duyệt. 
1. **Log Crash:** Tất cả lỗi sập của hooks đều được Try-Catch cứng và đẩy log dạng append vào `.claude/hooks/.logs/hook-log.jsonl`. Để xem chi tiết lỗi bạn đọc file này: 
   ```bash
   cat .claude/hooks/.logs/hook-log.jsonl
   ```
2. **Fail-Open Design:** Do ai-kit yêu cầu triết lý "Không bao giờ được chết app vì lỗi vặt của hook" (Fail-Open), nên toàn bộ script đều bao bọc bởi `try/catch`. Nếu bất kỳ dòng code JS nào chết, nó sẽ log ra file và **Exit Code 0** (Cho phép hệ thống trôi bình thường, tạm vô hiệu hóa hook chứ không khóa đứng luồng).
3. **Mô phỏng Input:** Để test thử 1 file cjs xử lý PreToolUse, bạn có thể truyền pipe một string JSON giả lập cho hook như sau:
   ```bash
   echo '{"tool_input":{"command":"ls node_modules"}}' | node .claude/hooks/scout-block.cjs
   ```
