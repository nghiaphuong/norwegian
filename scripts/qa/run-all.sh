#!/usr/bin/env bash
# Chạy toàn bộ kiểm thử trên các trình duyệt có trên máy (app phải đang chạy ở http://localhost:3000 với CSDL cục bộ).
# Lưu ý: API giới hạn 20 lần đăng nhập / 15 phút; khởi động lại app nếu chạy nhiều lượt liên tiếp.
cd "$(dirname "$0")"
URL=${1:-http://localhost:3000/}
for b in chrome edge firefox opera; do
  node drive.js $b "$URL" suite.js 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.browser,'desktop: pass',r.passed,'fail',r.failed,r.error||'');(r.results||[]).filter(t=>!t.ok).forEach(t=>console.log('  FAIL',t.name,t.fail||'',JSON.stringify(t.jsErrors||[])))})"
done
for b in chrome edge firefox; do
  node drive.js $b "$URL" suite.js --mobile 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.browser,'mobile: pass',r.passed,'fail',r.failed,r.error||'');(r.results||[]).filter(t=>!t.ok).forEach(t=>console.log('  FAIL',t.name,t.fail||''))})"
done
