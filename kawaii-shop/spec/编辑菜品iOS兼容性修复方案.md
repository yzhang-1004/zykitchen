# 编辑菜品弹窗 iOS 兼容性修复方案

## 一、问题分析

检查 `manage.wxml` + `manage.wxss` 后发现以下 iOS 不兼容问题：

### 问题1：弹窗高度溢出（最可能的问题）
```css
.modal-content {
  max-height: 85vh;  /* ❌ iOS Safari 对 vh 支持有 bug */
}
```
- iOS 的 `vh` 包含了浏览器地址栏高度，实际可用区域比 `85vh` 小
- 弹窗底部按钮可能被遮挡，无法点击"保存/添加"

### 问题2：scroll-view 未设置固定高度
```css
.modal-body {
  flex: 1;          /* ❌ iOS 上 flex:1 + overflow 不生效 */
  overflow-y: auto; /* ❌ iOS 需要 -webkit-overflow-scrolling */
}
```
- iOS 上 `flex: 1` 配合 `overflow` 经常不生效
- 缺少 `-webkit-overflow-scrolling: touch` 导致滚动不流畅

### 问题3：图片上传区域固定宽度
```css
.image-preview { width: 200rpx; height: 200rpx; }
.upload-btn { width: 200rpx; height: 200rpx; }
```
- 在 iPhone SE 等小屏上可能一行放不下3个
- 没有用百分比适配

### 问题4：textarea auto-height 在 iOS 上不稳定
```html
<textarea auto-height />  /* ❌ iOS 上高度计算不准 */
```

### 问题5：弹窗底部没有安全区适配
- iPhone X 及以上有底部 Home Indicator，弹窗底部按钮可能被遮挡

---

## 二、修复方案

### 1. 弹窗高度：vh → 百分比 + safe-area
```css
.modal-content {
  max-height: 85%;          /* 改用百分比 */
  padding-bottom: env(safe-area-inset-bottom); /* 安全区 */
}
```

### 2. modal-body：设置明确高度 + iOS滚动优化
```css
.modal-body {
  flex: 1;
  min-height: 0;            /* 关键！让 flex 子项可以缩小 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 流畅滚动 */
}
```

### 3. 图片上传区域：用 calc 适配
```css
.image-preview {
  width: calc((100% - 40rpx) / 3);  /* 3列减去2个gap */
  height: calc((100% - 40rpx) / 3);
  aspect-ratio: 1;
}
.upload-btn {
  width: calc((100% - 40rpx) / 3);
  aspect-ratio: 1;
  height: auto;
}
```

### 4. textarea：去掉 auto-height，设置固定最小高度
```css
.form-textarea {
  min-height: 160rpx;
  max-height: 400rpx;
}
```

### 5. 弹窗底部安全区
```css
.modal-footer {
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}
```

---

## 三、修改文件

| 文件 | 修改内容 |
|------|---------|
| `manage.wxss` | 修复弹窗高度、滚动、图片区域、安全区 |

---

## 四、确认

确认后修改代码。
