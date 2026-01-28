---
title: "5 个让你的 TypeScript 代码更优雅的技巧"
date: "2026-01-26"
excerpt: "分享几个实用的 TypeScript 技巧，让你的代码更加类型安全和易于维护。"
tags: ["TypeScript", "技巧"]
---

# TypeScript 实用技巧

TypeScript 是一门强大的语言，但要写出优雅的代码需要一些技巧。

## 1. 使用 `satisfies` 关键字

`satisfies` 可以让你在保留类型推断的同时进行类型检查：

```typescript
type Colors = "red" | "green" | "blue";

// 使用 satisfies 既能检查类型，又能保留具体值的类型
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
} satisfies Record<Colors, string | number[]>;

// palette.green 的类型是 string，而不是 string | number[]
```

## 2. 条件类型提取

使用 `infer` 关键字提取类型：

```typescript
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function greet() {
  return "Hello!";
}

type GreetReturn = GetReturnType<typeof greet>; // string
```

## 3. 模板字面量类型

创建更精确的字符串类型：

```typescript
type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;
// "onClick" | "onFocus" | "onBlur"
```

## 4. 使用 `as const` 创建只读常量

```typescript
const config = {
  api: "https://api.example.com",
  timeout: 5000,
} as const;

// config.api 的类型是 "https://api.example.com"，而不是 string
```

## 5. 利用类型守卫

自定义类型守卫让类型收窄更精确：

```typescript
interface Dog {
  bark(): void;
}

interface Cat {
  meow(): void;
}

function isDog(pet: Dog | Cat): pet is Dog {
  return (pet as Dog).bark !== undefined;
}
```

---

掌握这些技巧，你的 TypeScript 代码将更加优雅和类型安全！
