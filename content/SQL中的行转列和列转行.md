---
title: SQL中的行转列和列转行
date: 2021-06-22
description: 
tags: [SQL, MySQL]
category: 日常工作
author: 惊羽
cover: /images/SQL.jpg
---
### MySQL 的行转列

```sql
case when + group by + max/sum 函数
```

### MySQL 的列转行

```sql
select 指定语句 + union 拼接即可

union 去重
union all 不去重
FLink 中 union 不去重，相当于 SQL中的 union all
```

### Hive 行转列

```sql
# 基本思路：列拼接输出

# 涉及函数

concat(str1,str2,...) # 字段或字符串拼接

concat_ws(sep, str1,str2) # 以分隔符拼接每个字符串

collect_set(col) #将某字段的值进行去重汇总，产生array类型字段

# 代码实现

select collect_set( concat_ws(':',s_id,s_name,s_sex) ) from student;
```

### Hive 列转行

```sql
# 涉及函数

# explode函数
# explode(col) 将hive一列中复杂的array或者map结构拆分成多行

# lateral view 侧视图
# 用于和split, explode 等 UDTF 一起使用，它能够将一列数据拆成多行数据，在此基础上可以对拆分后的数据进行聚合。

# 代码实现

select deptno,name from emp lateral view explode(names) tmp_tb as name;

```

### 参考资料

mysql 行转列和列转行 

[https://www.jianshu.com/p/0e6113241979](https://www.jianshu.com/p/0e6113241979) 

hive 行转列和列转行

[https://www.jianshu.com/p/26d85daef92c](https://www.jianshu.com/p/26d85daef92c) 

Hive笔记之collect_list/collect_set（列转行）

[https://www.cnblogs.com/cc11001100/p/9043946.html](https://www.cnblogs.com/cc11001100/p/9043946.html)