---
title: 多表连接过滤条件在 on 和 where 的区别
date: 2020-05-24
description: 
tags: [SQL, MySQL]
category: Debug记录
author: 惊羽
cover: /images/debug.jpg
---
### 前言介绍

最近项目中的小坑，记录一下。

### 数据准备

```sql
create table student
(
    sid   int primary key  not null ,
    cid   int         null,
    t_sex varchar(20) null
)
    comment '学生表';

create table t_score
(
    sid    int         null,
    course varchar(20) null,
    score  int         null
)
    comment '成绩表';

insert into test.student values
(1,'李白','男'),
(2,'杜甫','男'),
(3,'白居易','男'),
(4,'苏轼','男'),
(5,'李清照','女'),
(7,'谢道韫','女'),
(8,'郭奉孝','男');

insert into test.t_score values
(1,'语文',90),
(2,'语文',50),
(3,'语文',99),
(4,'语文',null),
(5,'语文',null),
(6,'语文',null),
(7,'语文',null),
(8,'语文',null);

```

### 内连接

- 在 on 后面

```sql
-- 内关联 条件放在 on 和 where 没有区别
-- 非空判断放在 on 和 where没有区别，成绩表有只有3个人的成绩，只有3个结果
select *
from student s
join t_score ts on s.sid = ts.sid
where ts.score is not null ;
```

![Untitled](/images/1986560106_JIUxdHebiaFhlBz.png)

- 在 where后面

```sql
select *
from student s
join t_score ts
where s.sid=ts.sid and ts.score is not null ;
```

![Untitled](/images/1806620951_tkaNXALl8FzIiYT.png)

### 外连接

- 在 on 后面

```sql
-- 外连接结果有非常大的区别
-- 写在 on 条件上,有7个结果
select *
from student s
left join t_score ts on s.sid = ts.sid  and  ts.score is not null ;

```

![Untitled](/images/1937463988_AIrX7xsPdEaqUty.png)

- 在 where 后面

```sql
-- 写在 where 条件上,只有3个结果
select *
from student s
left join t_score ts on s.sid = ts.sid
where ts.score is not null ;
```

![Untitled](/images/2074097247_u4tXn2UqxcTOp1z.png)

### 原因解析

left join 的时候全部保留左边表格的内容，并保留右边表格能匹配上条件的内容
on 后面的就是连接条件，无论写什么只会对右边起效，不影响左表内容
where 后面的条件是对全局起效，就表关联之后的结果做筛选。