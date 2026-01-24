---
title: 测试代码高亮和图片
date: 2023-10-28
description: 演示如何在博客中插入图片和代码。
tags: [代码, 图片, 演示]
author: 惊羽
---

# 图片测试

这是一张来自 Unsplash 的测试图片：

![极简风格图片](https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80)

## 本地图片

如果你有本地图片，请把它放在 `content/images/` 文件夹下，然后这样引用：

`![图片描述](/images/你的图片名.jpg)`

# 代码高亮测试

这是一个 JavaScript 示例：

```javascript
function hello() {
    console.log("Hello, World!");
    const a = 1;
    const b = 2;
    return a + b;
}
```

这是一个 CSS 示例：

```css
body {
    background-color: #f0f0f0;
    color: #333;
}
```

这是一个 Python 示例：

```python
def fib(n):
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a+b
    print()
```
