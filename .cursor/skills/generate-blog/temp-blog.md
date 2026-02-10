在 Web 端做一个翻页式电子书阅读器，最头疼的不是翻页动画本身，而是当你不得不「销毁再重建」整个翻页组件时，如何让用户完全无感知。

本文记录了我们在 Ink & Code 阅读器中解决「翻几页就弹 loading」问题的完整过程——从定位问题到设计 Soft Remount 方案。

## 场景：滑动窗口 + FlipBook

我们的阅读器基于 `react-pageflip` 实现翻页效果。一本书可能有上千页，全部塞进 DOM 会卡死浏览器，所以采用了**滑动窗口**策略：

- 只给 FlipBook 传当前位置附近的 60 页（桌面端）
- 当用户翻到离窗口边界还剩 6 页时，重新计算窗口、重建 FlipBook

问题来了：`react-pageflip` 的 children 在挂载后是固定的，无法动态增删页面。要更新窗口，只能通过改变 `key` 强制 React 销毁旧组件、挂载新组件——即 **remount**。

## 难点：Remount 必然导致闪烁？

原来的 `doRemount` 函数长这样：

```typescript
const doRemount = useCallback((globalPage: number) => {
  const win = calcPageWindow(globalPage, totalPages, windowSize);
  setWindowStart(win.start);
  setFlipBookKey(`${counter}_${totalPages}_${win.start}`);
  setShowBook(false);   // ← 隐藏书页，显示 loading 遮罩
  // ...
}, [...]);
```

**每次 remount 都会**：
1. `setShowBook(false)` → 书页消失，loading 遮罩出现
2. React 销毁旧 FlipBook、挂载新 FlipBook
3. 等 300ms 确保排版完成
4. `setShowBook(true)` → loading 消失，书页淡入

用户每翻约 24 页就会看到一次 loading 闪烁，体验很差。

更糟的是，还有**第二个触发源**——章节预取。用户翻页时，后台会预取相邻章节。新章节到达后，分页引擎从「估算」变为「精确测量」，导致 `chapterPageRanges` 变化。由此引发的连锁反应是：

```
新章节加载 → 分页重算 → startPage 微调
→ isProgressRestore 误判 → 触发 doRemount → 又一次 loading
```

原来的 `isProgressRestore` 判断逻辑：

```typescript
const isProgressRestore =
  prevStartPageRef.current >= 0 &&
  startPage !== prevStartPageRef.current &&
  startPage > 0;
```

它跟踪的是 `startPage` 的变化。但 `startPage` 是个**派生值**——依赖 `charOffsetToPage(savedCharOffset)`，而 `charOffsetToPage` 又依赖 `pagination.chapterPageRanges`。新章节加载改变了 ranges，startPage 跟着变，但用户的阅读位置根本没变！这是一个**误触发**。

## 解决方案：Soft Remount

核心思路：**区分「必须让用户等」和「可以静默完成」的 remount**。

| 场景 | 类型 | 需要 loading？ |
|------|------|---------------|
| 首次打开书籍 | Hard | 是（排版未完成） |
| 设置变更（字号/行距） | Hard | 是（需要重新排版） |
| 窗口滑动 | **Soft** | **否**（内容相同，只是窗口平移） |
| SWR 同步新进度 | **Soft** | **否**（跳转应无感知） |
| 章节预取导致分页微调 | **无需 remount** | **否** |

### 实现 1：给 doRemount 增加 soft 模式

```typescript
const doRemount = useCallback((globalPage: number, soft = false) => {
  softRemountRef.current = soft;
  const win = calcPageWindow(globalPage, totalPages, windowSize);
  setWindowStart(win.start);
  setFlipStartPage(globalPage);  // 记录目标页码

  remountCountRef.current++;
  setFlipBookKey(`${remountCountRef.current}_...`);

  // 关键：soft 模式不隐藏书页
  if (!soft) setShowBook(false);
}, [...]);
```

Soft 模式下，旧 FlipBook 销毁、新 FlipBook 挂载的过程中，外层容器保持 `opacity: 1`。由于新旧 FlipBook 渲染的是同一页内容，视觉上只有 1-2 帧的微小闪烁，肉眼几乎不可察觉。

### 实现 2：缩短 soft 模式的挂载等待

Hard 模式需要 300ms 等 FlipBook 完成首次排版；soft 模式下内容已在内存中，30ms 就够了：

```typescript
useEffect(() => {
  if (!flipBookKey) return;
  const isSoft = softRemountRef.current;
  const delay = isSoft ? 30 : 300;

  const timer = setTimeout(() => {
    const localPage = currentPageRef.current - windowStart;
    if (localPage > 0) {
      flipBookRef.current?.pageFlip()?.turnToPage(localPage);
    }
    if (!isSoft) {
      setShowBook(true);
      onReadyRef.current?.();
    }
  }, delay);

  return () => clearTimeout(timer);
}, [flipBookKey, ...]);
```

### 实现 3：修正 FlipBook 的起始页

原来 FlipBook 的 `startPage` 用的是初始进度页（`startPage`，即打开书时的页码）。窗口滑动后，用户已经翻到了别的位置，FlipBook 却从初始页开始渲染，300ms 后才 `turnToPage` 修正——soft 模式下这个错位会被看到。

解决方法：引入 `flipStartPage` state，在 `doRemount` 中设为当前页码：

```typescript
const [flipStartPage, setFlipStartPage] = useState(0);

// doRemount 中：
setFlipStartPage(globalPage);

// JSX 中：
const localStartPage = flipStartPage - windowStart;
<HTMLFlipBook startPage={localStartPage} ... />
```

### 实现 4：根治分页微调的误触发

把 `isProgressRestore` 的判断从「startPage 变了」改为「initialLocation prop 变了」：

```typescript
const prevInitialLocationRef = useRef<string | undefined>(undefined);

// 仅当 prop 实际变化时才视为进度恢复
const isProgressRestore =
  initializedRef.current &&
  initialLocation !== prevInitialLocationRef.current &&
  startPage > 0;
```

`initialLocation` 是从 SWR 传下来的 prop，只有后端数据真正变化时才会改变。而 `startPage` 是个派生值，会被分页微调等无关因素影响。这一改让章节预取完全变成了后台静默操作——分页数据更新了，但不触发任何 remount。

## 效果对比

| 场景 | 修改前 | 修改后 |
|------|-------|-------|
| 翻页触发窗口滑动 | loading 遮罩 ~300ms | 无感知（1-2 帧切换） |
| 章节预取完成 | 可能触发 loading | 完全静默 |
| 多设备同步进度 | loading 遮罩 | 无感知跳转 |

## 总结

在 Web 端做类原生的翻页阅读体验，最大的挑战不是动画效果，而是**状态管理的精细度**。一个粗暴的 `setShowBook(false)` 看似安全，却让每次窗口调整都变成了用户可感知的中断。

Soft Remount 的核心思想很简单：**不是所有重建都需要让用户知道**。区分场景，对「内容不变，只是容器重建」的操作保持视觉连续性，就能把技术实现的复杂性完全隐藏在流畅的阅读体验之下。

这个模式不仅适用于翻页阅读器，任何需要「销毁重建但内容不变」的虚拟化场景（如长列表的 window shifting、地图瓦片切换）都可以借鉴。
